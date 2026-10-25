// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,B,asUser,createDatabase} from './database';
let db:PGlite;afterEach(async()=>{await db?.close();});
async function rpc(name:string,args:unknown[]=[]){return (await db.query<Record<string,Record<string,unknown>>>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args)).rows[0][name];}
async function setup(){db=await createDatabase();await asUser(db,A);await rpc('sim_initialize');const accounts=(await db.query<{id:string}>("select id from public.sim_accounts where currency='CNY' order by label")).rows;
 const plan={id:crypto.randomUUID(),version:0,actions:[{payload:{type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100'}},{payload:{type:'budget',category:'food',limitMinor:'90000'}}]};await rpc('bank_agent_store_plan',[plan]);return plan;}
it('persists checkpoints, blocks direct paused execution and does not replay effects',async()=>{
 const plan=await setup();const w=await rpc('bank_workflow_create',[plan.id,null]);const id=w.id;let rev=Number(w.revision);
 let next=await rpc('bank_workflow_command',[id,rev,'advance',null]);rev=Number(next.revision);const actionId=next.actionId;
 next=await rpc('bank_workflow_command',[id,rev,'pause',null]);rev=Number(next.revision);
 expect((await rpc('sim_execute',[actionId,true])).code).toBe('WORKFLOW_PAUSED');
 next=await rpc('bank_workflow_command',[id,rev,'resume',null]);rev=Number(next.revision);
 next=await rpc('bank_workflow_command',[id,rev,'confirm',actionId]);expect(next.outcome).toMatchObject({status:'executed'});rev=Number(next.revision);
 // Simulate losing the response after commit; retry cannot duplicate the ledger effect.
 await expect(rpc('bank_workflow_command',[id,rev-1,'confirm',actionId])).rejects.toThrow('STALE_WORKFLOW');
 expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(2);
 expect((await rpc('bank_workflow_get',[id])).revision).toBe(rev);
 next=await rpc('bank_workflow_command',[id,rev,'cancel_remaining',null]);expect(next.status).toBe('cancelled');
 await asUser(db,B);await expect(rpc('bank_workflow_get',[id])).rejects.toThrow('WORKFLOW_NOT_FOUND');
});
it('rejects cycles and missing dependencies before creating a workflow',async()=>{
 const plan=await setup();await expect(rpc('bank_workflow_create',[plan.id,[[0,1],[1,0]]])).rejects.toThrow('INVALID_DEPENDENCIES');
 await expect(rpc('bank_workflow_create',[plan.id,[[0,9]]])).rejects.toThrow('INVALID_DEPENDENCIES');
});
