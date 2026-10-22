import { describe, expect, it } from 'vitest';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import type { FinancialSnapshot } from '../../src/domain/entities';
import type { FinancialRepository } from '../../src/domain/financial-repository';
import { getOverviewModel } from '../../src/features/overview/overview-queries';

const overview = (snapshot: FinancialSnapshot) => getOverviewModel({ getSnapshot: async () => snapshot } as unknown as FinancialRepository, DEMO_USER_ID);

describe('student finance calculations', () => {
  it('preserves seeded balances and forecasts while separating received income from normalized recurring income', async () => {
    const seed = createSeedSnapshot('v1');
    const model = await overview(seed);
    expect(model.availableCash.amountMinor).toBe(3_866_936n);
    expect(model.totalNetWorth.amountMinor).toBe(4_020_136n);
    expect(model.cashRunwayMonths).toBe(6.5);
    expect(model.forecast.map(point => point.closing.amountMinor)).toEqual([3_301_481n, 3_236_026n, 3_170_571n]);
    expect(model.recurringIncome.amountMinor).toBe(454_545n);
    expect(model.recurringReceived.amountMinor + model.oneOffIncome.amountMinor).toBe(model.monthlyIncome.amountMinor);
    const historical = seed.transactions.find(transaction => transaction.recurrence && transaction.classification === 'income')!;
    const withHistory = await overview({ ...seed, transactions: [...seed.transactions, { ...historical, id: 'historical', occurredAt: '2026-09-01T00:00:00.000Z' }] });
    expect(withHistory.recurringIncome).toEqual(model.recurringIncome);
    expect(withHistory.recurringReceived).toEqual(model.recurringReceived);
  });

  it('does not increase net runway for one-off income', async () => {
    const seed = createSeedSnapshot('v1');
    const before = await overview(seed);
    const income = seed.transactions.find(transaction => transaction.classification === 'income')!;
    const after = await overview({ ...seed, transactions: [...seed.transactions, { ...income, id: 'one-off', recurrence: null, amount: { amountMinor: 900_000n, currency: 'CNY' } }] });
    expect(after.oneOffIncome.amountMinor).toBe(before.oneOffIncome.amountMinor + 900_000n);
    expect(after.netBurn).toEqual(before.netBurn);
    expect(after.netBurnRunwayMonths).toBe(before.netBurnRunwayMonths);
  });

  it('normalizes yearly income while retaining the full received amount', async () => {
    const seed = createSeedSnapshot('v1');
    const income = seed.transactions.find(transaction => transaction.classification === 'income')!;
    const model = await overview({ ...seed, transactions: [{ ...income, amount: { amountMinor: 120_000n, currency: 'CNY' }, recurrence: { cadence: 'yearly', nextOccurrenceAt: '2027-10-01T00:00:00.000Z' } }] });
    expect(model.recurringIncome.amountMinor).toBe(10_000n);
    expect(model.recurringReceived.amountMinor).toBe(120_000n);
    expect(model.netBurnRunwayMonths).toBeNull();
  });

  it('handles no expenses and income covering spending without a finite net runway', async () => {
    const seed = createSeedSnapshot('v1');
    const noExpenses = await overview({ ...seed, transactions: [] });
    expect(noExpenses.cashRunwayMonths).toBe(0);
    expect(noExpenses.netBurn.amountMinor).toBe(0n);
    expect(noExpenses.netBurnRunwayMonths).toBeNull();
    const covered = await overview({ ...seed, transactions: seed.transactions.map(transaction => transaction.classification === 'income' ? { ...transaction, amount: { amountMinor: 1_000_000n, currency: 'CNY' } } : transaction) });
    expect(covered.netBurn.amountMinor).toBe(0n);
    expect(covered.netBurnRunwayMonths).toBeNull();
  });

  it('clamps post-tuition cash and both finite runway calculations at zero', async () => {
    const seed = createSeedSnapshot('v1');
    const model = await overview({ ...seed, accounts: seed.accounts.map(account => ({ ...account, availableBalance: { ...account.availableBalance, amountMinor: -100n } })) });
    expect(model.postTuitionCash.amountMinor).toBe(0n);
    expect(model.cashRunwayMonths).toBe(0);
    expect(model.netBurnRunwayMonths).toBe(0);
  });

  it('does not promote legacy spending flags without enough historical evidence', async () => {
    const model = await overview(createSeedSnapshot('v1'));
    expect(model.alertDetails).toEqual([]);
    expect(model.spendingHistoryInsufficient).toBe(true);
    expect(model.alerts.some(a => /Shopping spike|Unusually large food/.test(a))).toBe(false);
  });

  it('uses earlier 90-day category medians and links to a supported unusual purchase', async () => {
    const seed = createSeedSnapshot('v1');
    const flagged = seed.transactions.find(t => t.anomaly)!;
    const history = Array.from({length:10}, (_,i) => ({ ...flagged, id: 'food-history-'+i, anomaly: null,
      occurredAt: '2026-09-'+String(i+1).padStart(2,'0')+'T08:00:00Z', amount: {...flagged.amount,amountMinor:i===9?100000n:2000n} }));
    const changed = {...flagged, merchant:'Food & café / 上海'};
    const model = await overview({...seed, transactions:[changed,...history]});
    const alert=model.alertDetails.find(a=>a.id===flagged.id)!;
    expect(alert.baseline?.amountMinor).toBe(2000n);
    expect(alert.baselineLabel).toBe('Median of 10 earlier category transactions (90-day window)');
    const url = new URL(alert.href,'https://example.test');
    expect(url.searchParams.get('q')).toBe(changed.merchant);
    expect(url.searchParams.get('transaction')).toBe(flagged.id);
    expect((await overview({...seed,transactions:[changed,...history.slice(0,9)]})).alertDetails).toEqual([]);
    const exactlyDouble={...changed,amount:{...changed.amount,amountMinor:4000n}};
    expect((await overview({...seed,transactions:[exactlyDouble,...history]})).alertDetails).toEqual([]);
    const ineligible=history.map((t,i)=>i===0?{...t,occurredAt:'2026-10-06T00:00:00Z'}:t);
    expect((await overview({...seed,transactions:[changed,...ineligible]})).alertDetails).toEqual([]);
  });
});
