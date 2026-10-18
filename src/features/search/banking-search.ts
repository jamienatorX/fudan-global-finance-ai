import type { FinancialSnapshot } from '../../domain/entities';
import { formatMoney } from '../../domain/money';

export type BankingSearchResult = Readonly<{
  id: string;
  category: 'Transactions' | 'Accounts' | 'Cards' | 'Subscriptions' | 'Budgets' | 'Transfers' | 'Beneficiaries' | 'Investments' | 'Tuition' | 'Audit';
  title: string;
  detail: string;
  href: string;
  keywords: string;
}>;
const encode = encodeURIComponent;
const route = (path: string, params: Record<string, string>) =>
  path + '?' + new URLSearchParams(params).toString();

/** In-memory, owner-restricted search of fictional finance records. No external requests. */
export function indexDemoBanking(snapshot: FinancialSnapshot): BankingSearchResult[] {
  const owner = snapshot.users[0]?.id;
  if (!owner) return [];
  const results: BankingSearchResult[] = [];
  const add = (category: BankingSearchResult['category'], id: string, title: string, detail: string, href: string, keywords = '') => {
    results.push({ category, id: category + ':' + id, title, detail, href, keywords: [category, title, detail, keywords].join(' ').toLocaleLowerCase() });
  };
  for (const a of snapshot.accounts.filter(a => a.ownerId === owner)) {
    add('Accounts', a.id, a.currency + ' ' + a.type + ' account', formatMoney(a.availableBalance) + ' · ' + a.status,
      route('/accounts', { account: a.id }), a.currency + ' wallet savings balance');
  }
  for (const t of snapshot.transactions.filter(t => t.ownerId === owner)) {
    add('Transactions', t.id, t.merchant, t.occurredAt.slice(0, 10) + ' · ' + t.category + ' · ' + formatMoney(t.amount),
      route('/transactions', { q: t.merchant, currency: t.amount.currency, month: t.occurredAt.slice(0, 7), account: t.accountId }),
      t.direction + ' ' + t.classification + ' ' + t.amount.currency);
  }
  for (const b of snapshot.beneficiaries.filter(b => b.ownerId === owner)) {
    add('Beneficiaries', b.id, b.displayName, b.verificationState + ' · ' + b.supportedCurrencies.join(', '),
      '/transfers', 'recipient payee');
  }
  for (const c of snapshot.cards.filter(c => c.ownerId === owner)) {
    add('Cards', c.id, c.purpose.replaceAll('-', ' ') + ' virtual card', c.maskedNumber + ' · ' + c.freezeState,
      '/cards', 'card freeze unfreeze limits');
  }
  for (const s of snapshot.subscriptions.filter(s => s.ownerId === owner)) {
    add('Subscriptions', s.id, s.merchant, s.status + ' · ' + formatMoney(s.amount) + '/' + s.cadence,
      '/subscriptions', 'recurring renewal cancel');
  }
  for (const b of snapshot.budgets.filter(b => b.ownerId === owner)) {
    add('Budgets', b.id, b.category + ' budget', b.month + ' · ' + formatMoney(b.limit),
      '/planner', 'monthly spending cap');
  }
  for (const t of snapshot.transfers.filter(t => t.ownerId === owner)) {
    add('Transfers', t.id, 'Transfer ' + formatMoney(t.amount), t.status + ' · ' + (t.receiptRef ?? t.createdAt.slice(0, 10)),
      '/transfers', 'receipt payment');
  }
  for (const t of snapshot.tuitionObligations.filter(t => t.ownerId === owner)) {
    add('Tuition', t.id, t.institution + ' ' + t.installment, t.status + ' · ' + formatMoney(t.amount),
      '/planner', 'school university payment');
  }
  for (const h of snapshot.holdings.filter(h => h.ownerId === owner)) {
    const product = snapshot.investmentProducts.find(p => p.id === h.productId);
    add('Investments', h.id, product?.name ?? 'Fictional holding', formatMoney(h.simulatedValue) + ' · demo only',
      '/wealth', 'portfolio fund wealth investment');
  }
  for (const e of snapshot.auditEvents.filter(e => e.ownerId === owner)) {
    add('Audit', e.id, e.eventType.replaceAll('.', ' '), e.outcome + ' · ' + e.occurredAt.slice(0, 10),
      '/audit', 'activity approval receipt');
  }
  return results;
}

export function searchBankingRecords(index: readonly BankingSearchResult[], query: string, limit = 8): BankingSearchResult[] {
  const parts = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const score = (item: BankingSearchResult) => {
    const t = item.title.toLocaleLowerCase();
    const cat = item.category.toLocaleLowerCase();
    return parts.reduce((points, word) => points + (t === word ? 8 : t.startsWith(word) ? 5 : t.includes(word) ? 3 : cat.includes(word) ? 2 : 1), 0);
  };
  return index.filter(row => parts.every(part => row.keywords.includes(part)))
    .toSorted((a, b) => score(b) - score(a) || a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
    .slice(0, Math.min(Math.max(limit, 0), 50));
}
