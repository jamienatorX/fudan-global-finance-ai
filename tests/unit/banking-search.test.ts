import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { indexDemoBanking, searchBankingRecords } from '../../src/features/search/banking-search';

describe('real global banking search', () => {
  const state = createSeedSnapshot('v1');
  const index = indexDemoBanking(state);

  it('finds transactions and links to the exact filtered account, currency and month', () => {
    const results = searchBankingRecords(index, 'Campus Dining');
    expect(results[0]).toMatchObject({ category: 'Transactions', title: 'Campus Dining' });
    const url = new URL(results[0].href, 'http://localhost');
    expect(url.pathname).toBe('/transactions');
    expect(url.searchParams.get('q')).toBe('Campus Dining');
    expect(url.searchParams.get('month')).toBe('2026-10');
    expect(url.searchParams.get('currency')).toBe('CNY');
  });

  it('searches accounts, cards, beneficiaries, subscriptions, budgets, investments, and audit', () => {
    const data: [string, string][] = [
      ['USD daily', 'Accounts'],
      ['online shopping virtual card', 'Cards'],
      ['Tencent Video VIP', 'Subscriptions'],
      ['QQ音乐', 'Subscriptions'],
      ['淘宝88VIP', 'Subscriptions'],
      ['shopping budget', 'Budgets'],
      ['Zhang Wei', 'Beneficiaries'],
      ['tuition', 'Tuition'],
      ['transfer', 'Transfers'],
      ['investment', 'Investments'],
      ['audit', 'Audit'],
    ];
    for (const [query, category] of data) {
      const result = searchBankingRecords(index, query);
      expect(result.some(item => item.category === category), 'Failed lookup: ' + query).toBe(true);
    }
  });

  it('prevents other-user rows from appearing in owner-restricted search', () => {
    const other = { ...state.transactions[0], id: 'foreign-row', ownerId: 'foreign-user', merchant: 'Private Other User Merchant' };
    const searchIndex = indexDemoBanking({ ...state, transactions: [...state.transactions, other] });
    expect(searchBankingRecords(searchIndex, 'Private Other User Merchant')).toEqual([]);
  });

  it('handles case-insensitive partial matching, ranked results and no matches', () => {
    expect(searchBankingRecords(index, 'camPUs')).not.toHaveLength(0);
    expect(searchBankingRecords(index, 'not-a-real-merchant')).toEqual([]);
    expect(searchBankingRecords(index, '  ')).toEqual([]);
    expect(searchBankingRecords(index, 'campus', 3)).toHaveLength(3);
    expect(index.some(item => item.keywords.includes('9999 9999 9999 9999'))).toBe(false);
  });
});
