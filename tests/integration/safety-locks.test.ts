// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,asUser,createDatabase} from './database';
let db:PGlite;afterEach(async()=>{await db?.close();});
it('persists failed business events, locks on third failure, and permits reads',async()=>{
 db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
 const accounts=(await db.query<{id:string}>("select id from public.sim_accounts where currency='CNY' order by label")).rows;
 for(let i=0;i<3;i++){const p=(await db.query<{sim_prepare:{id:string}}>('select public.sim_prepare($1)',[{type:'transfer',sourceId:accounts[0].id,destinationId:accounts[0].id,amountMinor:'100'}])).rows[0].sim_prepare;
 const r=(await db.query<{sim_execute:{code:string}}>('select public.sim_execute($1,true)',[p.id])).rows[0].sim_execute;expect(r.code).toBe('SAME_ACCOUNT');}
 const status=(await db.query<{bank_security_status:{locked:boolean}}>('select public.bank_security_status()')).rows[0].bank_security_status;expect(status.locked).toBe(true);
 await expect(db.query('select public.sim_prepare($1)',[{type:'budget',category:'food',limitMinor:'50'}])).rejects.toThrow('SAFETY_LOCKED');
 expect((await db.query('select id from public.sim_accounts')).rows).toHaveLength(5);
 expect((await db.query("select id from public.bank_security_events where category='SAME_ACCOUNT'")).rows).toHaveLength(3);
 await db.exec("reset role; update private.bank_safety_locks set expires_at=now()-interval '1 second'; set role authenticated;");
 expect((await db.query<{bank_security_status:{locked:boolean}}>('select public.bank_security_status()')).rows[0].bank_security_status.locked).toBe(false);
});
