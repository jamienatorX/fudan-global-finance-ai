// @vitest-environment node
import {afterEach,describe,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,B,asUser,createDatabase} from './database';
let db:PGlite;
afterEach(async()=>{await db?.close();});
describe('owner-scoped connected agent backend',()=>{
 it('replays the original verified receipt even after later changes',async()=>{
  db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
  const card=(await db.query<{id:string}>('select id from public.sim_cards limit 1')).rows[0];
  async function change(mode:string,version:number){const plan={id:crypto.randomUUID(),version,mode:'deterministic',actions:[{id:crypto.randomUUID(),payload:{type:'card',cardId:card.id,mode}}]};await db.query('select public.bank_agent_store_plan($1::jsonb)',[JSON.stringify(plan)]);const id=(await db.query<{bank_agent_prepare:{id:string}}>('select public.bank_agent_prepare($1,0)',[plan.id])).rows[0].bank_agent_prepare.id;const result=(await db.query<{bank_agent_execute:{status:string;verified:boolean}}>('select public.bank_agent_execute($1,true)',[id])).rows[0].bank_agent_execute;return{id,result};}
  const first=await change('freeze',0);expect(first.result.verified).toBe(true);await change('unfreeze',1);
  expect((await db.query<{bank_agent_execute:unknown}>('select public.bank_agent_execute($1,true)',[first.id])).rows[0].bank_agent_execute).toEqual(first.result);
  expect((await db.query<{frozen:boolean}>('select frozen from public.sim_cards where id=$1',[card.id])).rows[0].frozen).toBe(false);
 });
 it('rejects direct plan mutation, records rejection, and blocks expired confirmations',async()=>{
  db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
  const s=(await db.query<{id:string}>('select id from public.sim_subscriptions limit 1')).rows[0];
  const plan={id:crypto.randomUUID(),version:0,mode:'deterministic',actions:[{id:crypto.randomUUID(),payload:{type:'subscription',subscriptionId:s.id}}]};
  await db.query('select public.bank_agent_store_plan($1::jsonb)',[JSON.stringify(plan)]);
  const prepare=async()=> (await db.query<{bank_agent_prepare:{id:string}}>('select public.bank_agent_prepare($1,0)',[plan.id])).rows[0].bank_agent_prepare.id;
  const rejected=await prepare();
  await expect(db.query("update public.sim_actions set payload='{}' where id=$1",[rejected])).rejects.toThrow(/permission denied/);
  expect((await db.query<{bank_agent_execute:{status:string}}>('select public.bank_agent_execute($1,false)',[rejected])).rows[0].bank_agent_execute.status).toBe('rejected');
  expect((await db.query<{active:boolean}>('select active from public.sim_subscriptions where id=$1',[s.id])).rows[0].active).toBe(true);
  const expired=await prepare();await db.exec('reset role');await db.query("update public.sim_actions set expires_at=now()-interval '1 minute' where id=$1",[expired]);await asUser(db,A);
  expect((await db.query<{bank_agent_execute:{status:string}}>('select public.bank_agent_execute($1,true)',[expired])).rows[0].bank_agent_execute.status).toBe('expired');
 });
 it('loads explicit sample purchases once and isolates owners',async()=>{
  db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
  await db.query('select public.bank_agent_sample_history()');await db.query('select public.bank_agent_sample_history()');
  const rows=await db.query('select * from public.sim_purchase_history');expect(rows.rows.length).toBeGreaterThanOrEqual(6);
  await expect(db.query("insert into public.sim_purchase_history(user_id,account_id,merchant,amount_minor,currency,occurred_at) values ($1,$2,'X',1,'CNY',now())",[A,A])).rejects.toThrow(/permission denied/);
  await asUser(db,B);expect((await db.query('select * from public.sim_purchase_history')).rows).toHaveLength(0);
 });
 it('binds proposals to stored plans, state version and expiry',async()=>{
  db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
  const s=(await db.query<{id:string}>('select id from public.sim_subscriptions limit 1')).rows[0];
  const plan={id:crypto.randomUUID(),version:0,mode:'deterministic',actions:[{id:crypto.randomUUID(),payload:{type:'subscription',subscriptionId:s.id}}]};
  await db.query('select public.bank_agent_store_plan($1::jsonb)',[JSON.stringify(plan)]);
  const prepared=(await db.query<{bank_agent_prepare:{id:string}}>('select public.bank_agent_prepare($1,0)',[plan.id])).rows[0].bank_agent_prepare;
  expect((await db.query<{bank_agent_execute:{status:string;verified:boolean}}>('select public.bank_agent_execute($1,true)',[prepared.id])).rows[0].bank_agent_execute).toMatchObject({status:'executed',verified:true});
  expect((await db.query<{bank_agent_execute:{status:string;verified:boolean}}>('select public.bank_agent_execute($1,true)',[prepared.id])).rows[0].bank_agent_execute).toMatchObject({status:'executed',verified:true});
  await expect(db.query('select public.bank_agent_prepare($1,0)',[plan.id])).rejects.toThrow(/STALE_STATE/);
  await asUser(db,B);await expect(db.query('select public.bank_agent_prepare($1,0)',[plan.id])).rejects.toThrow(/PLAN_NOT_FOUND/);
  await asUser(db,A);await db.exec('reset role');await db.query("update public.sim_agent_plans set expires_at=now()-interval '1 minute' where id=$1",[plan.id]);await asUser(db,A);
  await expect(db.query('select public.bank_agent_prepare($1,0)',[plan.id])).rejects.toThrow(/PLAN_EXPIRED/);
 });
});

