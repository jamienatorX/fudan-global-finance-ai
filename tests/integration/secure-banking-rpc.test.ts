// @vitest-environment node
import { afterEach,describe,expect,it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { A,B,asUser,createDatabase,verifyFixtureAction } from './database';

let db:PGlite|null=null;
afterEach(async()=>{if(db){await db.close();db=null;}});
type J={id:string;status:string;code?:string;version?:number};
async function provision(owner=A){
  await asUser(db!,owner);
  const result=await db!.query<{sim_initialize:unknown}>('select public.sim_initialize()');
  expect((result.rows[0].sim_initialize as {status:string}).status).toBe('ready');
}
async function accounts(){
  const result=await db!.query<{id:string;label:string;balance_minor:number}>(
    'select id,label,balance_minor from public.sim_accounts order by label');
  return result.rows;
}
async function prepare(payload:Record<string,unknown>){
  const result=await db!.query<{sim_prepare:J}>('select public.sim_prepare($1::jsonb)',[JSON.stringify(payload)]);
  return result.rows[0].sim_prepare;
}
async function execute(id:string,approve:boolean){
  const result=await db!.query<{sim_execute:J}>('select public.sim_execute($1::uuid,$2::boolean)',[id,approve]);
  return result.rows[0].sim_execute;
}

describe('authenticated fictitious money backend',()=>{
 it('enrolls accounts idempotently and denies browser direct balance writes',async()=>{
  db=await createDatabase();await provision();
  expect((await accounts())).toHaveLength(5);
  await provision();
  expect((await accounts())).toHaveLength(5);
  await expect(db.query('update public.sim_accounts set balance_minor=999999')).rejects.toThrow(/permission denied/i);
  await asUser(db,B);await provision(B);
  expect((await accounts())).toHaveLength(5);
 });
 it('performs exact two-sided transfers after explicit approval, preserving retry result',async()=>{
  db=await createDatabase();await provision();
  const all=await accounts(),source=all.find(a=>a.label==='Daily CNY')!,destination=all.find(a=>a.label==='Savings CNY')!;
  const proposal=await prepare({type:'transfer',sourceId:source.id,destinationId:destination.id,amountMinor:'80000'});
  const before=await accounts();
  expect(before.find(a=>a.id===source.id)!.balance_minor).toBe(1865000);
  expect((await execute(proposal.id,true)).status).toBe('executed');
  expect((await execute(proposal.id,true)).status).toBe('executed');
  const after=await accounts();
  expect(after.find(a=>a.id===source.id)!.balance_minor).toBe(1785000);
  expect(after.find(a=>a.id===destination.id)!.balance_minor).toBe(1280000);
  const tx=await db.query('select id from public.sim_ledger where action_id=$1',[proposal.id]);
  expect(tx.rows).toHaveLength(2);
 });
 it('prevents unauthorized, expired, stale, and underfunded actions without debiting',async()=>{
  db=await createDatabase();await provision();
  const all=await accounts(),source=all.find(a=>a.label==='Daily CNY')!,target=all.find(a=>a.label==='Savings CNY')!;
  const transfer={type:'transfer',sourceId:source.id,destinationId:target.id,amountMinor:'10000'};
  const stale=await prepare(transfer),current=await prepare(transfer);
  await execute(current.id,true);
  expect((await execute(stale.id,true)).status).toBe('stale');
  const invalid=await prepare({...transfer,amountMinor:'99999999999'});
  await verifyFixtureAction(db,invalid.id);expect((await execute(invalid.id,true)).code).toBe('INSUFFICIENT_FUNDS');
  const expired=await prepare(transfer);
  await db.exec('reset role');
  await db.query("update public.sim_actions set expires_at=now()-interval '2 minutes' where id=$1",[expired.id]);
  await asUser(db,A);
  expect((await execute(expired.id,true)).status).toBe('expired');
  const foreign=await prepare(transfer);
  await asUser(db,B);await provision(B);
  expect((await execute(foreign.id,true)).code).toBe('ACTION_NOT_FOUND');
  const visible=await db.query('select id from public.sim_actions where id=$1',[foreign.id]);
  expect(visible.rows).toHaveLength(0);
 });
 it('supports rejected plans and tuition, budget, card, subscription and investment state changes',async()=>{
  db=await createDatabase();await provision();
  const all=await accounts(),source=all.find(a=>a.label==='Daily CNY')!;
  const rejected=await prepare({type:'budget',category:'shopping',limitMinor:'46400'});
  expect((await execute(rejected.id,false)).status).toBe('rejected');
  let query=await db.query<{limit_minor:number}>("select limit_minor from public.sim_budgets where category='shopping'");
  expect(query.rows[0].limit_minor).toBe(58000);
  const budget=await prepare({type:'budget',category:'shopping',limitMinor:'46400'});
  expect((await execute(budget.id,true)).status).toBe('executed');
  query=await db.query<{limit_minor:number}>("select limit_minor from public.sim_budgets where category='shopping'");
  expect(query.rows[0].limit_minor).toBe(46400);
  const sub=(await db.query<{id:string}>("select id from public.sim_subscriptions where merchant='Campus Video'")).rows[0].id;
  const cancel=await prepare({type:'subscription',subscriptionId:sub});
  await execute(cancel.id,true);
  const cards=(await db.query<{id:string}>('select id from public.sim_cards')).rows;
  const freeze=await prepare({type:'card',cardId:cards[0].id,mode:'freeze'});
  await verifyFixtureAction(db,freeze.id);await execute(freeze.id,true);
  const tuition=(await db.query<{id:string}>('select id from public.sim_tuition')).rows[0].id;
  const payment=await prepare({type:'tuition',sourceId:source.id,tuitionId:tuition});
  await verifyFixtureAction(db,payment.id);await execute(payment.id,true);
  const products=(await db.query<{id:string}>('select id from public.sim_products')).rows;
  const buy=await prepare({type:'investment',sourceId:source.id,productId:products[0].id,direction:'buy',amountMinor:'10000'});
  await verifyFixtureAction(db,buy.id);expect((await execute(buy.id,true)).status).toBe('executed');
  expect((await db.query<{paid:boolean}>('select paid from public.sim_tuition')).rows[0].paid).toBe(true);
  expect((await db.query<{frozen:boolean}>('select frozen from public.sim_cards where id=$1',[cards[0].id])).rows[0].frozen).toBe(true);
  expect((await db.query<{active:boolean}>('select active from public.sim_subscriptions where id=$1',[sub])).rows[0].active).toBe(false);
  expect((await db.query<{value_minor:number}>('select value_minor from public.sim_holdings')).rows[0].value_minor).toBe(10000);
 });
});
