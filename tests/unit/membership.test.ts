import { describe, expect, it } from 'vitest';
import { getMembership, getMembershipHabits } from '../../src/features/overview/membership';
import { money } from '../../src/domain/money';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { displayOverviewCurrency } from '../../src/features/overview/overview-currency';

const habits = (monthsWithinBudget = 0, savingsStreak = 0, emergencyFundBasisPoints = 0) => ({ monthsWithinBudget, savingsStreak, emergencyFundBasisPoints });

describe('simulated habit membership tiers', () => {
  it('assigns five tiers at illustrative habit thresholds', () => {
    for (const [input, name] of [[habits(), 'Bronze'], [habits(2, 0, 2500), 'Silver'], [habits(3, 3), 'Gold'], [habits(5, 5), 'Platinum'], [habits(8, 8), 'VIP']] as const) {
      expect(getMembership(input).current.name).toBe(name);
    }
    expect(getMembership(habits(2, 0, 2499)).current.name).toBe('Bronze');
  });
  it('calculates progress, caps contributions and handles invalid input', () => {
    expect(getMembership(habits(4, 4))).toMatchObject({ progress: 50, remainingPoints: 20, points: 80 });
    expect(getMembership(habits(99, 99, 99_999))).toMatchObject({ next: null, progress: 100, remainingPoints: 0, points: 260 });
    expect(getMembership(habits(-1, NaN, Infinity)).points).toBe(0);
  });
  it('counts grouped closed budget months without inventing missing months', async () => {
    const snapshot = await new DemoFinancialRepository().getSnapshot(DEMO_USER_ID);
    const budget = snapshot.budgets[0];
    const derived = getMembershipHabits({ ...snapshot, budgets: [
      { ...budget, month: '2026-08', limit: money(100n, 'CNY'), actualSpend: money(150n, 'CNY') },
      { ...budget, month: '2026-08', limit: money(100n, 'CNY'), actualSpend: money(40n, 'CNY') },
      { ...budget, month: '2026-09', limit: money(100n, 'CNY'), actualSpend: money(101n, 'CNY') },
      { ...budget, month: '2026-10', limit: money(100n, 'CNY'), actualSpend: money(0n, 'CNY') },
    ] });
    expect(derived.monthsWithinBudget).toBe(1);
  });
  it('counts consecutive savings credit months, deduplicates and stops at gaps', async () => {
    const snapshot = await new DemoFinancialRepository().getSnapshot(DEMO_USER_ID);
    const transfer = snapshot.transactions.find(t => t.direction === 'credit' && t.classification === 'internal-transfer')!;
    const transactions = ['2026-10', '2026-10', '2026-09', '2026-07'].map(month => ({ ...transfer, occurredAt: month + '-01T00:00:00.000Z' }));
    expect(getMembershipHabits({ ...snapshot, transactions }).savingsStreak).toBe(2);
    expect(getMembershipHabits({ ...snapshot, transactions: transactions.map(t => ({ ...t, classification: 'income' })) }).savingsStreak).toBe(0);
    expect(getMembershipHabits({ ...snapshot, transactions: transactions.filter(t => t.occurredAt.startsWith('2026-07')) }).savingsStreak).toBe(0);
  });
  it('ignores wealth size except the defined emergency goal ratio', async () => {
    const snapshot = await new DemoFinancialRepository().getSnapshot(DEMO_USER_ID);
    const original = getMembershipHabits(snapshot);
    const changed = { ...snapshot, accounts: snapshot.accounts.map(a => ({ ...a,
      balance: money(a.balance.amountMinor * 100n, a.balance.currency),
      goal: a.goal ? money(a.goal.amountMinor * 100n, a.goal.currency) : null,
    })), holdings: [] };
    expect(getMembershipHabits(changed)).toEqual(original);
    expect(getMembershipHabits({ ...snapshot, accounts: snapshot.accounts.map(a => ({ ...a, goal: null })) }).emergencyFundBasisPoints).toBe(0);
    expect(getMembershipHabits({ ...snapshot, accounts: snapshot.accounts.map(a => ({ ...a, goal: a.goal ? money(1n, a.goal.currency) : null })) }).emergencyFundBasisPoints).toBe(10000);
  });
  it('keeps membership stable when reporting currency changes', async () => {
    const repository = new DemoFinancialRepository();
    const model = await getOverviewModel(repository, DEMO_USER_ID);
    const snapshot = await repository.getSnapshot(DEMO_USER_ID);
    const displayed = displayOverviewCurrency(model, 'IDR', snapshot.exchangeRates);
    expect(displayed.membershipHabits).toEqual(model.membershipHabits);
    expect(getMembership(displayed.membershipHabits)).toEqual(getMembership(model.membershipHabits));
  });
});
