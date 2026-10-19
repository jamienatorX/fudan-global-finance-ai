import { Check, ChevronDown, Crown } from 'lucide-react';
import { formatMoney, money, type Money } from '../../domain/money';
import { getMembership, MEMBERSHIP_TIERS } from './membership';

export function MembershipBadge({ balance }: { balance: Money }) {
  const { current } = getMembership(balance);
  return <span className="membership-badge" data-tier={current.key}><Crown size={14} aria-hidden /><span>{current.name} member</span></span>;
}

export function MembershipProgress({ balance }: { balance: Money }) {
  const membership = getMembership(balance);
  return <div className="membership-progress" role="group" aria-label="Membership progress">
    <div className="membership-progress-heading"><span>Your membership journey</span><strong>{membership.next ? membership.next.name + ' next' : 'Highest tier reached'}</strong></div>
    <div className="membership-track" role="progressbar" aria-label={membership.next ? 'Progress to ' + membership.next.name : 'VIP membership'} aria-valuenow={membership.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: membership.progress + '%' }} /></div>
    <ol className="membership-steps" aria-label="Membership tiers">{MEMBERSHIP_TIERS.map((tier, index) => <li key={tier.key} data-state={index === membership.index ? 'current' : index < membership.index ? 'reached' : 'upcoming'} aria-current={index === membership.index ? 'step' : undefined}><span className="membership-step-dot">{index < membership.index ? <Check size={10} aria-hidden /> : index === membership.index ? <Crown size={10} aria-hidden /> : null}</span><span>{tier.name}</span></li>)}</ol>
    <p className="membership-next">{membership.next ? <>{formatMoney(money(membership.remainingMinor, 'CNY'))} to {membership.next.name}</> : 'You’re at the top of the membership ladder.'}</p>
    <details className="membership-details"><summary>How tiers work<ChevronDown size={13} aria-hidden /></summary><p>Based on your total portfolio value in CNY, including cash and investments. These are illustrative tiers for this simulation.</p><ul>{MEMBERSHIP_TIERS.map(tier => <li key={tier.key}><span>{tier.name}</span><strong>{formatMoney(money(tier.minimumMinor, 'CNY'))}+</strong></li>)}</ul></details>
  </div>;
}
