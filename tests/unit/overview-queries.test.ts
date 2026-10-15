import { describe, expect, it } from 'vitest';
import type { FinancialRepository } from '../../src/domain/financial-repository';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import { getOverviewModel } from '../../src/features/overview/overview-queries';

describe('overview reporting period', () => {
  it('excludes historical budgets from the current reporting month', async () => {
    const seed = createSeedSnapshot('v1');
    const historical = {
      ...seed.budgets[0],
      id: '00000000-0000-4000-8000-000000000240',
      month: '2026-09',
      limit: { amountMinor: 900_000n, currency: 'CNY' as const },
      actualSpend: { amountMinor: 850_000n, currency: 'CNY' as const },
    };
    const snapshot = { ...seed, budgets: [...seed.budgets, historical] };
    const repository = { getSnapshot: async () => snapshot } as unknown as FinancialRepository;

    const overview = await getOverviewModel(repository, DEMO_USER_ID);

    expect(overview.budget.limit.amountMinor).toBe(520_000n);
    expect(overview.budget.actual.amountMinor).toBe(520_000n);
    expect(overview.budget.categories).toHaveLength(5);
    expect(overview.budget.categories.every((budget) => budget.month === '2026-10')).toBe(true);
  });

  it('does not multiply forecast income for historical occurrences of one recurring allowance', async () => {
    const seed = createSeedSnapshot('v1');
    const allowance = seed.transactions.find((transaction) => transaction.category === 'family-allowance')!;
    const historicalAllowance = {
      ...allowance,
      id: '00000000-0000-4000-8000-000000000241',
      occurredAt: '2026-09-01T08:00:00.000Z',
      recordedAt: '2026-09-01T08:00:00.000Z',
      recurrence: { cadence: 'monthly' as const, nextOccurrenceAt: '2026-10-01T08:00:00.000Z' },
    };
    const earlierAllowance = { ...historicalAllowance, id: '00000000-0000-4000-8000-000000000242', occurredAt: '2026-08-01T08:00:00.000Z' };
    const snapshot = { ...seed, transactions: [historicalAllowance, ...seed.transactions, earlierAllowance] };
    const repository = { getSnapshot: async () => snapshot } as unknown as FinancialRepository;

    const overview = await getOverviewModel(repository, DEMO_USER_ID);

    expect(overview.forecast.map((point) => point.inflow.amountMinor)).toEqual([454_545n, 454_545n, 454_545n]);
    expect(overview.forecast.map((point) => point.closing.amountMinor)).toEqual([3_301_481n, 3_236_026n, 3_170_571n]);
  });

  it('does not infer an active income stream from historical-only recurrence metadata', async () => {
    const seed = createSeedSnapshot('v1');
    const snapshot = {
      ...seed,
      transactions: seed.transactions.map((transaction) => transaction.category === 'family-allowance'
        ? { ...transaction, occurredAt: '2026-09-01T08:00:00.000Z' }
        : transaction),
    };
    const repository = { getSnapshot: async () => snapshot } as unknown as FinancialRepository;

    const overview = await getOverviewModel(repository, DEMO_USER_ID);

    expect(overview.forecast.map((point) => point.inflow.amountMinor)).toEqual([0n, 0n, 0n]);
    expect(overview.forecast.map((point) => point.closing.amountMinor)).toEqual([2_846_936n, 2_326_936n, 1_806_936n]);
  });
});
