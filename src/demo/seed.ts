import type { ExpenseCategory, FinancialSnapshot, Transaction } from '../domain/entities';
import { money } from '../domain/money';

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
export const DEFAULT_SEED_VERSION = 'v1';
const id = (value: number) => `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;
const ownerId = DEMO_USER_ID;
const asOf = '2026-10-14T00:00:00.000Z';
const cny = (minor: bigint) => money(minor, 'CNY');

/** Fixed dates and UUIDs are intentional: reset and server/client seed generation agree. */
export function createSeedSnapshot(seedVersion: string): FinancialSnapshot {
  const expenses: readonly [number, ExpenseCategory, bigint, string, number | null, string | null][] = [
    [101, 'rent', 280000n, 'Shanghai Student Housing', null, null],
    [102, 'food', 115000n, 'Campus Dining', null, null],
    [103, 'food', 10000n, 'Late-night Delivery', null, 'Unusually large food purchase'],
    [104, 'transportation', 26000n, 'Shanghai Transit', null, null],
    [105, 'shopping', 38000n, 'Campus Store', null, null],
    [106, 'shopping', 20000n, 'Online Marketplace', null, 'Shopping spike'],
    [107, 'subscriptions', 6800n, 'Campus Video', 50, null],
    [108, 'subscriptions', 1800n, 'Campus Music', 51, null],
    [109, 'subscriptions', 2400n, 'Campus Cloud', 52, null],
    [110, 'subscriptions', 4000n, 'Campus Study', 53, null],
    [111, 'other', 16000n, 'Campus Services', null, null],
  ];
  const expenseTransactions: Transaction[] = expenses.map(([number, category, amount, merchant, subscription, anomaly]) => ({
    id: id(number), ownerId, accountId: id(10), direction: 'debit', amount: cny(amount), originalCurrency: 'CNY',
    category, classification: 'consumption', merchant, occurredAt: '2026-10-05T08:00:00.000Z',
    recordedAt: '2026-10-05T08:00:00.000Z', transferId: null, investmentOrderId: null,
    subscriptionId: subscription === null ? null : id(subscription),
    recurrence: subscription === null ? null : { cadence: 'monthly', nextOccurrenceAt: '2026-11-05T08:00:00.000Z' }, anomaly,
  }));
  const transaction = (number: number, account: number, direction: 'credit' | 'debit', amount: Transaction['amount'],
    category: Transaction['category'], classification: Transaction['classification'], merchant: string,
    transferId: string | null = null, investmentOrderId: string | null = null): Transaction => ({
    id: id(number), ownerId, accountId: id(account), direction, amount, originalCurrency: amount.currency,
    category, classification, merchant, occurredAt: '2026-10-01T08:00:00.000Z', recordedAt: '2026-10-01T08:00:00.000Z',
    transferId, investmentOrderId, subscriptionId: null, recurrence: null, anomaly: null,
  });
  const metadata = (key: string, audit: number) => ({
    idempotencyKey: `seed:${seedVersion}:${key}`, initiatedBy: ownerId, planId: null, actionId: null,
    createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z', auditEventId: id(audit),
  });
  const budgetValues: readonly [ExpenseCategory, bigint][] = [
    ['rent', 280000n], ['food', 125000n], ['transportation', 26000n], ['shopping', 58000n], ['other', 16000n], ['subscriptions', 15000n],
  ];

  return {
    seedVersion, asOf,
    users: [{ id: ownerId, profile: { displayName: 'Jim Pratama', nationality: 'Indonesian', institution: 'Fudan University', city: 'Shanghai' }, homeCurrency: 'IDR', locale: 'en-US', riskProfileRef: 'demo-moderate' }],
    accounts: [
      { id: id(10), ownerId, type: 'daily', currency: 'CNY', balance: cny(1865000n), availableBalance: cny(1865000n), status: 'active', goal: null },
      { id: id(11), ownerId, type: 'savings', currency: 'CNY', balance: cny(1200000n), availableBalance: cny(1200000n), status: 'active', goal: cny(1500000n) },
      { id: id(12), ownerId, type: 'daily', currency: 'IDR', balance: money(2500000n, 'IDR'), availableBalance: money(2500000n, 'IDR'), status: 'active', goal: null },
      { id: id(13), ownerId, type: 'daily', currency: 'USD', balance: money(65000n, 'USD'), availableBalance: money(65000n, 'USD'), status: 'active', goal: null },
      { id: id(14), ownerId, type: 'daily', currency: 'SGD', balance: money(42000n, 'SGD'), availableBalance: money(42000n, 'SGD'), status: 'active', goal: null },
    ],
    exchangeRates: [
      { id: id(20), base: 'CNY', quote: 'IDR', rate: '2200.000000', provider: 'Demo reference fixture (not live)', referenceAt: '2026-10-01T00:00:00.000Z', retrievedAt: asOf, source: 'fallback' },
      { id: id(21), base: 'USD', quote: 'CNY', rate: '7.100000', provider: 'Demo reference fixture (not live)', referenceAt: '2026-10-01T00:00:00.000Z', retrievedAt: asOf, source: 'fallback' },
      { id: id(22), base: 'SGD', quote: 'CNY', rate: '5.400000', provider: 'Demo reference fixture (not live)', referenceAt: '2026-10-01T00:00:00.000Z', retrievedAt: asOf, source: 'fallback' },
    ],
    beneficiaries: [
      { id: id(30), ownerId, displayName: 'Zhang Wei', phone: '+86 138 0000 0001', accountAlias: 'Demo Zhang CNY', supportedCurrencies: ['CNY'], verificationState: 'verified' },
      { id: id(31), ownerId, displayName: 'Sari Pratama', phone: '+62 812 0000 0002', accountAlias: 'Demo Family IDR', supportedCurrencies: ['IDR'], verificationState: 'verified' },
      { id: id(32), ownerId, displayName: 'Li Mei', phone: '+86 138 0000 0003', accountAlias: 'Demo Li CNY', supportedCurrencies: ['CNY', 'USD'], verificationState: 'verified' },
    ],
    transactions: [
      ...expenseTransactions,
      transaction(112, 10, 'credit', cny(2485000n), 'scholarship', 'income', 'Fictional Student Scholarship'),
      { ...transaction(113, 12, 'credit', money(10000000n, 'IDR'), 'family-allowance', 'income', 'Family Allowance'), recurrence: { cadence: 'monthly', nextOccurrenceAt: '2026-11-01T08:00:00.000Z' } },
      transaction(114, 10, 'debit', cny(50000n), 'transfer', 'internal-transfer', 'Savings Transfer', id(70)),
      transaction(115, 11, 'credit', cny(50000n), 'transfer', 'internal-transfer', 'Savings Transfer', id(70)),
      transaction(116, 10, 'debit', cny(50000n), 'investment', 'asset-movement', 'Demo Money Market Buy', null, id(71)),
      transaction(117, 12, 'debit', money(7500000n, 'IDR'), 'transfer', 'external-transfer', 'Family Remittance', id(72)),
    ],
    transfers: [
      { id: id(70), ownerId, sourceAccountId: id(10), destinationAccountId: id(11), beneficiaryId: null, tuitionObligationId: null, amount: cny(50000n), currency: 'CNY', scheduledAt: null, status: 'completed', receiptRef: 'DEMO-SAVINGS-001', ...metadata('savings-transfer', 90) },
      { id: id(72), ownerId, sourceAccountId: id(12), destinationAccountId: null, beneficiaryId: id(31), tuitionObligationId: null, amount: money(7500000n, 'IDR'), currency: 'IDR', scheduledAt: null, status: 'completed', receiptRef: 'DEMO-REMITTANCE-001', ...metadata('family-remittance', 92) },
    ],
    budgets: budgetValues.map(([category, amount], index) => ({ id: id(40 + index), ownerId, month: '2026-10', category, limit: cny(amount), actualSpend: cny(amount), currency: 'CNY', status: 'within-limit' })),
    cards: [
      { id: id(60), ownerId, accountId: id(10), maskedNumber: '•••• 1201', cardType: 'virtual', purpose: 'daily', freezeState: 'active', dailyLimit: cny(200000n), monthlyLimit: cny(800000n) },
      { id: id(61), ownerId, accountId: id(10), maskedNumber: '•••• 1202', cardType: 'virtual', purpose: 'online-shopping', freezeState: 'active', dailyLimit: cny(100000n), monthlyLimit: cny(300000n) },
    ],
    cardRestrictions: [{ id: id(62), cardId: id(61), merchantCategory: 'gambling', state: 'deny' }],
    subscriptions: [
      { id: id(50), ownerId, merchant: 'Campus Video', amount: cny(6800n), currency: 'CNY', cadence: 'monthly', nextRenewalAt: '2026-11-05T08:00:00.000Z', lastUsageAt: null, status: 'active' },
      { id: id(51), ownerId, merchant: 'Campus Music', amount: cny(1800n), currency: 'CNY', cadence: 'monthly', nextRenewalAt: '2026-11-05T08:00:00.000Z', lastUsageAt: '2026-10-13T08:00:00.000Z', status: 'active' },
      { id: id(52), ownerId, merchant: 'Campus Cloud', amount: cny(2400n), currency: 'CNY', cadence: 'monthly', nextRenewalAt: '2026-11-05T08:00:00.000Z', lastUsageAt: '2026-10-12T08:00:00.000Z', status: 'active' },
      { id: id(53), ownerId, merchant: 'Campus Study', amount: cny(4000n), currency: 'CNY', cadence: 'monthly', nextRenewalAt: '2026-11-05T08:00:00.000Z', lastUsageAt: '2026-10-14T00:00:00.000Z', status: 'active' },
    ],
    investmentProducts: [
      { id: id(80), name: 'Demo Campus Cash', fictional: true, category: 'money-market', simulatedRisk: 'low', feeBasisPoints: 10, liquidity: 'daily', historicalSimulation: { period: '2025 fictional simulation', returnBasisPoints: 180, drawdownBasisPoints: 5 }, disclaimer: 'Fictional simulation only; not an investment recommendation or guaranteed return.' },
      { id: id(81), name: 'Demo Campus Bond', fictional: true, category: 'bond', simulatedRisk: 'low', feeBasisPoints: 25, liquidity: 't-plus-2', historicalSimulation: { period: '2025 fictional simulation', returnBasisPoints: 320, drawdownBasisPoints: 180 }, disclaimer: 'Fictional simulation only; not an investment recommendation or guaranteed return.' },
      { id: id(82), name: 'Demo Campus Balanced', fictional: true, category: 'balanced', simulatedRisk: 'medium', feeBasisPoints: 40, liquidity: 't-plus-2', historicalSimulation: { period: '2025 fictional simulation', returnBasisPoints: 480, drawdownBasisPoints: 700 }, disclaimer: 'Fictional simulation only; not an investment recommendation or guaranteed return.' },
      { id: id(83), name: 'Demo Campus Equity Index', fictional: true, category: 'equity-index', simulatedRisk: 'high', feeBasisPoints: 30, liquidity: 't-plus-2', historicalSimulation: { period: '2025 fictional simulation', returnBasisPoints: 650, drawdownBasisPoints: 1800 }, disclaimer: 'Fictional simulation only; not an investment recommendation or guaranteed return.' },
    ],
    holdings: [
      { id: id(84), ownerId, productId: id(80), units: '500.000000', costBasis: cny(50000n), simulatedValue: cny(50000n) },
      { id: id(85), ownerId, productId: id(81), units: '1000.000000', costBasis: cny(100000n), simulatedValue: cny(103200n) },
    ],
    investmentOrders: [{ id: id(71), ownerId, productId: id(80), direction: 'buy', amount: cny(50000n), status: 'completed', ...metadata('money-market-buy', 91) }],
    tuitionObligations: [{ id: id(86), ownerId, institution: 'Fudan University', installment: 'Autumn installment', amount: cny(500000n), dueAt: '2026-11-01T00:00:00.000Z', paidAmount: cny(0n), status: 'unpaid' }],
    aiConversations: [], aiMessages: [], agentPlans: [], agentActions: [], approvalRecords: [],
    auditEvents: [
      { id: id(90), ownerId, eventType: 'transfer.completed', actorId: ownerId, targetId: id(70), beforeSummary: null, afterSummary: { receiptRef: 'DEMO-SAVINGS-001' }, outcome: 'success', correlationId: `seed:${seedVersion}:savings-transfer`, occurredAt: '2026-10-01T08:00:00.000Z' },
      { id: id(91), ownerId, eventType: 'investment-order.completed', actorId: ownerId, targetId: id(71), beforeSummary: null, afterSummary: { productId: id(80) }, outcome: 'success', correlationId: `seed:${seedVersion}:money-market-buy`, occurredAt: '2026-10-01T08:00:00.000Z' },
      { id: id(92), ownerId, eventType: 'transfer.completed', actorId: ownerId, targetId: id(72), beforeSummary: null, afterSummary: { receiptRef: 'DEMO-REMITTANCE-001' }, outcome: 'success', correlationId: `seed:${seedVersion}:family-remittance`, occurredAt: '2026-10-01T08:00:00.000Z' },
    ],
  };
}

/** Preserve saved activity while upgrading the demo profile and subscription categories. */
export function normalizeDemoSnapshot(snapshot: FinancialSnapshot): FinancialSnapshot {
  const transactions=snapshot.transactions.map(t=>t.subscriptionId && snapshot.subscriptions.some(s=>s.id===t.subscriptionId)?{...t,category:'subscriptions' as const}:t);
  const budgets=[...snapshot.budgets];
  for(const other of snapshot.budgets.filter(b=>b.category==='other'&&b.currency==='CNY')) {
    if(budgets.some(b=>b.ownerId===other.ownerId&&b.month===other.month&&b.category==='subscriptions'))continue;
    const actual=transactions.filter(t=>t.ownerId===other.ownerId&&t.amount.currency==='CNY'&&t.category==='subscriptions'&&t.direction==='debit'&&t.classification==='consumption'&&t.occurredAt.startsWith(other.month)).reduce((sum,t)=>sum+t.amount.amountMinor,0n);
    const portion=actual<other.actualSpend.amountMinor?actual:other.actualSpend.amountMinor;
    const cap=portion<other.limit.amountMinor?portion:other.limit.amountMinor;
    if(portion<=0n)continue;
    const newId=other.id.slice(0,-12)+'8'+other.id.slice(-11);
    if(budgets.some(b=>b.id===newId))continue;
    const index=budgets.findIndex(b=>b.id===other.id);
    budgets[index]={...other,limit:cny(other.limit.amountMinor-cap),actualSpend:cny(other.actualSpend.amountMinor-portion)};
    budgets.push({...other,id:newId,category:'subscriptions',limit:cny(cap),actualSpend:cny(portion),status:portion>cap?'over-limit':'within-limit'});
  }
  const users=snapshot.users.map(user=>user.id===DEMO_USER_ID&&user.profile.displayName==='Ayu Pratama'?{...user,profile:{...user.profile,displayName:'Jim Pratama'}}:user);
  return {...snapshot,users,transactions,budgets};
}
