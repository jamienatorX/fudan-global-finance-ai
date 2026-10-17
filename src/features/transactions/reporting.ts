import type { CurrencyCode } from '../../domain/currency';
import type { ExpenseCategory, Transaction } from '../../domain/entities';
import { money, type Money } from '../../domain/money';

export type CategorySpend = Readonly<{ category: ExpenseCategory; amount: Money }>;
export type SpendingReport = Readonly<{
  period: string;
  comparisonPeriod: string;
  currency: CurrencyCode;
  income: Money;
  expenses: Money;
  netCashFlow: Money;
  categories: readonly CategorySpend[];
  recurringCount: number;
  anomalies: readonly Transaction[];
  comparison: Readonly<{
    status: 'available' | 'insufficient-data';
    priorIncome: Money;
    priorExpenses: Money;
    expenseChangeBasisPoints: number | null;
  }>;
}>;

function validateMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new TypeError('Month must use YYYY-MM');
}

function relevant(rows: readonly Transaction[], period: string, currency: CurrencyCode, accountId?: string) {
  return rows.filter((row) =>
    row.occurredAt.startsWith(period + '-') &&
    row.amount.currency === currency &&
    (!accountId || row.accountId === accountId));
}

function totals(rows: readonly Transaction[]) {
  const income = rows.filter((row) => row.direction === 'credit' && row.classification === 'income')
    .reduce((sum, row) => sum + row.amount.amountMinor, 0n);
  const expenses = rows.filter((row) => row.direction === 'debit' && row.classification === 'consumption')
    .reduce((sum, row) => sum + row.amount.amountMinor, 0n);
  return { income, expenses };
}

export function buildSpendingReport(
  transactions: readonly Transaction[],
  period: string,
  comparisonPeriod: string,
  currency: CurrencyCode = 'CNY',
  accountId?: string,
): SpendingReport {
  validateMonth(period);
  validateMonth(comparisonPeriod);
  const currentRows = relevant(transactions, period, currency, accountId);
  const priorRows = relevant(transactions, comparisonPeriod, currency, accountId);
  const current = totals(currentRows);
  const prior = totals(priorRows);
  const spendingRows = currentRows.filter((row) => row.direction === 'debit' && row.classification === 'consumption');
  const byCategory = new Map<ExpenseCategory, bigint>();
  for (const row of spendingRows) {
    const category = row.category as ExpenseCategory;
    byCategory.set(category, (byCategory.get(category) ?? 0n) + row.amount.amountMinor);
  }
  const categories = [...byCategory.entries()]
    .map(([category, amountMinor]) => ({ category, amount: money(amountMinor, currency) }))
    .sort((a, b) => a.amount.amountMinor === b.amount.amountMinor ? a.category.localeCompare(b.category)
      : a.amount.amountMinor > b.amount.amountMinor ? -1 : 1);

  // Percentage changes are undefined when the previous period has no eligible financial activity.
  // In particular, zero prior spending must never become an invented 100% increase.
  const comparable = prior.income !== 0n || prior.expenses !== 0n;
  const expenseChangeBasisPoints = prior.expenses > 0n
    ? Number(((current.expenses - prior.expenses) * 10_000n) / prior.expenses)
    : null;
  return {
    period, comparisonPeriod, currency,
    income: money(current.income, currency),
    expenses: money(current.expenses, currency),
    netCashFlow: money(current.income - current.expenses, currency),
    categories,
    recurringCount: currentRows.filter((row) => row.recurrence !== null && (row.classification === 'income' || row.classification === 'consumption')).length,
    anomalies: spendingRows.filter((row) => Boolean(row.anomaly)),
    comparison: {
      status: comparable ? 'available' : 'insufficient-data',
      priorIncome: money(prior.income, currency),
      priorExpenses: money(prior.expenses, currency),
      expenseChangeBasisPoints: comparable ? expenseChangeBasisPoints : null,
    },
  };
}
