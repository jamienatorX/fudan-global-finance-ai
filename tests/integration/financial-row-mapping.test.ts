// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSeedSnapshot, DEMO_USER_ID } from '@/demo/seed';
import { snapshotFromRows, snapshotToRows } from '@/server/repositories/financial-row-mapping';

describe('validated relational transport mapping', () => {
  const seed = () => snapshotToRows(createSeedSnapshot('v1'), DEMO_USER_ID);
  it('preserves every seeded field, nullable money, and nested JSON without mutation', () => {
    const rows = seed();
    const result = snapshotFromRows(rows, DEMO_USER_ID);
    expect(result).toEqual(createSeedSnapshot('v1'));
    expect(JSON.stringify(rows)).toContain('1865000');
    expect(result.accounts[0].goal).toBeNull();
  });
  it('rejects malformed structured profile JSON rather than casting untrusted objects', () => {
    const rows = seed();
    (rows.users as Record<string, unknown>[])[0].profile = { displayName: 5 };
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow(/profile/);
  });
  it('rejects incomplete or forged ownership records and numeric money transport', () => {
    const rows = seed();
    const accounts = rows.accounts as Record<string, unknown>[];
    accounts[0].balance_amount_minor = 9007199254740992;
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow(/decimal string/);
    accounts[0].balance_amount_minor = '1865000';
    accounts[0].user_id = 'forged';
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow(/owner mismatch/);
    delete rows.transactions;
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow();
  });
  it('preserves JSON that resembles money and scalar decimal rates/units', () => {
    const rows = seed();
    (rows.auditEvents as Record<string, unknown>[])[0].before_summary = { amountMinor: '999', currency: 'CNY', context: 'JSON' };
    const result = snapshotFromRows(rows, DEMO_USER_ID);
    expect(result.auditEvents[0].beforeSummary).toEqual({ amountMinor: '999', currency: 'CNY', context: 'JSON' });
    expect(result.exchangeRates[0].rate).toBe('2200.000000');
    expect(typeof result.holdings[0].units).toBe('string');
  });
  it('rejects malformed nested simulation records', () => {
    const rows = seed();
    (rows.investmentProducts as Record<string, unknown>[])[0].historical_simulation = { period: 'year', returnBasisPoints: '5', drawdownBasisPoints: 0 };
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow(/simulation/);
  });
  it('rejects malformed recurrence records', () => {
    const other = seed();
    (other.transactions as Record<string, unknown>[])[0].recurrence = { cadence: 'weekly', nextOccurrenceAt: 'invalid' };
    expect(() => snapshotFromRows(other, DEMO_USER_ID)).toThrow(/recurrence/);
  });
  it.each([
    ['accounts', 'id', 'not-a-uuid'],
    ['transactions', 'account_id', '00000000-0000-4000-8000-00000000000x'],
    ['transactions', 'occurred_at', 'yesterday'],
    ['transactions', 'occurred_at', '2026-02-30T00:00:00.000Z'],
    ['transactions', 'occurred_at', '2026-10-14T25:00:00.000Z'],
    ['transactions', 'occurred_at', '2026-10-14'],
    ['transactions', 'occurred_at', '2026-10-14T00:00:00.000+24:00'],
    ['transactions', 'subscription_id', 'bad-nullable-uuid'],
    ['budgets', 'month', '2026-13'],
    ['budgets', 'month', '2026-1'],
    ['exchangeRates', 'rate', '1e3'],
    ['exchangeRates', 'rate', '0.000'],
    ['exchangeRates', 'rate', '-1'],
    ['holdings', 'units', '-0.5'],
    ['cards', 'card_type', 'physical-real'],
    ['beneficiaries', 'supported_currencies', ['CNY', 'EUR']],
    ['beneficiaries', 'supported_currencies', ['CNY', 5]],
    ['investmentProducts', 'fictional', false],
    ['investmentProducts', 'fee_basis_points', -1],
    ['investmentProducts', 'fee_basis_points', 10001],
    ['investmentProducts', 'fee_basis_points', 0.5],
    ['investmentProducts', 'fee_basis_points', 9007199254740992],
    ['accounts', 'balance_amount_minor', '-1'],
    ['accounts', 'balance_amount_minor', '9223372036854775808'],
    ['accounts', 'available_balance_amount_minor', '1865001'],
    ['accounts', 'balance_currency', 'USD'],
    ['budgets', 'limit_currency', 'USD'],
    ['subscriptions', 'amount_currency', 'USD'],
    ['transfers', 'amount_currency', 'USD'],
    ['cards', 'daily_limit_currency', 'USD'],
    ['tuitionObligations', 'paid_amount_currency', 'USD'],
    ['tuitionObligations', 'paid_amount_amount_minor', '500001'],
    ['holdings', 'simulated_value_amount_minor', '-1'],
    ['holdings', 'cost_basis_amount_minor', '-1'],
    ['holdings', 'simulated_value_currency', 'EUR'],
    ['accounts', 'available_balance_currency', 'USD'],
    ['accounts', 'goal_amount_minor', '1'],
    ['budgets', 'actual_spend_currency', 'USD'],
    ['tuitionObligations', 'paid_amount_amount_minor', '-1'],
    ['cards', 'monthly_limit_amount_minor', '-1'],
    ['subscriptions', 'amount_amount_minor', '-1'],
    ['transfers', 'amount_amount_minor', '-1'],
  ] as const)('rejects invalid %s.%s = %j', (collection, field, value) => {
    const rows = seed();
    (rows[collection] as Record<string, unknown>[])[0][field] = value;
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow();
  });
  it('rejects invalid snapshot timestamp and impossible recurrence dates', () => {
    const rows = seed(); rows.asOf = '2026-02-30T00:00:00.000Z';
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow();
    const other = seed();
    (other.transactions as Record<string, unknown>[])[0].recurrence = { cadence: 'monthly', nextOccurrenceAt: '2026-02-30T00:00:00.000Z' };
    expect(() => snapshotFromRows(other, DEMO_USER_ID)).toThrow();
  });
  it('rejects invalid simulation percentage bounds but preserves signed historical returns', () => {
    const rows = seed();
    (rows.investmentProducts as Record<string, unknown>[])[0].historical_simulation = { period: 'year', returnBasisPoints: -10001, drawdownBasisPoints: 0 };
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow();
    (rows.investmentProducts as Record<string, unknown>[])[0].historical_simulation = { period: 'year', returnBasisPoints: -500, drawdownBasisPoints: 10001 };
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow();
    (rows.investmentProducts as Record<string, unknown>[])[0].historical_simulation = { period: 'year', returnBasisPoints: -500, drawdownBasisPoints: 1000 };
    expect(snapshotFromRows(rows, DEMO_USER_ID).investmentProducts[0].historicalSimulation.returnBasisPoints).toBe(-500);
  });
  it('allows distinct supported holding cost and valuation currencies', () => {
    const rows = seed();
    (rows.holdings as Record<string, unknown>[])[0].simulated_value_currency = 'USD';
    expect(snapshotFromRows(rows, DEMO_USER_ID).holdings[0].simulatedValue.currency).toBe('USD');
  });
  it('preserves valid leap-day/offset timestamps, fractional FX precision and signed JSON deltas', () => {
    const rows = seed();
    (rows.transactions as Record<string, unknown>[])[0].occurred_at = '2028-02-29T09:30:00.000+08:00';
    (rows.exchangeRates as Record<string, unknown>[])[0].rate = '0.0000000000000000000000000001';
    (rows.auditEvents as Record<string, unknown>[])[0].after_summary = { delta: -500, amountMinor: '-500', currency: 'CNY' };
    const result = snapshotFromRows(rows, DEMO_USER_ID);
    expect(result.transactions[0].occurredAt).toBe('2028-02-29T09:30:00.000+08:00');
    expect(result.exchangeRates[0].rate).toBe('0.0000000000000000000000000001');
    expect(result.auditEvents[0].afterSummary).toEqual({ delta: -500, amountMinor: '-500', currency: 'CNY' });
  });
  it.each([
    ['version', -1], ['version', 0], ['version', 0.5], ['version', 2147483648],
  ])('rejects invalid plan %s = %j', (field, value) => {
    const rows = seed();
    rows.agentPlans = [{ id: '90000000-0000-4000-8000-000000000001', user_id: DEMO_USER_ID, normalized_intent: 'test', context_snapshot: null, calculations: null, status: 'draft', version: 1, created_at: '2026-10-14T00:00:00.000Z', updated_at: '2026-10-14T00:00:00.000Z', [field]: value }];
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow();
  });
  it('rejects negative action order while accepting zero-based order', () => {
    const rows = seed();
    const action = { id: '90000000-0000-4000-8000-000000000002', user_id: DEMO_USER_ID, plan_id: '90000000-0000-4000-8000-000000000001', order: -1, tool: 'test', input: null, expected_impact: null, validation_result: null, execution_result: null };
    rows.agentActions = [action];
    expect(() => snapshotFromRows(rows, DEMO_USER_ID)).toThrow();
    action.order = 0;
    expect(snapshotFromRows(rows, DEMO_USER_ID).agentActions[0].order).toBe(0);
  });
});
