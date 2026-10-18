// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { A, B, asUser, createDatabase } from './database';

describe('financial migration executed by PostgreSQL', () => {
  let db: PGlite;
  beforeAll(async () => { db = await createDatabase(); }, 30000);
  afterAll(async () => { await db?.close(); });

  it('enables RLS and leading ownership indexes for every public table', async () => {
    await asUser(db, A);
    const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(`select relname, relrowsecurity from pg_class join pg_namespace n on n.oid = relnamespace where n.nspname = 'public' and relkind = 'r'`);
    expect(tables.rows).toHaveLength(31);
    for (const table of tables.rows) {
      expect(table.relrowsecurity).toBe(true);
      const indexes = await db.query<{ indexdef: string }>(`select indexdef from pg_indexes where schemaname = 'public' and tablename = $1`, [table.relname]);
      expect(indexes.rows.some(({ indexdef }) => /\(user_id[,)]/.test(indexdef))).toBe(true);
    }
  });

  it('isolates reads and blocks cross-owner insert/update/delete and owner reassignment', async () => {
    await asUser(db, null, 'postgres');
    await db.exec(`insert into accounts (id,user_id,type,currency,balance_amount_minor,balance_currency,available_balance_amount_minor,available_balance_currency,status)
      values ('10000000-0000-4000-8000-000000000001','${A}','daily','CNY',100,'CNY',100,'CNY','active'),
      ('10000000-0000-4000-8000-000000000002','${B}','daily','CNY',200,'CNY',200,'CNY','active');`);
    await asUser(db, A);
    expect((await db.query('select balance_amount_minor::text as amount from accounts')).rows).toEqual([{ amount: '100' }]);
    await expect(db.query(`update accounts set balance_amount_minor = 0 where user_id = '${B}' returning id`)).rejects.toThrow(/permission denied/);
    await expect(db.query(`delete from accounts where user_id = '${B}' returning id`)).rejects.toThrow(/permission denied/);
    await expect(db.exec(`update accounts set user_id = '${B}' where user_id = '${A}'`)).rejects.toThrow();
    await expect(db.exec(`insert into accounts (id,user_id,type,currency,balance_amount_minor,balance_currency,available_balance_amount_minor,available_balance_currency,status)
      values ('10000000-0000-4000-8000-000000000003','${B}','daily','CNY',100,'CNY',100,'CNY','active')`)).rejects.toThrow();
  });

  it('denies anonymous table and RPC access, even with a forged user claim', async () => {
    await asUser(db, A, 'anon');
    await expect(db.query('select * from accounts')).rejects.toThrow(/permission denied/);
    await expect(db.query('select read_financial_snapshot()')).rejects.toThrow(/permission denied/);
  });

  it('rejects non-demo financial mutations and reset; keeps audit append-only', async () => {
    await asUser(db, B);
    await expect(db.query('update accounts set balance_amount_minor = 0 returning id')).rejects.toThrow(/permission denied/);
    await expect(db.query('select reset_demo_data()')).rejects.toThrow(/demo/);
    await asUser(db, A);
    await expect(db.exec('delete from audit_events')).rejects.toThrow(/permission denied/);
    await expect(db.exec('update users set is_demo = false')).rejects.toThrow(/permission denied/);
  });

  it('rejects cross-owner links through composite foreign keys', async () => {
    await asUser(db, null, 'postgres');
    await expect(db.exec(`insert into cards (id,user_id,account_id,masked_number,card_type,purpose,freeze_state,daily_limit_amount_minor,daily_limit_currency,monthly_limit_amount_minor,monthly_limit_currency)
      values ('20000000-0000-4000-8000-000000000001','${A}','10000000-0000-4000-8000-000000000002','**** 0001','virtual','daily','active',1,'CNY',1,'CNY')`)).rejects.toThrow(/foreign key/);
  });
  it('has only invoker RPCs in the exposed schema and no anonymous grants', async () => {
    await asUser(db, A);
    const functions = await db.query<{ proname: string; prosecdef: boolean }>(`select proname, prosecdef from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public'`);
    expect(functions.rows).toHaveLength(6);
    expect(functions.rows.every((fn) => !fn.prosecdef)).toBe(true);
    const privateFunction = await db.query<{ proname:string; prosecdef: boolean; proconfig: string[]; anon: boolean }>(`select p.proname,p.prosecdef, p.proconfig, has_function_privilege('anon',p.oid,'EXECUTE') as anon from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='private'`);
    expect(privateFunction.rows).toHaveLength(7);
    expect(privateFunction.rows.every(fn => (fn.prosecdef || fn.proname==='bank_recent_mfa') && !fn.anon && fn.proconfig?.includes('search_path=""'))).toBe(true);
    const updates = await db.query<{ polqual: unknown; polwithcheck: unknown }>(`select polqual, polwithcheck from pg_policy where polcmd='w'`);
    expect(updates.rows).toHaveLength(0);
    const grants = await db.query(`select * from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','PUBLIC')`);
    expect(grants.rows).toEqual([]);
  });
  it('denies direct demo writes to every financial table and administrative profile fields', async () => {
    await asUser(db, A);
    const grants = await db.query<{ table_name: string; privilege_type: string }>(`select table_name, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee='authenticated'`);
    expect(grants.rows).toHaveLength(31);
    expect(grants.rows.every((grant) => grant.privilege_type === 'SELECT')).toBe(true);
    await expect(db.exec('update accounts set balance_amount_minor = 0')).rejects.toThrow(/permission denied/);
    await expect(db.exec('delete from transactions')).rejects.toThrow(/permission denied/);
    await expect(db.exec('update users set is_demo = true')).rejects.toThrow(/permission denied/);
    await asUser(db, A, 'anon');
    await expect(db.query('select reset_demo_data()')).rejects.toThrow(/permission denied/);
  });
  it('uses an indexed action execution-status predicate alongside owner scope', async () => {
    await asUser(db, null, 'postgres');
    await db.exec(`insert into agent_plans (user_id,id,normalized_intent,status,version,created_at,updated_at) values ('${A}','30000000-0000-4000-8000-000000000001','test','executed',1,now(),now());
      insert into agent_actions (user_id,id,plan_id,"order",tool,execution_result) values ('${A}','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',1,'test','{"status":"completed"}');`);
    await asUser(db, A);
    expect((await db.query(`select execution_status from agent_actions`)).rows).toEqual([{ execution_status: 'completed' }]);
    await db.exec('set enable_seqscan = off');
    const result = await db.query<Record<string, unknown>>(`explain (format json) select * from agent_actions where user_id='${A}' and execution_status='completed'`);
    expect(JSON.stringify(result.rows)).toMatch(/Index Cond[^}]*execution_status/);
    await db.exec('reset enable_seqscan');
  });
});

