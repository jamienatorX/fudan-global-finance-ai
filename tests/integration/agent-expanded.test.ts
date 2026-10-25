// @vitest-environment node
import {it,expect} from 'vitest';
import {A,B,asUser,createDatabase,verifyFixtureAction} from './database';
it('executes expanded immutable agent actions, verifies receipts and prevents cross-owner replay',async()=>{
 const db=await createDatabase();try{await asUser(db,A);await db.query('select public.sim_initialize()');
 const accounts=(await db.query<{id:string;label:string}>('select id,label from public.sim_accounts where currency=\'CNY\' order by label')).rows;
 const tuition=(await db.query<{id:string}>('select id from public.sim_tuition limit 1')).rows[0];
 const product=(await db.query<{id:string}>('select id from public.sim_products where risk=\'low\' limit 1')).rows[0];
 let version=0;
 const prepare=async(payload:Record<string,string>)=>{await db.exec('reset role;delete from private.bank_rate_windows;');await asUser(db,A);const plan={id:crypto.randomUUID(),version,mode:'deterministic',actions:[{id:crypto.randomUUID(),payload}]};await db.query('select public.bank_agent_store_plan($1::jsonb)',[JSON.stringify(plan)]);return(await db.query<{bank_agent_prepare:{id:string}}>('select public.bank_agent_prepare($1,0)',[plan.id])).rows[0].bank_agent_prepare.id;};
 const execute=async(payload:Record<string,string>)=>{const id=await prepare(payload);if(payload.type==='investment'||payload.type==='tuition')await verifyFixtureAction(db,id);const result=(await db.query<{bank_agent_execute:{status:string;verified:boolean}}>('select public.bank_agent_execute($1,true)',[id])).rows[0].bank_agent_execute;expect(result).toMatchObject({status:'executed',verified:true});version++;expect((await db.query<{bank_agent_execute:unknown}>('select public.bank_agent_execute($1,true)',[id])).rows[0].bank_agent_execute).toEqual(result);return{id,result};};
 const transfer=await execute({type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'1000'});
 await execute({type:'budget',category:'food',limitMinor:'70000'});
 await execute({type:'tuition',sourceId:accounts[0].id,tuitionId:tuition.id});
 await execute({type:'investment',sourceId:accounts[0].id,productId:product.id,direction:'buy',amountMinor:'10000',riskTolerance:'low'});
 await execute({type:'investment',sourceId:accounts[0].id,productId:product.id,direction:'redeem',amountMinor:'5000'});
 expect((await db.query<{bank_agent_execute:unknown}>('select public.bank_agent_execute($1,true)',[transfer.id])).rows[0].bank_agent_execute).toEqual(transfer.result);
 const balance=(await db.query('select balance_minor from public.sim_accounts where id=$1',[accounts[0].id])).rows;
 const failed=await prepare({type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'99999999999'});
 await verifyFixtureAction(db,failed);expect((await db.query<{bank_agent_execute:{code:string}}>('select public.bank_agent_execute($1,true)',[failed])).rows[0].bank_agent_execute.code).toBe('INSUFFICIENT_FUNDS');
 expect((await db.query('select balance_minor from public.sim_accounts where id=$1',[accounts[0].id])).rows).toEqual(balance);
 const scheduled=await prepare({type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100',scheduledAt:'2028-01-01T12:00:00Z'});
 await verifyFixtureAction(db,scheduled);expect((await db.query<{bank_agent_execute:{code:string}}>('select public.bank_agent_execute($1,true)',[scheduled])).rows[0].bank_agent_execute.code).toBe('CAPABILITY_UNAVAILABLE');
 await asUser(db,B);expect((await db.query<{bank_agent_execute:{code:string}}>('select public.bank_agent_execute($1,true)',[transfer.id])).rows[0].bank_agent_execute.code).toBe('ACTION_NOT_FOUND');
 }finally{await db.close();}
});
