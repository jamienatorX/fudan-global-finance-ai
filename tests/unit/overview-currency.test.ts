import { describe, expect, it } from 'vitest';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { displayOverviewCurrency } from '../../src/features/overview/overview-currency';

describe('changing display reporting currency',()=>{
  it('converts CNY consolidated values to all account currencies without mutating model',async()=>{
    const source=createSeedSnapshot('v1');
    const overview=await getOverviewModel(new DemoFinancialRepository(),DEMO_USER_ID);
    for(const currency of ['USD','SGD','IDR'] as const){
      const converted=displayOverviewCurrency(overview,currency,source.exchangeRates);
      expect(converted.availableCash.currency).toBe(currency);
      expect(converted.monthlyExpenses.currency).toBe(currency);
      expect(converted.totalNetWorth.currency).toBe(currency);
      expect(converted.spending.every(item=>item.amount.currency===currency)).toBe(true);
      expect(converted.forecast.every(item=>item.closing.currency===currency)).toBe(true);
      expect(converted.accountBalances.every(item=>item.reportingAmount.currency===currency)).toBe(true);
      expect(converted.accountBalances[0].amount.currency).toBe(overview.accountBalances[0].amount.currency);
      expect(overview.totalNetWorth.currency).toBe('CNY');
    }
  });
});
