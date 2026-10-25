// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,B,asUser,createDatabase} from './database';
let db:PGlite;
afterEach(async()=>{await db?.close();});
async function setup(){db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');}
async function rpc(name:string,args:unknown[]=[]){return (await db.query<Record<string,Record<string,unknown>>>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args)).rows[0][name];}
async function transfer(amount:string){const rows=(await db.query<{id:string}>('select id from public.sim_accounts where currency=\'CNY\' order by label')).rows;return rpc('sim_prepare',[{type:'transfer',sourceId:rows[0].id,destinationId:rows[1].id,amountMinor:amount}]);}
it('enforces inclusive CNY daily limit and direct execution verification',async()=>{
 await setup();
 for(const [minor,tier] of [['99900','Yellow'],['100000','Yellow'],['100001','Red']]){const a=await transfer(minor);expect((await rpc('bank_action_policy',[a.id])).tier).toBe(tier);if(tier==='Red')expect((await rpc('sim_execute',[a.id,true])).code).toBe('ACTION_VERIFICATION_REQUIRED');}
 const a=await transfer('60000');expect((await rpc('sim_execute',[a.id,true])).status).toBe('executed');
 const b=await transfer('40100');expect((await rpc('bank_action_policy',[b.id])).tier).toBe('Red');
 expect((await rpc('sim_execute',[a.id,true])).status).toBe('executed');
 expect((await rpc('bank_action_policy',[b.id])).dailyCnyMinor).toBe(100100);
});
it('does not count rejected actions, isolates owners, and escalates unknown FX',async()=>{
 await setup();const a=await transfer('100000');await rpc('sim_execute',[a.id,false]);const b=await transfer('100000');expect((await rpc('bank_action_policy',[b.id])).tier).toBe('Yellow');
 const source=(await db.query<{id:string}>("select id from public.sim_accounts where currency='USD'")).rows[0];
 const fx=await rpc('sim_prepare',[{type:'transfer',sourceId:source.id,destinationId:source.id,amountMinor:'100'}]);expect((await rpc('bank_action_policy',[fx.id])).tier).toBe('Red');
 await asUser(db,B);await expect(rpc('bank_action_policy',[a.id])).rejects.toThrow('ACTION_NOT_FOUND');
});
