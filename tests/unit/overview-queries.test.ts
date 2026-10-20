import { describe, expect, it } from 'vitest';
import type { FinancialRepository } from '../../src/domain/financial-repository';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import { getOverviewModel } from '../../src/features/overview/overview-queries';

describe('overview reporting period', () => {
  it('uses ledger balances for net worth and available balances for cash and runway', async () => {
    const seed = createSeedSnapshot('v1');
    const snapshot = { ...seed, accounts: seed.accounts.map((account, index) => index === 0
      ? { ...account, balance: { ...account.balance, amountMinor: account.balance.amountMinor + 100_000n } }
      : account) };
    const overview = await getOverviewModel({ getSnapshot: async () => snapshot } as unknown as FinancialRepository, DEMO_USER_ID);
    expect(overview.totalNetWorth.amountMinor).toBe(4_120_136n);
    expect(overview.accountBalances[0].amount.amountMinor).toBe(1_965_000n);
    expect(overview.availableCash.amountMinor).toBe(3_866_936n);
    expect(overview.cashRunwayMonths).toBe(6.5);
  });

  it('annualizes subscriptions from original cadence amounts without monthly rounding loss', async () => {
    const seed = createSeedSnapshot('v1');
    const yearly = { ...seed.subscriptions[0], cadence: 'yearly' as const, amount: { amountMinor: 10_000n, currency: 'CNY' as const } };
    const overview = await getOverviewModel({ getSnapshot: async () => ({ ...seed, subscriptions: [yearly] }) } as unknown as FinancialRepository, DEMO_USER_ID);
    expect(overview.subscriptions.monthly.amountMinor).toBe(833n);
    expect(overview.subscriptions.annual.amountMinor).toBe(10_000n);
  });

  it('derives alert content from changed tuition dates and clears resolved snapshot alerts', async () => {
    const seed = createSeedSnapshot('v1');
    const snapshot = {
      ...seed,
      tuitionObligations: seed.tuitionObligations.map((tuition) => ({ ...tuition, dueAt: '2026-12-15T00:00:00.000Z' })),
      transactions: seed.transactions.map((transaction) => ({ ...transaction, anomaly: null })),
    };
    const model = await getOverviewModel({ getSnapshot: async () => snapshot } as unknown as FinancialRepository, DEMO_USER_ID);
    expect(model.alerts).toEqual([`${snapshot.tuitionObligations[0].installment} is due 2026-12-15`]);
    const resolved = { ...snapshot, tuitionObligations: snapshot.tuitionObligations.map((tuition) => ({ ...tuition, status: 'paid' as const })) };
    const cleared = await getOverviewModel({ getSnapshot: async () => resolved } as unknown as FinancialRepository, DEMO_USER_ID);
    expect(cleared.alerts).toEqual([]);
  });

  it.each([
    ['7', 65_000n, 455_000n], ['7.12345678', 100_000_000n, 712_345_678n], ['7.12345678901234567890', 100_000_000n, 712_345_679n],
  ])('accepts persistence-valid direct FX rate %s', async (rate, amountMinor, expected) => {
    const seed = createSeedSnapshot('v1');
    const snapshot = { ...seed,
      accounts: seed.accounts.map((account) => account.currency === 'USD' ? { ...account, balance: { ...account.balance, amountMinor } } : account),
      exchangeRates: seed.exchangeRates.map((fx) => fx.base === 'USD' ? { ...fx, rate } : fx),
    };
    const overview = await getOverviewModel({ getSnapshot: async () => snapshot } as unknown as FinancialRepository, DEMO_USER_ID);
    expect(overview.accountBalances.find((account) => account.label.startsWith('USD'))!.reportingAmount.amountMinor).toBe(expected);
  });

  it.each([['2000', 50_000_000_000_000n], ['2000.00000001', 49_999_999_999_750n]])('accepts persistence-valid inverse FX rate %s', async (rate, expected) => {
    const seed = createSeedSnapshot('v1');
    const snapshot = { ...seed,
      accounts: seed.accounts.map((account) => account.currency === 'IDR' ? { ...account, balance: { ...account.balance, amountMinor: 1_000_000_000_000_000n } } : account),
      exchangeRates: seed.exchangeRates.map((fx) => fx.quote === 'IDR' ? { ...fx, rate } : fx),
    };
    const overview = await getOverviewModel({ getSnapshot: async () => snapshot } as unknown as FinancialRepository, DEMO_USER_ID);
    expect(overview.accountBalances.find((account) => account.label.startsWith('IDR'))!.reportingAmount.amountMinor).toBe(expected);
  });

  it.each(['0', '0.000000', '0.00000000', '-7.1', '1e2', '7.', '.1', ' 7', 'NaN'])('rejects persistence-invalid FX rate %s', async (rate) => {
    const seed = createSeedSnapshot('v1');
    const snapshot = { ...seed, exchangeRates: seed.exchangeRates.map((fx) => fx.base === 'USD' ? { ...fx, rate } : fx) };
    await expect(getOverviewModel({ getSnapshot: async () => snapshot } as unknown as FinancialRepository, DEMO_USER_ID)).rejects.toThrow(/exchange rate/i);
  });

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
    expect(overview.budget.categories).toHaveLength(6);
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
