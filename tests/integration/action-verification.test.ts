// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {A,asUser,createDatabase} from './database';
let db:PGlite;afterEach(async()=>{await db?.close();});
it('requires a new verified event bound to one action and consumes it once',async()=>{
 db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
 const accounts=(await db.query<{id:string}>("select id from public.sim_accounts where currency='CNY' order by label")).rows;
 const prepare=async()=> (await db.query<{sim_prepare:{id:string}}>('select public.sim_prepare($1)',[{type:'transfer',sourceId:accounts[0].id,destinationId:accounts[1].id,amountMinor:'100001'}])).rows[0].sim_prepare;
 const a=await prepare();const grant=(await db.query<{bank_action_verification_begin:{id:string}}>('select public.bank_action_verification_begin($1)',[a.id])).rows[0].bank_action_verification_begin;
 expect((await db.query<{bank_action_verification_complete:{code:string}}>('select public.bank_action_verification_complete($1)',[grant.id])).rows[0].bank_action_verification_complete.code).toBe('FRESH_CHALLENGE_REQUIRED');
 // Fixture JWT only: this is deliberately not evidence of a real authenticator challenge.
 const claims={sub:A,session_id:A,aal:'aal2',amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)+2}]};
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(claims)]);
 expect((await db.query<{bank_action_verification_complete:{status:string}}>('select public.bank_action_verification_complete($1)',[grant.id])).rows[0].bank_action_verification_complete.status).toBe('verified');
 expect((await db.query<{sim_execute:{status:string}}>('select public.sim_execute($1,true)',[a.id])).rows[0].sim_execute.status).toBe('executed');
 const b=await prepare();expect((await db.query<{sim_execute:{code:string}}>('select public.sim_execute($1,true)',[b.id])).rows[0].sim_execute.code).toBe('ACTION_VERIFICATION_REQUIRED');
 await expect(db.query('select private.sim_execute_unchecked($1,true)',[b.id])).rejects.toThrow(/permission denied/);
});
