'use client';
import { LocalizedDiv, LocalizedH2, LocalizedP, LocalizedSection } from '../../i18n/localized';
import { useDemo } from '../../demo/demo-context';
import { useDemoOverview } from './use-overview';
import { TuitionFxCard } from './tuition-fx-card';
import { AccountLink as Link } from '../../components/shell/account-link';
import { ForecastCard } from './overview-dashboard';
import { SpendingBreakdown } from './spending-breakdown';
import { CashFlowCurve } from './cash-flow-curve';
import { RunwayDetails, IncomeBreakdown, EmergencyFundDetails } from './financial-details';
import { PortfolioActivityPanel } from '../investing/portfolio-actions';
import { DashboardBankCard } from './dashboard-bank-card';
import { MembershipProgress, MembershipBadge } from './membership-progress';
import { getMembership, getMembershipHabits } from './membership';
import { Card, CardHeader } from '../../components/ui/card';
import { formatMoney } from '../../domain/money';

export function RelocatedDetails({ section }: { section: 'planner'|'wealth'|'cards'|'investing' }) {
  const o=useDemoOverview(); const {snapshot}=useDemo();
  if(!o)return <LocalizedP role="status">Loading details…</LocalizedP>;
  const habits=getMembershipHabits(snapshot);
  return <LocalizedDiv className="student-relocated-details">
    {section==='planner' ? <>
      <TuitionFxCard overview={o}/><Link href="/parent-summary" className="invest-button">Create parent summary</Link><RunwayDetails overview={o}/><ForecastCard overview={o}/><EmergencyFundDetails overview={o}/>
      <Card className="student-panel"><CardHeader title="Budget health" eyebrow="Current ledger month"/><LocalizedP className="student-amount">{Math.round(o.budget.usedBasisPoints/100)}% used</LocalizedP><LocalizedP className="student-note">{formatMoney(o.budget.actual)} of {formatMoney(o.budget.limit)}.</LocalizedP></Card>
      <LocalizedSection className="balance-hero student-habits"><LocalizedH2>Your financial habits</LocalizedH2><MembershipBadge habits={habits}/><MembershipProgress habits={habits}/></LocalizedSection>
    </> : null}
    {section==='wealth' ? <><IncomeBreakdown overview={o}/><CashFlowCurve history={o.cashFlowHistory}/><SpendingBreakdown overview={o}/></> : null}
    {section==='cards' ? <DashboardBankCard cards={o.cards} cardholderName={o.cardholderName} tier={getMembership(habits).current}/> : null}
    {section==='investing' ? <PortfolioActivityPanel/> : null}
  </LocalizedDiv>;
}
