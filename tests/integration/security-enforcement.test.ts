// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { A, asUser, createDatabase } from './database';
let db:PGlite;
afterEach(async()=>{await db?.close();});
async function claims(aal='aal2',age=0){
  await db.exec('reset role');
  const jwt=JSON.stringify({sub:A,session_id:A,aal,amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)-age}]});
  await db.query("select set_config('request.jwt.claims',$1,false)",[jwt]);
  await db.exec('set role authenticated');
}
describe('banking security enforced in PostgreSQL',()=>{
  it('requires MFA even when a caller bypasses the Next.js API, and requires fresh verification for changes',async()=>{
    db=await createDatabase();await asUser(db,A);await claims('aal1');
    await expect(db.query('select public.sim_initialize()')).rejects.toThrow('MFA_REQUIRED');
    await claims();await db.query('select public.sim_initialize()');
    await claims('aal2',301);
    await expect(db.query('select public.sim_prepare($1)',[JSON.stringify({type:'budget'})])).rejects.toThrow('REAUTH_REQUIRED');
    expect((await db.query('select id from public.sim_accounts')).rows).toHaveLength(5);
    await claims('aal1');
    expect((await db.query('select id from public.sim_accounts')).rows).toHaveLength(0);
  });
  it('blocks idle, expired and revoked sessions for both RPCs and direct reads',async()=>{
    db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
    await db.exec("reset role; update private.bank_sessions set last_active_at=now()-interval '16 minutes'; set role authenticated;");
    await expect(db.query('select public.bank_security_guard()')).rejects.toThrow('SESSION_EXPIRED');
    expect((await db.query('select id from public.sim_accounts')).rows).toHaveLength(0);
    await db.exec("reset role; update private.bank_sessions set last_active_at=now(); update auth.sessions set created_at=now()-interval '9 hours'; set role authenticated;");
    await expect(db.query('select public.bank_security_guard()')).rejects.toThrow('SESSION_EXPIRED');
    await db.exec(`reset role; delete from auth.sessions where id='${A}'; set role authenticated;`);
    await expect(db.query('select public.bank_security_guard()')).rejects.toThrow('SESSION_EXPIRED');
    expect((await db.query('select id from public.sim_accounts')).rows).toHaveLength(0);
  });
  it('limits writes in the database so direct RPC calls cannot avoid the limit',async()=>{
    db=await createDatabase();await asUser(db,A);await db.query('select public.sim_initialize()');
    await db.exec("reset role; update private.bank_rate_windows set calls=20 where kind='write'; set role authenticated;");
    await expect(db.query('select public.sim_initialize()')).rejects.toThrow('RATE_LIMITED');
    await expect(db.query('select * from private.bank_rate_windows')).rejects.toThrow(/permission denied/);
  });
});
