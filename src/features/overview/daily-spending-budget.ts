import type { FinancialSnapshot } from '../../domain/entities';
import { money } from '../../domain/money';
import { referenceConversion } from '../demo/planning-helpers';
import { shanghaiDate } from './safe-to-spend';

/** A monthly discretionary budget, separate from the cash available until payday. */
export function dailySpendingBudget(snapshot: FinancialSnapshot, at: string) {
  const today = shanghaiDate(at);
  const month = today.slice(0, 7);
  const owner = snapshot.users[0].id;
  const budgets = snapshot.budgets.filter(b => b.ownerId === owner && b.month === month && b.category !== 'rent' && b.category !== 'subscriptions');
  if (!budgets.length) return null;
  const convert = (value: Parameters<typeof referenceConversion>[0]) => referenceConversion(value, 'CNY', snapshot.exchangeRates).amount.amountMinor;
  const categories = new Set<string>(budgets.map(b => b.category));
  const limit = budgets.reduce((sum, b) => sum + convert(b.limit), 0n);
  const spent = snapshot.transactions.filter(t => t.ownerId === owner && t.direction === 'debit' && t.classification === 'consumption' && categories.has(t.category) && shanghaiDate(t.occurredAt).startsWith(month) && shanghaiDate(t.occurredAt) <= today)
    .reduce((sum, t) => sum + convert(t.amount), 0n);
  const remaining = limit > spent ? limit - spent : 0n;
  const [year, monthNumber, day] = today.split('-').map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() - day + 1;
  return { remaining: money(remaining, 'CNY'), perDay: money(remaining / BigInt(days), 'CNY'), days };
}
