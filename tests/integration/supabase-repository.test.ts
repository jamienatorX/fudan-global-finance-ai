// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { PGlite } from '@electric-sql/pglite';
import { SupabaseFinancialRepository } from '@/server/repositories/supabase-financial-repository';
import { A, B, asUser, createDatabase } from './database';
import { createSeedSnapshot } from '@/demo/seed';

describe('Supabase repository through real HTTP client and PostgreSQL RPCs', () => {
  let db: PGlite;
  let subject: string | null = A;
  let fail = false;
  let calls = 0;
  beforeAll(async () => { db = await createDatabase(); }, 30000);
  afterAll(async () => { await db?.close(); });
  const client = createClient('https://fixture.supabase.co', 'publishable-fixture', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      calls++;
      if (fail) return new Response(JSON.stringify({ message: 'database unavailable' }), { status: 503 });
      await asUser(db, subject);
      const rpc = new URL(String(url)).pathname.split('/').at(-1);
      if (rpc === 'read_financial_snapshot') {
        const result = await db.query<{ result: unknown }>('select read_financial_snapshot() as result');
        return Response.json(result.rows[0].result);
      }
      if (rpc === 'reset_demo_data') {
        if (Object.keys(JSON.parse(String(options?.body))).length) return Response.json({ message: 'No reset overload accepts caller payloads' }, { status: 400 });
        const result = await db.query<{ result: unknown }>('select reset_demo_data() as result');
        return Response.json(result.rows[0].result);
      }
      throw new Error(`Unexpected RPC ${rpc}`);
    } },
  });
  // Only the external Auth verification call is doubled; SQL and HTTP serialization are real.
  const repository = new SupabaseFinancialRepository({
    auth: { getClaims: async () => ({ data: subject ? { claims: { sub: subject } } : null, error: null }) },
    rpc: client.rpc.bind(client),
  });

  it('resets atomically, preserves classifications/currencies and all entity collections', async () => {
    const snapshot = await repository.reset(A);
    expect(snapshot.accounts).toHaveLength(5);
    expect(snapshot.accounts[0].balance.amountMinor).toBe(1865000n);
    expect(snapshot.transactions.filter((row) => row.classification === 'internal-transfer')).toHaveLength(2);
    expect(snapshot.transactions.find((row) => row.classification === 'asset-movement')?.amount.currency).toBe('CNY');
    expect(snapshot.transactions.find((row) => row.originalCurrency === 'IDR')?.amount.amountMinor).toBe(10000000n);
    expect(snapshot.investmentProducts).toHaveLength(4);
    expect(snapshot.tuitionObligations[0].amount.amountMinor).toBe(500000n);
    expect((await repository.reset(A)).accounts).toHaveLength(5);
    expect((await repository.getSnapshot(A)).auditEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('round-trips bigint beyond JS safe range via decimal text', async () => {
    await asUser(db, null, 'postgres');
    await db.exec(`update accounts set balance_amount_minor = 9007199254740993 where currency = 'IDR'`);
    const accounts = await repository.listAccounts(A);
    expect(accounts.find((row) => row.currency === 'IDR')?.balance.amountMinor).toBe(9007199254740993n);
    const raw = await db.query<{ result: { accounts: { balance_amount_minor: string }[] } }>('select read_financial_snapshot() as result');
    expect(raw.rows[0].result.accounts.some((row) => row.balance_amount_minor === '9007199254740993')).toBe(true);
  });

  it('derives authorization from verified claims before any data request', async () => {
    const before = calls;
    await expect(repository.listAccounts(B)).rejects.toThrow(/authorized/i);
    subject = null;
    await expect(repository.getSnapshot(A)).rejects.toThrow(/authorized/i);
    subject = A;
    expect(calls).toBe(before);
  });

  it('surfaces database errors instead of silently falling back to demo data', async () => {
    fail = true;
    await expect(repository.getSnapshot(A)).rejects.toThrow(/unavailable/);
    fail = false;
  });
  it('rolls back the entire reset after a late database failure and preserves prior balances', async () => {
    await asUser(db, null, 'postgres');
    await db.exec(`create schema test_tools;
      create function test_tools.fail_insert() returns trigger language plpgsql as $$ begin raise exception 'forced late failure'; end $$;
      create trigger fail_holdings before insert on holdings for each row execute function test_tools.fail_insert();`);
    await asUser(db, A);
    await expect(db.query('select reset_demo_data()')).rejects.toThrow(/forced late failure/);
    await asUser(db, null, 'postgres');
    await db.exec('drop trigger fail_holdings on holdings; drop schema test_tools cascade;');
    expect((await repository.listAccounts(A)).find((row) => row.currency === 'IDR')?.balance.amountMinor).toBe(9007199254740993n);
    expect((await repository.listHoldings(A))).toHaveLength(2);
  });
  it('has no caller-controlled seed overload and denies even another enrolled demo identity', async () => {
    await asUser(db, A);
    await expect(db.query("select reset_demo_data('{}'::jsonb)")).rejects.toThrow(/does not exist/);
    await asUser(db, null, 'postgres');
    await db.exec(`update users set is_demo = true where user_id = '${B}'`);
    subject = B;
    expect((await repository.listAccounts(B))).toEqual([]);
    const other = await repository.getSnapshot(B);
    expect(Object.entries(other).filter(([key]) => !['users', 'seedVersion', 'asOf'].includes(key)).every(([, value]) => Array.isArray(value) && value.length === 0)).toBe(true);
    await expect(repository.reset(B)).rejects.toThrow(/demo/);
    subject = A;
  });
  it('isolates all repository reads and returns detached snapshots', async () => {
    const snapshot = await repository.getSnapshot(A);
    (snapshot.accounts as unknown[]).pop();
    expect(await repository.listAccounts(A)).toHaveLength(5);
    expect(await repository.getUser(A)).toMatchObject({ id: A, profile: { displayName: 'Ayu Pratama' } });
    expect(await repository.listTransactions(A)).toHaveLength(17);
    expect(await repository.listBudgets(A)).toHaveLength(6);
    expect(await repository.listBeneficiaries(A)).toHaveLength(3);
    expect(await repository.listCards(A)).toHaveLength(2);
    expect(await repository.listSubscriptions(A)).toHaveLength(4);
    expect(await repository.listInvestmentProducts(A)).toHaveLength(4);
    expect(await repository.listExchangeRates(A)).toHaveLength(3);
  });
  it('keeps the embedded canonical database fixture synchronized with the versioned domain seed', async () => {
    const snapshot = await repository.reset(A);
    const expected = createSeedSnapshot('v1');
    for (const [key, records] of Object.entries(expected)) {
      if (key === 'users') continue; // Provisioned profile is preserved, not reset.
      const actual = snapshot[key as keyof typeof snapshot];
      if (Array.isArray(records)) {
        expect(actual).toEqual(expect.arrayContaining(records));
        if (key !== 'auditEvents') expect(actual).toHaveLength(records.length);
      } else expect(actual).toBe(records);
    }
  });
});
