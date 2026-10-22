import { getMembershipHabits, type MembershipHabits } from './membership';
import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from '../../domain/currency';
import type { Budget, Card, ExchangeRate, FinancialSnapshot, Subscription, Transaction, TuitionObligation } from '../../domain/entities';
import type { FinancialRepository } from '../../domain/financial-repository';
import { buildCashFlowSeries, type CashFlowDay } from './cash-flow-series';
import { money, type Money } from '../../domain/money';

const REPORTING_CURRENCY = 'CNY' as const;

export const overviewQueryKeys = {
  all: ['overview'] as const,
  summary: (userId: string) => ['overview', userId, 'summary'] as const,
};

export type OverviewModel = Readonly<{
  asOf: string;
  userName: string;
  cardholderName: string;
  cards: readonly Card[];
  membershipHabits: MembershipHabits;
  cashFlowHistory: readonly CashFlowDay[];
  totalNetWorth: Money;
  availableCash: Money;
  investedValue: Money;
  monthlyIncome: Money;
  monthlyExpenses: Money;
  monthlyCashFlow: Money;
  cashRunwayMonths: number;
  recurringIncome: Money;
  recurringReceived: Money;
  oneOffIncome: Money;
  netBurn: Money;
  netBurnRunwayMonths: number | null;
  postTuitionCash: Money;
  spendingHistoryInsufficient: boolean;
  alertDetails: readonly Readonly<{ id: string; title: string; amount: Money; date: string; baseline: Money | null; baselineLabel: string; href: string }>[];
  accountBalances: readonly Readonly<{ id: string; label: string; amount: Money; reportingAmount: Money }>[];
  selectedAccount: Readonly<{ id: string; label: string; amount: Money; reportingAmount: Money }> | null;
  spending: readonly Readonly<{ category: string; amount: Money; shareBasisPoints: number }>[];
  budget: Readonly<{ limit: Money; actual: Money; usedBasisPoints: number; categories: readonly Budget[] }>;
  subscriptions: Readonly<{ monthly: Money; annual: Money; active: readonly Subscription[]; unusedCount: number }>;
  tuition: Readonly<{ outstanding: Money; next: TuitionObligation | null }>;
  recentTransactions: readonly Transaction[];
  emergencyFund: Readonly<{ current: Money; goal: Money; progressBasisPoints: number }> | null;
  fxSource: Readonly<{ source: ExchangeRate['source']; provider: string; referenceAt: string }>;
  alerts: readonly string[];
  holdingsCount: number;
  forecast: readonly Readonly<{
    month: string;
    opening: Money;
    inflow: Money;
    recurringOutflow: Money;
    obligations: Money;
    closing: Money;
  }>[];
}>;

function parseRate(rate: string): Readonly<{ numerator: bigint; scale: bigint }> {
  // Match persistence's positive-decimal text contract without truncating scale.
  const match = /^(\d+)(?:\.(\d+))?$/.exec(rate);
  if (!match) throw new TypeError(`Unsupported exchange rate: ${rate}`);
  const fraction = match[2] ?? '';
  const numerator = BigInt(`${match[1]}${fraction}`);
  if (numerator <= 0n) throw new TypeError(`Unsupported exchange rate: ${rate}`);
  return { numerator, scale: 10n ** BigInt(fraction.length) };
}

function roundedDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('Exchange-rate denominator must be positive');
  return (numerator + denominator / 2n) / denominator;
}

function convertToCny(value: Money, rates: readonly ExchangeRate[]): Money {
  if (value.currency === REPORTING_CURRENCY) return value;
  const direct = rates.find((rate) => rate.base === value.currency && rate.quote === REPORTING_CURRENCY);
  const inverse = rates.find((rate) => rate.base === REPORTING_CURRENCY && rate.quote === value.currency);
  if (!direct && !inverse) throw new Error(`No seeded CNY reference rate for ${value.currency}`);

  const sourceScale = 10n ** BigInt(CURRENCY_MINOR_DIGITS[value.currency]);
  const targetScale = 10n ** BigInt(CURRENCY_MINOR_DIGITS[REPORTING_CURRENCY]);
  if (direct) {
    const rate = parseRate(direct.rate);
    return money(roundedDivide(value.amountMinor * rate.numerator * targetScale, sourceScale * rate.scale), REPORTING_CURRENCY);
  }
  const rate = parseRate(inverse!.rate);
  return money(roundedDivide(value.amountMinor * rate.scale * targetScale, sourceScale * rate.numerator), REPORTING_CURRENCY);
}

function sumMoney(values: readonly Money[], currency: CurrencyCode = REPORTING_CURRENCY): Money {
  return money(values.reduce((sum, value) => {
    if (value.currency !== currency) throw new TypeError('Cannot total mismatched currencies');
    return sum + value.amountMinor;
  }, 0n), currency);
}

function basisPoints(part: bigint, whole: bigint): number {
  if (whole <= 0n) return 0;
  return Number((part * 10_000n + whole / 2n) / whole);
}

function monthlyTransactions(snapshot: FinancialSnapshot): readonly Transaction[] {
  const month = snapshot.asOf.slice(0, 7);
  return snapshot.transactions.filter((transaction) => transaction.occurredAt.startsWith(month));
}

export function getOverviewAlerts(snapshot: FinancialSnapshot): readonly string[] {
  const nextTuition = snapshot.tuitionObligations.filter((tuition) => tuition.status !== 'paid').toSorted((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
  return [
    ...(nextTuition ? [`${nextTuition.installment} is due ${nextTuition.dueAt.slice(0, 10)}`] : []),
  ];
}

function normalizedMonthlySubscription(subscription: Subscription): Money {
  return subscription.cadence === 'monthly'
    ? subscription.amount
    : money((subscription.amount.amountMinor + 6n) / 12n, subscription.currency);
}

function nextMonth(month: string, offset: number): string {
  const [year, zeroBasedMonth] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, zeroBasedMonth - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function getOverviewModel(repository: FinancialRepository, userId: string, selectedAccountId?: string): Promise<OverviewModel> {
  const snapshot = await repository.getSnapshot(userId);
  const user = snapshot.users.find((candidate) => candidate.id === userId);
  if (!user) throw new Error('Overview user was not found');

  const activeAccounts = snapshot.accounts.filter((account) => account.status === 'active');
  const accountBalances = activeAccounts.map((account) => ({
    id: account.id,
    label: `${account.currency} ${account.type === 'daily' ? 'Daily account' : 'Savings account'}`,
    amount: account.balance,
    reportingAmount: convertToCny(account.balance, snapshot.exchangeRates),
  }));
  const selectedAccount = accountBalances.find((account) => account.id === selectedAccountId) ?? accountBalances[0] ?? null;
  const accountAssets = sumMoney(accountBalances.map((account) => account.reportingAmount));
  const availableCash = sumMoney(activeAccounts.map((account) => convertToCny(account.availableBalance, snapshot.exchangeRates)));
  const investedValue = sumMoney(snapshot.holdings.map((holding) => convertToCny(holding.simulatedValue, snapshot.exchangeRates)));
  const totalNetWorth = money(accountAssets.amountMinor + investedValue.amountMinor, REPORTING_CURRENCY);

  const monthTransactions = monthlyTransactions(snapshot);
  const income = monthTransactions.filter((transaction) => transaction.direction === 'credit' && transaction.classification === 'income');
  const expenses = monthTransactions.filter((transaction) => transaction.direction === 'debit' && transaction.classification === 'consumption');
  const monthlyIncome = sumMoney(income.map((transaction) => convertToCny(transaction.amount, snapshot.exchangeRates)));
  const monthlyExpenses = sumMoney(expenses.map((transaction) => convertToCny(transaction.amount, snapshot.exchangeRates)));
  const monthlyCashFlow = money(monthlyIncome.amountMinor - monthlyExpenses.amountMinor, REPORTING_CURRENCY);

  const spendingByCategory = new Map<string, bigint>();
  for (const transaction of expenses) {
    const converted = convertToCny(transaction.amount, snapshot.exchangeRates);
    spendingByCategory.set(transaction.category, (spendingByCategory.get(transaction.category) ?? 0n) + converted.amountMinor);
  }
  const spending = [...spendingByCategory].map(([category, amountMinor]) => ({
    category,
    amount: money(amountMinor, REPORTING_CURRENCY),
    shareBasisPoints: basisPoints(amountMinor, monthlyExpenses.amountMinor),
  })).sort((left, right) => Number(right.amount.amountMinor - left.amount.amountMinor));

  const reportingMonth = snapshot.asOf.slice(0, 7);
  const currentBudgets = snapshot.budgets.filter((budget) => budget.month === reportingMonth);
  const budgetLimit = sumMoney(currentBudgets.map((budget) => convertToCny(budget.limit, snapshot.exchangeRates)));
  const budgetActual = sumMoney(currentBudgets.map((budget) => convertToCny(budget.actualSpend, snapshot.exchangeRates)));
  const activeSubscriptions = snapshot.subscriptions.filter((subscription) => subscription.status === 'active');
  const subscriptionMonthly = sumMoney(activeSubscriptions.map((subscription) => convertToCny(normalizedMonthlySubscription(subscription), snapshot.exchangeRates)));
  const subscriptionAnnual = sumMoney(activeSubscriptions.map((subscription) => convertToCny(
    subscription.cadence === 'yearly' ? subscription.amount : money(subscription.amount.amountMinor * 12n, subscription.currency),
    snapshot.exchangeRates,
  )));
  const nextTuition = snapshot.tuitionObligations.filter((tuition) => tuition.status !== 'paid').toSorted((left, right) => left.dueAt.localeCompare(right.dueAt))[0] ?? null;
  const tuitionOutstanding = nextTuition ? money(convertToCny(nextTuition.amount, snapshot.exchangeRates).amountMinor - convertToCny(nextTuition.paidAmount, snapshot.exchangeRates).amountMinor, REPORTING_CURRENCY) : money(0n, REPORTING_CURRENCY);
  const recurringOutflow = monthlyExpenses.amountMinor;
  const postTuitionCash = money(availableCash.amountMinor > tuitionOutstanding.amountMinor ? availableCash.amountMinor - tuitionOutstanding.amountMinor : 0n, REPORTING_CURRENCY);
  const runwayTenths = recurringOutflow > 0n ? Number((postTuitionCash.amountMinor * 10n + recurringOutflow / 2n) / recurringOutflow) : 0;

  const savingsAccount = snapshot.accounts.find((account) => account.type === 'savings' && account.currency === REPORTING_CURRENCY && account.goal);
  const emergencyFund = savingsAccount?.goal ? {
    current: savingsAccount.balance,
    goal: savingsAccount.goal,
    progressBasisPoints: basisPoints(savingsAccount.balance.amountMinor, savingsAccount.goal.amountMinor),
  } : null;
  const fxReference = snapshot.exchangeRates[0];
  if (!fxReference) throw new Error('Overview requires a seeded FX reference');

  const recentTransactions = snapshot.transactions.toSorted((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id)).slice(0, 5);
  // Phase 1 has occurrence metadata, not stable recurrence-series IDs. Use only
  // the reporting month's observed income rather than replaying all history.
  const recurringIncome = sumMoney(monthTransactions
    .filter((transaction) => transaction.direction === 'credit' && transaction.classification === 'income' && transaction.recurrence)
    .map((transaction) => {
      const converted = convertToCny(transaction.amount, snapshot.exchangeRates);
      return transaction.recurrence?.cadence === 'yearly'
        ? money((converted.amountMinor + 6n) / 12n, REPORTING_CURRENCY)
        : converted;
    }));
  const recurringReceived = sumMoney(income.filter((transaction) => transaction.recurrence)
    .map((transaction) => convertToCny(transaction.amount, snapshot.exchangeRates)));
  const oneOffIncome = sumMoney(income.filter((transaction) => !transaction.recurrence)
    .map((transaction) => convertToCny(transaction.amount, snapshot.exchangeRates)));
  const netBurn = money(monthlyExpenses.amountMinor > recurringIncome.amountMinor
    ? monthlyExpenses.amountMinor - recurringIncome.amountMinor : 0n, REPORTING_CURRENCY);
  const netBurnRunwayMonths = netBurn.amountMinor > 0n
    ? Number((postTuitionCash.amountMinor * 10n + netBurn.amountMinor / 2n) / netBurn.amountMinor) / 10
    : null;
  let spendingHistoryInsufficient = false;
  const alertDetails = expenses.flatMap((transaction) => {
    const occurred = Date.parse(transaction.occurredAt);
    if(occurred>Date.parse(snapshot.asOf))return [];
    const observations = snapshot.transactions.filter(other => other.ownerId === userId
      && other.id !== transaction.id && other.direction === 'debit' && other.classification === 'consumption'
      && other.category === transaction.category && Date.parse(other.occurredAt) < occurred
      && Date.parse(other.occurredAt) >= occurred - 90 * 86400000);
    if (observations.length < 10) { spendingHistoryInsufficient = true; return []; }
    const amounts = observations.map(other => convertToCny(other.amount, snapshot.exchangeRates).amountMinor)
      .sort((a,b) => a < b ? -1 : a > b ? 1 : 0);
    const middle = Math.floor(amounts.length / 2);
    const median = amounts.length % 2 ? amounts[middle] : roundedDivide(amounts[middle-1]+amounts[middle],2n);
    const amount = convertToCny(transaction.amount, snapshot.exchangeRates);
    // Do not promote stored legacy flags. Require a positive historical median and >2x spend.
    if (median <= 0n || amount.amountMinor <= median * 2n) return [];
    const query = new URLSearchParams({ month: transaction.occurredAt.slice(0, 7), q: transaction.merchant,
      transaction: transaction.id, account: transaction.accountId, currency: transaction.amount.currency });
    return [{ id: transaction.id, title: `Unusual ${transaction.category} spending`, amount, date: transaction.occurredAt,
      baseline: money(median,REPORTING_CURRENCY), baselineLabel: `Median of ${observations.length} earlier category transactions (90-day window)`,
      href: `/transactions?${query.toString()}` }];
  });
  const alerts = [...getOverviewAlerts(snapshot), ...alertDetails.map(alert => alert.title)];
  let forecastOpening = availableCash.amountMinor;
  const forecast = Array.from({ length: 3 }, (_, index) => {
    const month = nextMonth(reportingMonth, index + 1);
    const obligations = sumMoney(snapshot.tuitionObligations
      .filter((tuition) => tuition.status !== 'paid' && tuition.dueAt.startsWith(month))
      .map((tuition) => money(
        convertToCny(tuition.amount, snapshot.exchangeRates).amountMinor - convertToCny(tuition.paidAmount, snapshot.exchangeRates).amountMinor,
        REPORTING_CURRENCY,
      )));
    const opening = money(forecastOpening, REPORTING_CURRENCY);
    const closing = money(opening.amountMinor + recurringIncome.amountMinor - budgetLimit.amountMinor - obligations.amountMinor, REPORTING_CURRENCY);
    forecastOpening = closing.amountMinor;
    return { month, opening, inflow: recurringIncome, recurringOutflow: budgetLimit, obligations, closing };
  });

  return {
    asOf: snapshot.asOf,
    userName: user.profile.displayName.split(' ')[0],
    cardholderName: user.profile.displayName,
    cards: snapshot.cards.filter(card => card.ownerId === userId),
    membershipHabits: getMembershipHabits(snapshot),
    cashFlowHistory: buildCashFlowSeries(snapshot),
    totalNetWorth,
    availableCash,
    investedValue,
    monthlyIncome,
    monthlyExpenses,
    monthlyCashFlow,
    cashRunwayMonths: runwayTenths / 10,
    recurringIncome,
    recurringReceived,
    oneOffIncome,
    netBurn,
    netBurnRunwayMonths,
    postTuitionCash,
    alertDetails,
    spendingHistoryInsufficient,
    accountBalances,
    selectedAccount,
    spending,
    budget: { limit: budgetLimit, actual: budgetActual, usedBasisPoints: basisPoints(budgetActual.amountMinor, budgetLimit.amountMinor), categories: currentBudgets },
    subscriptions: { monthly: subscriptionMonthly, annual: subscriptionAnnual, active: activeSubscriptions, unusedCount: activeSubscriptions.filter((subscription) => !subscription.lastUsageAt).length },
    tuition: { outstanding: tuitionOutstanding, next: nextTuition },
    recentTransactions,
    emergencyFund,
    fxSource: { source: fxReference.source, provider: fxReference.provider, referenceAt: fxReference.referenceAt },
    alerts,
    holdingsCount: snapshot.holdings.length,
    forecast,
  };
}
