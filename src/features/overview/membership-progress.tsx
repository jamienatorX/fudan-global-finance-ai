import { LocalizedDetails, LocalizedDiv, LocalizedLi, LocalizedOl, LocalizedP, LocalizedSpan, LocalizedStrong, LocalizedSummary, LocalizedUl } from '../../i18n/localized';
import { Check, ChevronDown, Crown } from 'lucide-react';
import { getMembership, MEMBERSHIP_TIERS, type MembershipHabits } from './membership';

export function MembershipBadge({ habits }: { habits: MembershipHabits }) {
  const { current } = getMembership(habits);
  return <LocalizedSpan className="membership-badge" data-tier={current.key}><Crown size={14} aria-hidden /><LocalizedSpan>{current.name} member</LocalizedSpan></LocalizedSpan>;
}

export function MembershipProgress({ habits }: { habits: MembershipHabits }) {
  const membership = getMembership(habits);
  return <LocalizedDiv className="membership-progress" role="group" aria-label="Membership progress">
    <LocalizedDiv className="membership-progress-heading"><LocalizedSpan>Your membership journey</LocalizedSpan><LocalizedStrong>{membership.next ? membership.next.name + ' next' : 'Highest tier reached'}</LocalizedStrong></LocalizedDiv>
    <LocalizedDiv className="membership-track" role="progressbar" aria-label={membership.next ? 'Progress to ' + membership.next.name : 'VIP membership'} aria-valuenow={membership.progress} aria-valuemin={0} aria-valuemax={100}><LocalizedSpan style={{ width: membership.progress + '%' }} /></LocalizedDiv>
    <LocalizedOl className="membership-steps" aria-label="Membership tiers">{MEMBERSHIP_TIERS.map((tier, index) => <LocalizedLi key={tier.key} data-state={index === membership.index ? 'current' : index < membership.index ? 'reached' : 'upcoming'} aria-current={index === membership.index ? 'step' : undefined}><LocalizedSpan className="membership-step-dot">{index < membership.index ? <Check size={10} aria-hidden /> : index === membership.index ? <Crown size={10} aria-hidden /> : null}</LocalizedSpan><LocalizedSpan>{tier.name}</LocalizedSpan></LocalizedLi>)}</LocalizedOl>
    <LocalizedP>{habits.monthsWithinBudget} months within budget · {habits.savingsStreak} month savings streak · {Math.round(habits.emergencyFundBasisPoints / 100)}% emergency fund goal</LocalizedP>
    <LocalizedP className="membership-next">{membership.next ? <>{membership.remainingPoints} habit points to {membership.next.name}</> : 'You’re at the top of the membership ladder.'}</LocalizedP>
    <LocalizedDetails className="membership-details"><LocalizedSummary>How tiers work<ChevronDown size={13} aria-hidden /></LocalizedSummary><LocalizedP>Earn 10 points per completed month within budget and per consecutive month saving (up to 12 months each), plus up to 20 points for your emergency fund goal. Only recorded months count. These illustrative tiers confer no banking privileges.</LocalizedP><LocalizedUl>{MEMBERSHIP_TIERS.map(tier => <LocalizedLi key={tier.key}><LocalizedSpan>{tier.name}</LocalizedSpan><LocalizedStrong>{tier.minimumPoints}+ points</LocalizedStrong></LocalizedLi>)}</LocalizedUl></LocalizedDetails>
  </LocalizedDiv>;
}
