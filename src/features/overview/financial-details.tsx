import { LocalizedDd, LocalizedDetails, LocalizedDiv, LocalizedDl, LocalizedDt, LocalizedH2, LocalizedLi, LocalizedP, LocalizedProgress, LocalizedSmall, LocalizedSpan, LocalizedStrong, LocalizedSummary, LocalizedTime, LocalizedUl } from '../../i18n/localized';
import { LocalizedLink as Link } from '../../i18n/localized';
import { ArrowUpRight, CircleAlert } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/card';
import { formatMoney } from '../../domain/money';
import type { OverviewModel } from './overview-queries';

export function RunwayDetails({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel"><CardHeader title="Your cash runway" eyebrow="Planning assumptions" />
    <LocalizedDiv className="student-two-up">
      <LocalizedDiv><LocalizedP>Runway if income stops</LocalizedP><LocalizedStrong>{o.monthlyExpenses.amountMinor > 0n ? `${o.cashRunwayMonths.toFixed(1)} months` : 'No current spending'}</LocalizedStrong>
        <LocalizedDetails><LocalizedSummary>Show formula</LocalizedSummary><LocalizedP>max(0, available cash − upcoming tuition) ÷ monthly consumption. Current month consumption is a spending-rate estimate, not a guarantee.</LocalizedP><LocalizedP>{formatMoney(o.postTuitionCash)} ÷ {formatMoney(o.monthlyExpenses)} per month.</LocalizedP></LocalizedDetails></LocalizedDiv>
      <LocalizedDiv><LocalizedP>Runway with recurring income</LocalizedP><LocalizedStrong>{o.netBurnRunwayMonths === null ? 'No net burn' : `${o.netBurnRunwayMonths.toFixed(1)} months`}</LocalizedStrong>
        <LocalizedDetails><LocalizedSummary>Show formula</LocalizedSummary><LocalizedP>max(0, cash − tuition) ÷ max(0, monthly consumption − recurring monthly inflow). One-off income is excluded. When recurring inflow covers spending, there is no finite runway under these assumptions.</LocalizedP><LocalizedP>Recurring inflow {formatMoney(o.recurringIncome)}; monthly net burn {formatMoney(o.netBurn)}.</LocalizedP></LocalizedDetails></LocalizedDiv>
    </LocalizedDiv></Card>;
}

export function IncomeBreakdown({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel"><CardHeader title="Monthly cash flow" eyebrow="Recurring vs one-off" />
    <LocalizedDl className="student-key-values">
      <LocalizedDiv><LocalizedDt>Recurring income received</LocalizedDt><LocalizedDd>{formatMoney(o.recurringReceived)}</LocalizedDd></LocalizedDiv>
      <LocalizedDiv><LocalizedDt>One-off income received</LocalizedDt><LocalizedDd>{formatMoney(o.oneOffIncome)}</LocalizedDd></LocalizedDiv>
      <LocalizedDiv><LocalizedDt>Total income</LocalizedDt><LocalizedDd>{formatMoney(o.monthlyIncome)}</LocalizedDd></LocalizedDiv>
      <LocalizedDiv><LocalizedDt>Consumption</LocalizedDt><LocalizedDd>−{formatMoney(o.monthlyExpenses)}</LocalizedDd></LocalizedDiv>
      <LocalizedDiv><LocalizedDt>Recorded net cash flow</LocalizedDt><LocalizedDd>{formatMoney(o.monthlyCashFlow)}</LocalizedDd></LocalizedDiv>
    </LocalizedDl><LocalizedP className="student-note">Recurring monthly estimate: {formatMoney(o.recurringIncome)}. A scholarship or other one-time receipt is not assumed to repeat.</LocalizedP></Card>;
}

export function EmergencyFundDetails({ overview: o }: { overview: OverviewModel }) {
  if (!o.emergencyFund) return null;
  const fund = o.emergencyFund;
  return <Card className="student-panel"><CardHeader title="Emergency fund" eyebrow="Your savings goal" />
    <LocalizedP className="student-amount">{(fund.progressBasisPoints / 100).toFixed(0)}% funded</LocalizedP>
    <LocalizedP className="student-note">{formatMoney(fund.current)} saved towards {formatMoney(fund.goal)}.</LocalizedP>
    <LocalizedP className="student-note">The target is the goal configured on your savings account. It is not automatically defined as three months of expenses.</LocalizedP>
    <LocalizedProgress className="student-progress" value={Number(fund.current.amountMinor)} max={Number(fund.goal.amountMinor) || 1} />
  </Card>;
}

export function FinancialAlerts({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel financial-alerts-panel" aria-label="Financial alerts">
    <LocalizedDiv className="financial-alerts-heading"><LocalizedSpan className="financial-alerts-icon"><CircleAlert size={23} aria-hidden /></LocalizedSpan><LocalizedDiv><LocalizedP className="invest-eyebrow">Worth a closer look</LocalizedP><LocalizedH2>Financial alerts</LocalizedH2></LocalizedDiv><LocalizedSpan className="financial-alerts-count">{o.alertDetails.length} to review</LocalizedSpan></LocalizedDiv>
    <LocalizedUl className="student-alerts">{o.alertDetails.map(alert => <LocalizedLi key={alert.id}>
      <Link href={alert.href + '#transaction-' + alert.id}>
        <LocalizedDiv className="financial-alert-title"><LocalizedStrong>{alert.title}</LocalizedStrong><ArrowUpRight size={19} aria-hidden /></LocalizedDiv>
        <LocalizedSpan className="financial-alert-amount">{formatMoney(alert.amount)}</LocalizedSpan><LocalizedTime dateTime={alert.date}>{alert.date.slice(0,10)}</LocalizedTime>
        <LocalizedSmall>{alert.baselineLabel}{alert.baseline ? `: ${formatMoney(alert.baseline)}` : ''}</LocalizedSmall>
        {alert.baseline && alert.amount.amountMinor <= alert.baseline.amountMinor ? <LocalizedSmall>Recorded flag; amount does not exceed this observed baseline.</LocalizedSmall> : null}
        <LocalizedSpan className="student-link">View transaction →</LocalizedSpan></Link>
    </LocalizedLi>)}{!o.alertDetails.length ? <LocalizedLi className="student-note">No flagged spending to review.</LocalizedLi> : null}</LocalizedUl>
  </Card>;
}
