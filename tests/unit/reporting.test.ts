import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { buildSpendingReport } from '../../src/features/transactions/reporting';
import { money } from '../../src/domain/money';

const snapshot = createSeedSnapshot('v1');

describe('spending reports', () => {
  it('excludes internal transfers, investment orders, and external remittances from consumption', () => {
    const report = buildSpendingReport(snapshot.transactions, '2026-10', '2026-09');
    expect(report.income).toEqual(money(2_485_000n, 'CNY'));
    expect(report.expenses).toEqual(money(520_000n, 'CNY'));
    expect(report.netCashFlow).toEqual(money(1_965_000n, 'CNY'));
    expect(report.categories.reduce((sum, item) => sum + item.amount.amountMinor, 0n)).toBe(520_000n);
    expect(report.anomalies).toHaveLength(2);
    expect(report.comparison).toMatchObject({ status: 'insufficient-data', expenseChangeBasisPoints: null });
  });

  it('never merges different currencies into one total', () => {
    const report = buildSpendingReport(snapshot.transactions, '2026-10', '2026-09', 'IDR');
    expect(report.income.amountMinor).toBe(10_000_000n);
    expect(report.expenses.amountMinor).toBe(0n);
  });

  it('returns exact comparison rather than inventing a change with no baseline', () => {
    const prior = { ...snapshot.transactions.find((row) => row.merchant === 'Campus Dining')!,
      id: 'prior-dining', occurredAt: '2026-09-05T00:00:00.000Z' };
    const report = buildSpendingReport([...snapshot.transactions, prior], '2026-10', '2026-09');
    expect(report.comparison.status).toBe('available');
    expect(report.comparison.priorExpenses.amountMinor).toBe(115_000n);
    expect(report.comparison.expenseChangeBasisPoints).toBe(Math.trunc(405_000 / 115_000 * 10000));
  });

  it('validates months', () => {
    expect(() => buildSpendingReport(snapshot.transactions, '2026-13', '2026-09')).toThrow();
  });
});
