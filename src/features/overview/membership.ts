import type { Money } from '../../domain/money';

// Illustrative membership bands for this simulator, not a real bank offer.
export const MEMBERSHIP_TIERS = [
  { name: 'Bronze', key: 'bronze', minimumMinor: 0n },
  { name: 'Silver', key: 'silver', minimumMinor: 500_000n },
  { name: 'Gold', key: 'gold', minimumMinor: 2_500_000n },
  { name: 'Platinum', key: 'platinum', minimumMinor: 10_000_000n },
  { name: 'VIP', key: 'vip', minimumMinor: 25_000_000n },
] as const;
export type MembershipTier = typeof MEMBERSHIP_TIERS[number];

export function getMembership(balance: Money) {
  if (balance.currency !== 'CNY') throw new Error('Membership must use the original CNY portfolio value.');
  const amount = balance.amountMinor < 0n ? 0n : balance.amountMinor;
  const index = MEMBERSHIP_TIERS.findLastIndex(tier => amount >= tier.minimumMinor);
  const current = MEMBERSHIP_TIERS[index];
  const next = MEMBERSHIP_TIERS[index + 1] ?? null;
  return {
    current, next, index,
    remainingMinor: next ? next.minimumMinor - amount : 0n,
    progress: next ? Number((amount - current.minimumMinor) * 10_000n / (next.minimumMinor - current.minimumMinor)) / 100 : 100,
  };
}
