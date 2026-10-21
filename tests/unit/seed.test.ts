import { describe, expect, it } from 'vitest';
import { createSeedSnapshot, normalizeDemoSnapshot } from '../../src/demo/seed';
import { fromFinancialSnapshotDTO, toFinancialSnapshotDTO } from '../../src/domain/financial-snapshot-dto';

describe('versioned demo seed', () => {
  it('preserves the six-category CNY 5200 budget and shopping baseline used by agent calculations', () => {
    const snapshot = createSeedSnapshot('v1');
    expect(snapshot.budgets.map(({ category, limit, actualSpend }) => ({ category, limit, actualSpend })))
      .toEqual([
        { category: 'rent', limit: { amountMinor: 280000n, currency: 'CNY' }, actualSpend: { amountMinor: 280000n, currency: 'CNY' } },
        { category: 'food', limit: { amountMinor: 125000n, currency: 'CNY' }, actualSpend: { amountMinor: 125000n, currency: 'CNY' } },
        { category: 'transportation', limit: { amountMinor: 26000n, currency: 'CNY' }, actualSpend: { amountMinor: 26000n, currency: 'CNY' } },
        { category: 'shopping', limit: { amountMinor: 58000n, currency: 'CNY' }, actualSpend: { amountMinor: 58000n, currency: 'CNY' } },
        { category: 'other', limit: { amountMinor: 16000n, currency: 'CNY' }, actualSpend: { amountMinor: 16000n, currency: 'CNY' } },
        { category: 'subscriptions', limit: { amountMinor: 15000n, currency: 'CNY' }, actualSpend: { amountMinor: 15000n, currency: 'CNY' } },
      ]);
    expect(snapshot.budgets.reduce((sum, budget) => sum + budget.actualSpend.amountMinor, 0n)).toBe(520000n);
    for (const budget of snapshot.budgets) {
      const expenses = snapshot.transactions.filter((transaction) =>
        transaction.category === budget.category && transaction.direction === 'debit' &&
        transaction.classification === 'consumption' && transaction.occurredAt.startsWith(budget.month));
      expect(expenses.reduce((sum, expense) => sum + expense.amount.amountMinor, 0n)).toBe(budget.actualSpend.amountMinor);
    }
  });

  it('preserves account availability, emergency goal, tuition, and unused video renewal', () => {
    const snapshot = createSeedSnapshot('v1');
    expect(snapshot.accounts.map(({ type, currency, balance, availableBalance }) => ({ type, currency, balance, availableBalance })))
      .toEqual([
        { type: 'daily', currency: 'CNY', balance: { amountMinor: 1865000n, currency: 'CNY' }, availableBalance: { amountMinor: 1865000n, currency: 'CNY' } },
        { type: 'savings', currency: 'CNY', balance: { amountMinor: 1200000n, currency: 'CNY' }, availableBalance: { amountMinor: 1200000n, currency: 'CNY' } },
        { type: 'daily', currency: 'IDR', balance: { amountMinor: 2500000n, currency: 'IDR' }, availableBalance: { amountMinor: 2500000n, currency: 'IDR' } },
        { type: 'daily', currency: 'USD', balance: { amountMinor: 65000n, currency: 'USD' }, availableBalance: { amountMinor: 65000n, currency: 'USD' } },
        { type: 'daily', currency: 'SGD', balance: { amountMinor: 42000n, currency: 'SGD' }, availableBalance: { amountMinor: 42000n, currency: 'SGD' } },
      ]);
    expect(snapshot.accounts.find((account) => account.type === 'savings')?.goal).toEqual({ amountMinor: 1500000n, currency: 'CNY' });
    expect(snapshot.tuitionObligations[0]).toMatchObject({ amount: { amountMinor: 500000n, currency: 'CNY' }, paidAmount: { amountMinor: 0n, currency: 'CNY' }, status: 'unpaid' });
    expect(snapshot.subscriptions.find((subscription) => subscription.merchant === 'Campus Video')).toMatchObject({ amount: { amountMinor: 6800n, currency: 'CNY' }, cadence: 'monthly', lastUsageAt: null, status: 'active' });
  });

  it('supplies linked beneficiaries, cards, recurring income, asset movements, products, and fallback rates', () => {
    const snapshot = createSeedSnapshot('v1');
    expect(snapshot.users[0]).toMatchObject({ homeCurrency: 'IDR', profile: { nationality: 'Indonesian', institution: 'Fudan University', city: 'Shanghai' } });
    expect(snapshot.beneficiaries.length).toBeGreaterThanOrEqual(3);
    expect(snapshot.beneficiaries.some((beneficiary) => beneficiary.displayName === 'Zhang Wei')).toBe(true);
    expect(snapshot.cards.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.cards.some((card) => card.purpose === 'online-shopping' && card.cardType === 'virtual')).toBe(true);
    expect(snapshot.subscriptions.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.transactions.find((transaction) => transaction.category === 'family-allowance')).toMatchObject({ amount: { amountMinor: 10000000n, currency: 'IDR' }, originalCurrency: 'IDR', direction: 'credit', classification: 'income', recurrence: { cadence: 'monthly' } });
    expect(snapshot.transactions.some((transaction) => transaction.anomaly !== null)).toBe(true);
    const internal = snapshot.transactions.filter((transaction) => transaction.classification === 'internal-transfer');
    expect(internal).toHaveLength(2);
    expect(internal.map((transaction) => transaction.direction).sort()).toEqual(['credit', 'debit']);
    expect(internal[0].transferId).toBe(internal[1].transferId);
    expect(internal[0].amount).toEqual(internal[1].amount);
    expect(snapshot.transactions.some((transaction) => transaction.classification === 'asset-movement' && transaction.investmentOrderId !== null)).toBe(true);
    expect(snapshot.investmentProducts.map((product) => product.category)).toEqual(['money-market', 'bond', 'balanced', 'equity-index']);
    expect(snapshot.holdings.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.exchangeRates.length).toBeGreaterThan(0);
    expect(snapshot.exchangeRates.every((rate) => rate.source === 'fallback' && rate.referenceAt && rate.retrievedAt && /^\d+\.\d+$/.test(rate.rate))).toBe(true);
    const accountIds = new Set(snapshot.accounts.map((account) => account.id));
    expect(snapshot.transactions.every((transaction) => accountIds.has(transaction.accountId))).toBe(true);
    expect(snapshot.cards.every((card) => accountIds.has(card.accountId))).toBe(true);
    expect(snapshot.holdings.every((holding) => snapshot.investmentProducts.some((product) => product.id === holding.productId))).toBe(true);
  });

  it('uses unique stable UUIDs and fresh objects for each generation', () => {
    const first = createSeedSnapshot('v1');
    const second = createSeedSnapshot('v1');
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.accounts[0].balance).not.toBe(first.accounts[0].balance);
    const records = Object.values(first).flatMap((value) => Array.isArray(value) ? value : []);
    const ids = records.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true);
    expect(createSeedSnapshot('v2').seedVersion).toBe('v2');
  });

  it('round-trips every nested money field through a JSON-safe DTO without losing bigint precision', () => {
    const snapshot = createSeedSnapshot('v1');
    const dto = toFinancialSnapshotDTO(snapshot);
    expect(dto.accounts[0].balance).toEqual({ amountMinor: '1865000', currency: 'CNY' });
    expect(dto.tuitionObligations[0].amount.amountMinor).toBe('500000');
    expect(fromFinancialSnapshotDTO(JSON.parse(JSON.stringify(dto)))).toEqual(snapshot);
  });

  it('preserves structured JSON metadata that resembles money rather than converting it into domain bigint', () => {
    const seed = createSeedSnapshot('v1');
    const snapshot = {
      ...seed,
      accounts: [{ ...seed.accounts[0], balance: { amountMinor: 9007199254740993n, currency: 'CNY' as const } }],
      aiMessages: [{ id: '00000000-0000-4000-8000-000000000200', conversationId: '00000000-0000-4000-8000-000000000201', role: 'assistant' as const, content: 'Example', createdAt: seed.asOf, metadata: { amountMinor: '123', currency: 'CNY', context: 'keep as JSON' } }],
    };
    const dto = toFinancialSnapshotDTO(snapshot);
    expect(dto.accounts[0].balance.amountMinor).toBe('9007199254740993');
    expect(dto.aiMessages[0].metadata).toEqual({ amountMinor: '123', currency: 'CNY', context: 'keep as JSON' });
    expect(fromFinancialSnapshotDTO(JSON.parse(JSON.stringify(dto)))).toEqual(snapshot);
  });
});

it('updates the old saved demo name without changing financial activity',()=>{
 const original=createSeedSnapshot('v1');
 const saved={...original,users:original.users.map(user=>({...user,profile:{...user.profile,displayName:'Ayu Pratama'}}))};
 const migrated=normalizeDemoSnapshot(saved);
 expect(migrated.users[0].profile.displayName).toBe('Jim Pratama');
 expect(migrated.accounts).toEqual(saved.accounts);
 expect(migrated.transactions).toEqual(saved.transactions);
});
