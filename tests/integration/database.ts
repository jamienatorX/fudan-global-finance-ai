import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';

export const A = '00000000-0000-4000-8000-000000000001';
export const B = '00000000-0000-4000-8000-000000000002';

export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now(),not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.jwt() to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  const files = (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
  if (!files.length) throw new Error('No financial migration exists');
  for (const file of files) {
    const source = await readFile(`supabase/migrations/${file}`, 'utf8');
    try { await db.exec(source); }
    catch (cause) {
      const e = cause as Error & { position?: string; detail?: string; where?: string };
      const pos = Number(e.position ?? 0);
      throw new Error(`Migration ${file} failed: ${e.message}; pos=${pos}; nearby=${pos>0 ? source.slice(Math.max(0,pos-180),pos+180) : 'unavailable'}; detail=${e.detail??''}; where=${e.where??''}`);
    }
  }
  await db.exec(`insert into auth.users values ('${A}'), ('${B}');
    insert into auth.sessions(id,user_id) values ('${A}','${A}'),('${B}','${B}');
    insert into public.users (id, user_id, profile, home_currency, locale, risk_profile_ref, is_demo, seed_version, as_of)
    values ('${A}', '${A}', '{"displayName":"Ayu Pratama","nationality":"Indonesian","institution":"Fudan University","city":"Shanghai"}', 'IDR', 'en-US', 'demo', true, 'v1', '2026-10-14T00:00:00.000Z'),
    ('${B}', '${B}', '{"displayName":"Other","nationality":"Fictional","institution":"Demo","city":"Shanghai"}', 'CNY', 'en-US', 'other', false, 'v1', '2026-10-14T00:00:00.000Z');`);
  return db;
}

export async function asUser(db: PGlite, user: string | null, role = 'authenticated') {
  const claims=JSON.stringify({sub:user,session_id:user,aal:'aal2',amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]});
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
}

/** Fixture only. This does not perform or prove an actual authenticator challenge. */
export async function verifyFixtureAction(db:PGlite,actionId:string){
 const grant=(await db.query<{bank_action_verification_begin:{id:string}}>('select public.bank_action_verification_begin($1)',[actionId])).rows[0].bank_action_verification_begin;
 const current=(await db.query<{jwt:Record<string,unknown>}>('select auth.jwt() as jwt')).rows[0].jwt;
 const previous=Array.isArray(current.amr)?Math.max(0,...current.amr.map((a:{timestamp?:number})=>Number(a.timestamp??0))):0;
 await db.exec('reset role');
 const used=(await db.query<{stamp:number}>('select coalesce(max(verified_event),0)::float8 as stamp from private.bank_action_grants')).rows[0].stamp;
 await db.exec('set role authenticated');
 const stamp=Math.max(Math.floor(Date.now()/1000)+1,previous+1,used+1);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({...current,aal:'aal2',amr:[{method:'totp',timestamp:stamp}]})]);
 const r=(await db.query<{bank_action_verification_complete:{status?:string;code?:string}}>('select public.bank_action_verification_complete($1)',[grant.id])).rows[0].bank_action_verification_complete;
 if(r.status!=='verified')throw new Error(r.code??'Fixture verification failed');
}
