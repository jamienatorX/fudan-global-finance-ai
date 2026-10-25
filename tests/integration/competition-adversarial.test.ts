// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,B,asUser,createDatabase,verifyFixtureAction} from './database';
let db:PGlite;afterEach(async()=>{await db?.close();});
async function rpc(name:string,args:unknown[]=[]){return (await db.query<Record<string,Record<string,unknown>>>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args)).rows[0][name];}
async function setup(){db=await createDatabase();await asUser(db,A);await rpc('sim_initialize');return (await db.query<{id:string}>("select id from public.sim_accounts where currency='CNY' order by label")).rows;}
it('invalidates an expired grant and a grant from another session',async()=>{
 const accounts=await setup();const action=await rpc('sim_prepare',[{type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100001'}]);await verifyFixtureAction(db,String(action.id));
 const sid=crypto.randomUUID();await db.exec('reset role');await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,A]);await asUser(db,A);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:A,session_id:sid,aal:'aal2',amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]})]);
 expect((await rpc('sim_execute',[action.id,true])).code).toBe('ACTION_VERIFICATION_REQUIRED');
 await asUser(db,A);await db.exec("reset role;update private.bank_action_grants set expires_at=now()-interval '1 second';set role authenticated;");
 expect((await rpc('sim_execute',[action.id,true])).code).toBe('ACTION_VERIFICATION_REQUIRED');
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(0);
});
it('does not reuse a verified event for a second action or accept browser table edits',async()=>{
 const accounts=await setup();const payload={type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100001'};
 const a=await rpc('sim_prepare',[payload]);await verifyFixtureAction(db,String(a.id));const b=await rpc('sim_prepare',[payload]);const grant=await rpc('bank_action_verification_begin',[b.id]);
 expect((await rpc('bank_action_verification_complete',[grant.id])).code).toBe('FRESH_CHALLENGE_REQUIRED');
 await expect(db.query("update public.sim_actions set payload=$1 where id=$2",[{...payload,amountMinor:'1'},a.id])).rejects.toThrow(/permission denied/);
 await expect(db.query('select private.bank_record_denial($1,$2)',['FORBIDDEN_OPERATION',a.id])).rejects.toThrow(/permission denied/);
 await expect(db.query('select private.bank_guard_base(true)')).rejects.toThrow(/permission denied/);
});
it('uses Shanghai day boundaries without replenishing an allowance through compensation',async()=>{
 const accounts=await setup();let a=await rpc('sim_prepare',[{type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100000'}]);await rpc('sim_execute',[a.id,true]);
 a=await rpc('sim_prepare',[{type:'transfer',sourceId:accounts[1].id,destinationId:accounts[0].id,amountMinor:'1'}]);expect((await rpc('bank_action_policy',[a.id])).tier).toBe('Red');
 await db.exec("reset role;update private.bank_transfer_usage set day=(clock_timestamp() at time zone 'Asia/Shanghai')::date-1;set role authenticated;");
 expect((await rpc('bank_action_policy',[a.id])).tier).toBe('Yellow');
});
it('expires operator claims and prevents another owner from claiming customer authority',async()=>{
 await setup();const t=await rpc('bank_support_create',[null,{security:true},'Please review my security hold']);
 await db.exec('reset role');await db.query('insert into private.bank_operators(user_id) values($1)',[B]);await asUser(db,B);
 const claimed=await rpc('bank_operator_command',[t.id,0,'claim','']);await db.exec("reset role;update public.bank_support_tickets set claim_expires_at=now()-interval '1 second';set role authenticated;");
 await expect(rpc('bank_support_get',[t.id])).rejects.toThrow('TICKET_NOT_FOUND');
 await expect(rpc('bank_operator_command',[t.id,claimed.revision,'resolve',''])).rejects.toThrow('ASSIGNMENT_REQUIRED');
 await asUser(db,A);await expect(db.query('update public.bank_support_tickets set operator_id=$1',[A])).rejects.toThrow(/permission denied/);
});
it('cannot execute injected code and holds a forbidden action attempt without executing it',async()=>{
 await setup();expect((await rpc('sim_prepare',[{type:'shell',command:'DROP TABLE public.sim_accounts',verified:true,tier:'Green'}])).code).toBe('ACTION_NOT_ALLOWED');
 expect((await rpc('bank_security_status')).recoveryRequired).toBe(true);
 expect((await db.query('select id from public.sim_accounts')).rows).toHaveLength(5);
 const result=await rpc('sim_execute',[crypto.randomUUID(),true]);expect(result.code).toBe('ACTION_NOT_FOUND');
 expect((await rpc('bank_security_status')).recoveryRequired).toBe(true);
 expect((await rpc('bank_security_recover')).code).toBe('FRESH_CHALLENGE_REQUIRED');
});
it('rejects a newer pre-existing JWT when binding began with an older JWT',async()=>{
 const accounts=await setup();const now=Math.floor(Date.now()/1000);
 const jwt=(stamp:number)=>JSON.stringify({sub:A,session_id:A,aal:'aal2',amr:[{method:'totp',timestamp:stamp}]});
 await db.query("select set_config('request.jwt.claims',$1,false)",[jwt(now-20)]);
 const a=await rpc('sim_prepare',[{type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100001'}]);const grant=await rpc('bank_action_verification_begin',[a.id]);
 await db.query("select set_config('request.jwt.claims',$1,false)",[jwt(now-1)]);
 expect((await rpc('bank_action_verification_complete',[grant.id])).code).toBe('FRESH_CHALLENGE_REQUIRED');
});
it('classifies tuition and card security actions as Red and audits repeated missing approvals',async()=>{
 const accounts=await setup();const tuition=(await db.query<{id:string}>('select id from public.sim_tuition limit 1')).rows[0];
 const a=await rpc('sim_prepare',[{type:'tuition',sourceId:accounts[0].id,tuitionId:tuition.id}]);expect((await rpc('bank_action_policy',[a.id])).tier).toBe('Red');
 const card=(await db.query<{id:string}>('select id from public.sim_cards limit 1')).rows[0];const c=await rpc('sim_prepare',[{type:'card',cardId:card.id,mode:'freeze'}]);expect((await rpc('bank_action_policy',[c.id])).tier).toBe('Red');
 for(let i=0;i<3;i++)expect((await rpc('sim_execute',[a.id,true])).code).toBe('ACTION_VERIFICATION_REQUIRED');
 expect((await rpc('bank_security_status')).locked).toBe(true);
 expect((await db.query("select id from public.bank_security_events where category='ACTION_VERIFICATION_REQUIRED'")).rows).toHaveLength(3);
});
