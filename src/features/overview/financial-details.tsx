import Link from 'next/link';
import { ArrowUpRight, CircleAlert } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/card';
import { formatMoney } from '../../domain/money';
import type { OverviewModel } from './overview-queries';

export function RunwayDetails({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel"><CardHeader title="Your cash runway" eyebrow="Planning assumptions" />
    <div className="student-two-up">
      <div><p>Runway if income stops</p><strong>{o.monthlyExpenses.amountMinor > 0n ? `${o.cashRunwayMonths.toFixed(1)} months` : 'No current spending'}</strong>
        <details><summary>Show formula</summary><p>max(0, available cash − upcoming tuition) ÷ monthly consumption. Current month consumption is a spending-rate estimate, not a guarantee.</p><p>{formatMoney(o.postTuitionCash)} ÷ {formatMoney(o.monthlyExpenses)} per month.</p></details></div>
      <div><p>Runway with recurring income</p><strong>{o.netBurnRunwayMonths === null ? 'No net burn' : `${o.netBurnRunwayMonths.toFixed(1)} months`}</strong>
        <details><summary>Show formula</summary><p>max(0, cash − tuition) ÷ max(0, monthly consumption − recurring monthly inflow). One-off income is excluded. When recurring inflow covers spending, there is no finite runway under these assumptions.</p><p>Recurring inflow {formatMoney(o.recurringIncome)}; monthly net burn {formatMoney(o.netBurn)}.</p></details></div>
    </div></Card>;
}

export function IncomeBreakdown({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel"><CardHeader title="Monthly cash flow" eyebrow="Recurring vs one-off" />
    <dl className="student-key-values">
      <div><dt>Recurring income received</dt><dd>{formatMoney(o.recurringReceived)}</dd></div>
      <div><dt>One-off income received</dt><dd>{formatMoney(o.oneOffIncome)}</dd></div>
      <div><dt>Total income</dt><dd>{formatMoney(o.monthlyIncome)}</dd></div>
      <div><dt>Consumption</dt><dd>−{formatMoney(o.monthlyExpenses)}</dd></div>
      <div><dt>Recorded net cash flow</dt><dd>{formatMoney(o.monthlyCashFlow)}</dd></div>
    </dl><p className="student-note">Recurring monthly estimate: {formatMoney(o.recurringIncome)}. A scholarship or other one-time receipt is not assumed to repeat.</p></Card>;
}

export function EmergencyFundDetails({ overview: o }: { overview: OverviewModel }) {
  if (!o.emergencyFund) return null;
  const fund = o.emergencyFund;
  return <Card className="student-panel"><CardHeader title="Emergency fund" eyebrow="Your savings goal" />
    <p className="student-amount">{(fund.progressBasisPoints / 100).toFixed(0)}% funded</p>
    <p className="student-note">{formatMoney(fund.current)} saved towards {formatMoney(fund.goal)}.</p>
    <p className="student-note">The target is the goal configured on your savings account. It is not automatically defined as three months of expenses.</p>
    <progress className="student-progress" value={Number(fund.current.amountMinor)} max={Number(fund.goal.amountMinor) || 1} />
  </Card>;
}

export function FinancialAlerts({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel financial-alerts-panel" aria-label="Financial alerts">
    <div className="financial-alerts-heading"><span className="financial-alerts-icon"><CircleAlert size={23} aria-hidden /></span><div><p className="invest-eyebrow">Worth a closer look</p><h2>Financial alerts</h2></div><span className="financial-alerts-count">{o.alertDetails.length} to review</span></div>
    <ul className="student-alerts">{o.alertDetails.map(alert => <li key={alert.id}>
      <Link href={alert.href + '#transaction-' + alert.id}>
        <div className="financial-alert-title"><strong>{alert.title}</strong><ArrowUpRight size={19} aria-hidden /></div>
        <span className="financial-alert-amount">{formatMoney(alert.amount)}</span><time dateTime={alert.date}>{alert.date.slice(0,10)}</time>
        <small>{alert.baselineLabel}{alert.baseline ? `: ${formatMoney(alert.baseline)}` : ''}</small>
        {alert.baseline && alert.amount.amountMinor <= alert.baseline.amountMinor ? <small>Recorded flag; amount does not exceed this observed baseline.</small> : null}
        <span className="student-link">View transaction →</span></Link>
    </li>)}{!o.alertDetails.length ? <li className="student-note">No flagged spending to review.</li> : null}</ul>
  </Card>;
}
