import type { FinancialSnapshot } from '../../domain/entities';
import { referenceConversion } from '../demo/planning-helpers';

export type MembershipHabits = Readonly<{
  monthsWithinBudget: number;
  savingsStreak: number;
  emergencyFundBasisPoints: number;
}>;

// Illustrative habit milestones for this simulator, not a real bank offer.
export const MEMBERSHIP_TIERS = [
  { name: 'Bronze', key: 'bronze', minimumPoints: 0 },
  { name: 'Silver', key: 'silver', minimumPoints: 25 },
  { name: 'Gold', key: 'gold', minimumPoints: 60 },
  { name: 'Platinum', key: 'platinum', minimumPoints: 100 },
  { name: 'VIP', key: 'vip', minimumPoints: 160 },
] as const;
export type MembershipTier = typeof MEMBERSHIP_TIERS[number];

function bounded(value: number, maximum: number) {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(0, Math.floor(value))) : 0;
}

export function getMembership(habits: MembershipHabits) {
  const points = bounded(habits.monthsWithinBudget, 12) * 10
    + bounded(habits.savingsStreak, 12) * 10
    + Math.floor(bounded(habits.emergencyFundBasisPoints, 10_000) / 500);
  const index = MEMBERSHIP_TIERS.findLastIndex(tier => points >= tier.minimumPoints);
  const current = MEMBERSHIP_TIERS[index];
  const next = MEMBERSHIP_TIERS[index + 1] ?? null;
  return {
    current, next, index, points,
    remainingPoints: next ? next.minimumPoints - points : 0,
    progress: next ? (points - current.minimumPoints) * 100 / (next.minimumPoints - current.minimumPoints) : 100,
  };
}

/** Only observed records count: an open budget month is not a completed habit. */
export function getMembershipHabits(snapshot: FinancialSnapshot): MembershipHabits {
  const owner=snapshot.users[0]?.id;
  const currentMonth = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).format(new Date(snapshot.asOf));
  const budgets = new Map<string, { limit: bigint; actual: bigint }>();
  for (const budget of snapshot.budgets) {
    if (budget.ownerId!==owner || budget.month >= currentMonth) continue;
    const month = budgets.get(budget.month) ?? { limit: 0n, actual: 0n };
    month.limit += referenceConversion(budget.limit, 'CNY', snapshot.exchangeRates).amount.amountMinor;
    month.actual += referenceConversion(budget.actualSpend, 'CNY', snapshot.exchangeRates).amount.amountMinor;
    budgets.set(budget.month, month);
  }
  const savingsIds = new Set(snapshot.accounts.filter(a => a.ownerId===owner && a.type === 'savings').map(a => a.id));
  const savingMonths = new Set(snapshot.transactions.filter(t => savingsIds.has(t.accountId)
    && t.direction === 'credit' && t.classification === 'internal-transfer' && t.amount.amountMinor > 0n
    && Date.parse(t.occurredAt) <= Date.parse(snapshot.asOf)).map(t => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).format(new Date(t.occurredAt))));
  let month = [...savingMonths].sort().at(-1);
  const [currentYear,currentNumber]=currentMonth.split('-').map(Number);
  const previousMonth=new Date(Date.UTC(currentYear,currentNumber-2,1)).toISOString().slice(0,7);
  if(month && month<previousMonth)month=undefined;
  let savingsStreak = 0;
  while (month && savingMonths.has(month)) {
    savingsStreak++;
    const [year, monthNumber] = month.split('-').map(Number);
    const previous = new Date(Date.UTC(year, monthNumber - 2, 1));
    month = previous.toISOString().slice(0, 7);
  }
  const emergency = snapshot.accounts.find(a => a.ownerId===owner && a.status === 'active' && a.type === 'savings' && a.goal);
  const emergencyFundBasisPoints = emergency?.goal && emergency.goal.amountMinor > 0n
    && emergency.balance.currency === emergency.goal.currency
    ? Number(emergency.balance.amountMinor >= emergency.goal.amountMinor ? 10_000n
      : emergency.balance.amountMinor <= 0n ? 0n
        : emergency.balance.amountMinor * 10_000n / emergency.goal.amountMinor) : 0;
  return {
    monthsWithinBudget: [...budgets.values()].filter(b => b.limit > 0n && b.actual <= b.limit).length,
    savingsStreak,
    emergencyFundBasisPoints: bounded(emergencyFundBasisPoints, 10_000),
  };
}
