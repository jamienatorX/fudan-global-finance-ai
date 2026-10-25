// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,asUser,createDatabase} from './database';
let db:PGlite;afterEach(async()=>{await db?.close();});
async function rpc(name:string,args:unknown[]=[]){return (await db.query<Record<string,Record<string,unknown>>>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args)).rows[0][name];}
it('compensates own-account transfers once without deleting original history',async()=>{
 db=await createDatabase();await asUser(db,A);await rpc('sim_initialize');const accounts=(await db.query<{id:string}>("select id from public.sim_accounts where currency='CNY' order by label")).rows;
 const plan={id:crypto.randomUUID(),version:0,actions:[{payload:{type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100'}}]};await rpc('bank_agent_store_plan',[plan]);
 let w=await rpc('bank_workflow_create',[plan.id,null]);w=await rpc('bank_workflow_command',[w.id,w.revision,'advance',null]);
 w=await rpc('bank_workflow_command',[w.id,w.revision,'confirm',w.actionId]);
 const recovery=await rpc('bank_workflow_recovery_prepare',[w.id,w.revision]);expect(recovery.status).toBe('pending');
 const r=await rpc('sim_execute',[recovery.id,true]);expect(r.status).toBe('executed');
 await rpc('sim_execute',[recovery.id,true]);expect((await db.query('select id from public.sim_ledger')).rows).toHaveLength(4);
 expect((await rpc('bank_workflow_recovery_prepare',[w.id,w.revision])).code).toBe('NO_RECOVERY_AVAILABLE');
});
