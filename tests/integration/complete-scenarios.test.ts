// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,B,asUser,createDatabase,verifyFixtureAction} from './database';
let db:PGlite;
afterEach(async()=>{await db?.close();});
async function rpc(name:string,args:unknown[]=[]){return (await db.query<Record<string,Record<string,unknown>>>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args)).rows[0][name];}
async function setup(){db=await createDatabase();await asUser(db,A);await rpc('sim_initialize');await rpc('bank_scenario_initialize');return (await db.query<{id:string;balance_minor:number}>("select id,balance_minor from public.sim_accounts where currency='CNY' order by label")).rows;}
async function execute(payload:Record<string,string>){const a=await rpc('sim_prepare',[payload]);if((await rpc('bank_action_policy',[a.id])).tier==='Red')await verifyFixtureAction(db,String(a.id));return rpc('sim_execute',[a.id,true]);}
async function tick(){await db.exec('reset role');const r=await db.query('select private.bank_jobs_tick()');await db.exec('set role authenticated');return r;}
it('sends to verified fictional beneficiaries, verifies results and replays once',async()=>{
 const [source]=await setup();const b=(await db.query<{id:string}>('select id from public.bank_demo_beneficiaries order by name')).rows[0];
 const a=await rpc('sim_prepare',[{type:'transfer',sourceId:source.id,beneficiaryId:b.id,amountMinor:'1000'}]);
 expect((await rpc('sim_execute',[a.id,true]))).toMatchObject({status:'executed',verified:true});
 expect((await rpc('sim_execute',[a.id,true]))).toMatchObject({status:'executed'});
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(1);
 await asUser(db,B);await expect(rpc('bank_action_policy',[a.id])).rejects.toThrow('ACTION_NOT_FOUND');
});
it('issues a virtual card and gates loss/restoration with action-bound MFA',async()=>{
 await setup();const r=await execute({type:'card',mode:'create',label:'Travel demo',limitMinor:'30000'});expect(r.status).toBe('executed');
 const card=(await db.query<{id:string}>("select id from public.sim_cards where label='Travel demo'")).rows[0];
 const a=await rpc('sim_prepare',[{type:'card',cardId:card.id,mode:'lost'}]);expect((await rpc('bank_action_policy',[a.id])).tier).toBe('Red');
 expect((await rpc('sim_execute',[a.id,true])).code).toBe('ACTION_VERIFICATION_REQUIRED');
 await verifyFixtureAction(db,String(a.id));expect((await rpc('sim_execute',[a.id,true])).status).toBe('executed');
 expect((await db.query<{lost:boolean;frozen:boolean}>('select lost,frozen from public.sim_cards where id=$1',[card.id])).rows[0]).toEqual({lost:true,frozen:true});
 const unfreeze=await execute({type:'card',mode:'unfreeze',cardId:card.id});expect(unfreeze).toMatchObject({status:'denied',code:'CARD_REPORTED_LOST'});
});
it('schedules exact approved transfers and executes once when due; callers cannot run the worker',async()=>{
 const [a,b]=await setup();const r=await execute({type:'transfer',mode:'schedule',sourceId:a.id,destinationId:b.id,amountMinor:'5000',scheduledAt:new Date(Date.now()+3600000).toISOString()});expect(r.status).toBe('executed');
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(0);
 await expect(db.query('select private.bank_jobs_tick()')).rejects.toThrow(/permission denied/);
 await db.exec("reset role; update public.bank_scheduled_jobs set due_at=clock_timestamp()-interval '1 second'; set role authenticated;");
 await tick();await tick();expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(2);
 expect((await db.query<{status:string}>('select status from public.bank_scheduled_jobs')).rows[0].status).toBe('completed');
});
it('reserves birthday funds, prevents spending them, supports pause/cancel and releases the hold',async()=>{
 const [a,b]=await setup();await execute({type:'transfer',mode:'birthday',sourceId:a.id,amountMinor:'100000',flowerMinor:'30000',cakeMinor:'70000',birthday:new Date(Date.now()+86400000*10).toISOString().slice(0,10),label:'Spouse birthday'});
 expect((await db.query<{reserved:number}>('select sum(remaining_minor)::float8 as reserved from public.bank_reservations')).rows[0].reserved).toBe(100000);
 const tooMuch=await execute({type:'transfer',sourceId:a.id,destinationId:b.id,amountMinor:String(BigInt(a.balance_minor)-99999n)});expect(tooMuch).toMatchObject({status:'denied',code:'INSUFFICIENT_AVAILABLE_FUNDS'});
 const job=(await db.query<{id:string}>('select id from public.bank_scheduled_jobs limit 1')).rows[0];
 await rpc('bank_job_command',[job.id,'cancel']);
 expect((await db.query<{remaining_minor:number}>('select remaining_minor from public.bank_reservations')).rows[0].remaining_minor).toBe(70000);
});
it('escalates due transfers above the cumulative limit and never spends without fresh approval',async()=>{
 const [a,b]=await setup();await execute({type:'transfer',mode:'schedule',sourceId:a.id,destinationId:b.id,amountMinor:'60000',scheduledAt:new Date(Date.now()+3600000).toISOString()});
 await execute({type:'transfer',sourceId:a.id,destinationId:b.id,amountMinor:'60000'});
 await db.exec("reset role; update public.bank_scheduled_jobs set due_at=clock_timestamp()-interval '1 second'; set role authenticated;");await tick();
 expect((await db.query<{status:string}>('select status from public.bank_scheduled_jobs')).rows[0].status).toBe('needs_verification');
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(2);
});
it('splits exact minor units without fabricating collections and rejects executable code fields',async()=>{
 const [a]=await setup();const r=await execute({type:'transfer',mode:'split',sourceId:a.id,amountMinor:'10000',participants:'Alice|Bob|Chen',label:'Dinner'});expect(r.status).toBe('executed');
 const shares=(await db.query<{amount_minor:number}>('select amount_minor from public.bank_split_requests order by position')).rows;expect(shares.map(s=>Number(s.amount_minor))).toEqual([3334,3333,3333]);
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(0);
 await expect(rpc('sim_prepare',[{type:'card',mode:'create',label:'Injected',limitMinor:'100',code:'return approveAll()'}])).rejects.toThrow('INVALID_ACTION_FIELDS');
});
it('persists detailed approval evidence and isolates jobs, contacts, reminders and audit',async()=>{
 const [a,b]=await setup();const r=await execute({type:'transfer',sourceId:a.id,destinationId:b.id,amountMinor:'100'});
 const evidence=await rpc('bank_action_evidence',[r.id]);expect(evidence).toMatchObject({policy:{tier:'Yellow'},decision:'approved',result:{status:'executed'}});expect(evidence.payload).toBeTruthy();
 await asUser(db,B);await rpc('sim_initialize');expect((await db.query('select id from public.bank_scheduled_jobs')).rows).toHaveLength(0);
 await expect(rpc('bank_action_evidence',[r.id])).rejects.toThrow('ACTION_NOT_FOUND');
});
it('blocks conflicting schedule fields and never executes an unsupported transfer mode',async()=>{
 const [a,b]=await setup();
 await expect(rpc('sim_prepare',[{type:'transfer',mode:'escape',sourceId:a.id,destinationId:b.id,amountMinor:'100'}])).rejects.toThrow('INVALID_TRANSFER_MODE');
 await expect(rpc('sim_prepare',[{type:'transfer',sourceId:a.id,destinationId:b.id,amountMinor:'100',scheduledAt:'2027-01-01T00:00:00Z'}])).rejects.toThrow('INVALID_ACTION_FIELDS');
});
it('stops scheduled mandates after their authorising session is revoked',async()=>{
 const [a,b]=await setup();await execute({type:'transfer',mode:'schedule',sourceId:a.id,destinationId:b.id,amountMinor:'100',scheduledAt:new Date(Date.now()+3600000).toISOString()});
 await db.exec("reset role; update public.bank_scheduled_jobs set due_at=clock_timestamp()-interval '1 second'; delete from auth.sessions where id='"+A+"';");
 await db.query('select private.bank_jobs_tick()');
 expect((await db.query<{status:string;last_error:string}>('select status,last_error from public.bank_scheduled_jobs')).rows[0]).toEqual({status:'failed',last_error:'MANDATE_SESSION_REVOKED'});
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(0);
});
it('keeps failed MFA attempts separate from the successful terminal receipt',async()=>{
 await setup();const card=(await db.query<{id:string}>('select id from public.sim_cards limit 1')).rows[0];
 const a=await rpc('sim_prepare',[{type:'card',cardId:card.id,mode:'lost'}]);
 expect((await rpc('sim_execute',[a.id,true])).code).toBe('ACTION_VERIFICATION_REQUIRED');
 await verifyFixtureAction(db,String(a.id));await rpc('sim_execute',[a.id,true]);
 const evidence=await rpc('bank_action_evidence',[a.id]);expect(evidence.result).toMatchObject({status:'executed'});expect(evidence.verification_id).toBeTruthy();
});
it('creates renewal reminders once and never treats cancellation as a refund',async()=>{
 const [a]=await setup();const before=a.balance_minor;
 await db.exec("reset role; update public.sim_subscriptions set next_renewal=(clock_timestamp() at time zone 'Asia/Shanghai')::date+1; set role authenticated;");
 await tick();await tick();expect((await db.query('select id from public.bank_renewal_notices')).rows).toHaveLength(2);
 const sub=(await db.query<{id:string}>('select id from public.sim_subscriptions limit 1')).rows[0];await execute({type:'subscription',subscriptionId:sub.id});
 expect((await db.query<{balance_minor:number}>('select balance_minor from public.sim_accounts where id=$1',[a.id])).rows[0].balance_minor).toBe(before);
});
it('keeps scheduled workflow effects paused during human takeover',async()=>{
 const [a,b]=await setup();const plan={id:crypto.randomUUID(),version:0,actions:[{payload:{type:'transfer',mode:'schedule',sourceId:a.id,destinationId:b.id,amountMinor:'100',scheduledAt:new Date(Date.now()+3600000).toISOString()}}]};
 await rpc('bank_agent_store_plan',[plan]);let w=await rpc('bank_workflow_create',[plan.id,null]);w=await rpc('bank_workflow_command',[w.id,w.revision,'advance',null]);w=await rpc('bank_workflow_command',[w.id,w.revision,'confirm',w.actionId]);
 await rpc('bank_support_create',[w.id,{workflow:true},'Please review this scheduled workflow']);
 await db.exec("reset role; update public.bank_scheduled_jobs set due_at=clock_timestamp()-interval '1 second'; set role authenticated;");await tick();
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(0);
 expect((await db.query<{last_error:string}>('select last_error from public.bank_scheduled_jobs')).rows[0].last_error).toBe('HUMAN_TAKEOVER_ACTIVE');
});
