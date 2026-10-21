import { translateText } from '../../i18n/translate';
import type { BankingState, TableItem } from '../../server/secure-banking';

export type PrivateBankingSearchResult = Readonly<{
  id: string; category: string; title: string; detail: string;
  tab: 'overview' | 'transfers' | 'cards' | 'budgets' | 'subscriptions' | 'wealth' | 'activity';
}>;
/** Searches only the signed-in user's RLS-filtered snapshot; does not query or expose other tenants. */
export function searchPrivateBanking(state: BankingState, raw: string, cap = 12): PrivateBankingSearchResult[] {
  const terms = raw.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length || !state.enrolled) return [];
  const entries: PrivateBankingSearchResult[] = [];
  function add(tab: PrivateBankingSearchResult['tab'], category: string, rows: TableItem[],
    title: (v: TableItem) => string, detail: (v: TableItem) => string) {
    for (const row of rows) {
      entries.push({ id: category + String(row.id), tab, category, title: title(row), detail: detail(row) });
    }
  }
  add('overview', 'Account', state.accounts, r => String(r.label), r => String(r.currency) + ' account');
  add('transfers', 'Transfer ledger', state.ledger, r => String(r.label), r => String(r.classification) + ' · ' + String(r.currency));
  add('cards', 'Virtual card', state.cards, r => String(r.label), r => (r.frozen ? 'Frozen' : 'Active') + ' · ' + String(r.masked_number));
  add('budgets', 'Budget', state.budgets, r => String(r.category) + ' budget', r => 'Monthly spending cap');
  add('budgets', 'Tuition', state.tuition, r => String(r.label), r => r.paid ? 'Paid' : 'Outstanding');
  add('subscriptions', 'Subscription', state.subscriptions, r => String(r.merchant), r => r.active ? 'Active recurring charge' : 'Cancelled');
  add('wealth', 'Investment', state.products, r => String(r.name), r => String(r.risk) + ' risk');
  add('activity', 'Audit', state.audit, r => String(r.event), r => String(r.created_at).slice(0, 10));
  return entries.filter(e => terms.every(term => [e.category,e.title,e.detail,translateText(e.category,'zh-CN'),translateText(e.title,'zh-CN'),translateText(e.detail,'zh-CN')].join(' ').toLocaleLowerCase().includes(term)))
    .toSorted((a,b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
    .slice(0, Math.max(0, Math.min(cap, 50)));
}
