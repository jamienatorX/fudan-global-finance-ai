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
});
