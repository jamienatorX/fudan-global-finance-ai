import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';

export const A = '00000000-0000-4000-8000-000000000001';
export const B = '00000000-0000-4000-8000-000000000002';

export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
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
    insert into public.users (id, user_id, profile, home_currency, locale, risk_profile_ref, is_demo, seed_version, as_of)
    values ('${A}', '${A}', '{"displayName":"Ayu Pratama","nationality":"Indonesian","institution":"Fudan University","city":"Shanghai"}', 'IDR', 'en-US', 'demo', true, 'v1', '2026-10-14T00:00:00.000Z'),
    ('${B}', '${B}', '{"displayName":"Other","nationality":"Fictional","institution":"Demo","city":"Shanghai"}', 'CNY', 'en-US', 'other', false, 'v1', '2026-10-14T00:00:00.000Z');`);
  return db;
}

export async function asUser(db: PGlite, user: string | null, role = 'authenticated') {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); set role ${role};`);
}
