import { Check, ChevronDown, Crown } from 'lucide-react';
import { getMembership, MEMBERSHIP_TIERS, type MembershipHabits } from './membership';

export function MembershipBadge({ habits }: { habits: MembershipHabits }) {
  const { current } = getMembership(habits);
  return <span className="membership-badge" data-tier={current.key}><Crown size={14} aria-hidden /><span>{current.name} member</span></span>;
}

export function MembershipProgress({ habits }: { habits: MembershipHabits }) {
  const membership = getMembership(habits);
  return <div className="membership-progress" role="group" aria-label="Membership progress">
    <div className="membership-progress-heading"><span>Your membership journey</span><strong>{membership.next ? membership.next.name + ' next' : 'Highest tier reached'}</strong></div>
    <div className="membership-track" role="progressbar" aria-label={membership.next ? 'Progress to ' + membership.next.name : 'VIP membership'} aria-valuenow={membership.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: membership.progress + '%' }} /></div>
    <ol className="membership-steps" aria-label="Membership tiers">{MEMBERSHIP_TIERS.map((tier, index) => <li key={tier.key} data-state={index === membership.index ? 'current' : index < membership.index ? 'reached' : 'upcoming'} aria-current={index === membership.index ? 'step' : undefined}><span className="membership-step-dot">{index < membership.index ? <Check size={10} aria-hidden /> : index === membership.index ? <Crown size={10} aria-hidden /> : null}</span><span>{tier.name}</span></li>)}</ol>
    <p>{habits.monthsWithinBudget} months within budget · {habits.savingsStreak} month savings streak · {Math.round(habits.emergencyFundBasisPoints / 100)}% emergency fund goal</p>
    <p className="membership-next">{membership.next ? <>{membership.remainingPoints} habit points to {membership.next.name}</> : 'You’re at the top of the membership ladder.'}</p>
    <details className="membership-details"><summary>How tiers work<ChevronDown size={13} aria-hidden /></summary><p>Earn 10 points per completed month within budget and per consecutive month saving (up to 12 months each), plus up to 20 points for your emergency fund goal. Only recorded months count. These illustrative tiers confer no banking privileges.</p><ul>{MEMBERSHIP_TIERS.map(tier => <li key={tier.key}><span>{tier.name}</span><strong>{tier.minimumPoints}+ points</strong></li>)}</ul></details>
  </div>;
}
