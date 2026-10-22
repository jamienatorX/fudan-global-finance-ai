// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { A, asUser, createDatabase } from './database';

describe('financial CHECK constraints on actual migrated tables', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createDatabase(); await asUser(db, A);
    await db.query('select reset_demo_data()');
    await asUser(db, null, 'postgres');
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it.each([
    ['zero FX rate', "update exchange_rates set rate='0'"],
    ['non-virtual card', "update cards set card_type='physical-real'"],
    ['tuition paid currency mismatch', "update tuition_obligations set paid_amount_currency='USD'"],
    ['tuition overpayment', 'update tuition_obligations set paid_amount_amount_minor=500001'],
    ['negative tuition payment', 'update tuition_obligations set paid_amount_amount_minor=-1'],
    ['negative holding cost', 'update holdings set cost_basis_amount_minor=-1'],
    ['negative holding value', 'update holdings set simulated_value_amount_minor=-1'],
    ['unsupported holding currency', "update holdings set simulated_value_currency='EUR'"],
    ['mismatched card limit currency', "update cards set daily_limit_currency='USD'"],
    ['excessive product fee', 'update investment_products set fee_basis_points=10001'],
  ])('rejects %s independently of RLS/grants', async (_name, sql) => {
    await expect(db.exec(sql)).rejects.toThrow(/check constraint/);
  });
  it('allows exactly paid tuition and distinct supported valuation currency', async () => {
    await db.exec("update tuition_obligations set paid_amount_amount_minor=500000, status='paid'; update holdings set simulated_value_currency='USD';");
    expect((await db.query('select paid_amount_amount_minor::text as paid from tuition_obligations')).rows).toEqual([{ paid: '500000' }]);
  });
});
