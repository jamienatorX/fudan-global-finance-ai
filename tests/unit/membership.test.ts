import { describe, expect, it } from 'vitest';
import { getMembership } from '../../src/features/overview/membership';
import { money } from '../../src/domain/money';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { displayOverviewCurrency } from '../../src/features/overview/overview-currency';

describe('simulated membership tiers', () => {
  it('assigns all five tiers at their exact CNY thresholds', () => {
    for (const [minor, name] of [[0n, 'Bronze'], [500000n, 'Silver'], [2500000n, 'Gold'], [10000000n, 'Platinum'], [25000000n, 'VIP']] as const) {
      expect(getMembership(money(minor, 'CNY')).current.name).toBe(name);
      if (minor > 0n) expect(getMembership(money(minor - 1n, 'CNY')).current.name).not.toBe(name);
    }
    expect(() => getMembership(money(10000n, 'USD'))).toThrow(/CNY/);
  });
  it('calculates progress within a tier and handles the highest tier', () => {
    const gold = getMembership(money(6250000n, 'CNY'));
    expect(gold.next?.name).toBe('Platinum');
    expect(gold.progress).toBe(50);
    expect(gold.remainingMinor).toBe(3750000n);
    expect(getMembership(money(99999999999n, 'CNY'))).toMatchObject({ next: null, progress: 100, remainingMinor: 0n });
  });
  it('keeps membership stable when reporting currency changes', async () => {
    const repository = new DemoFinancialRepository();
    const model = await getOverviewModel(repository, DEMO_USER_ID);
    const snapshot = await repository.getSnapshot(DEMO_USER_ID);
    const displayed = displayOverviewCurrency(model, 'IDR', snapshot.exchangeRates);
    expect(displayed.membershipBalanceCny).toEqual(model.totalNetWorth);
    expect(getMembership(displayed.membershipBalanceCny).current.name).toBe('Gold');
  });
});
