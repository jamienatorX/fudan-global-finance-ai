'use client';
import { LocalizedDetails, LocalizedDiv, LocalizedLi, LocalizedP, LocalizedSection, LocalizedSummary, LocalizedUl } from '../../i18n/localized';
import { useDemo } from '../../demo/demo-context';
import { formatMoney } from '../../domain/money';
import { referenceConversion } from '../demo/planning-helpers';
import { safeToSpend } from './safe-to-spend';
import { dailySpendingBudget } from './daily-spending-budget';
import { AccountLink as Link } from '../../components/shell/account-link';
import { PortfolioQuickActions } from '../investing/portfolio-actions';
import { useShanghaiClock } from './use-shanghai-clock';
import type { CurrencyCode } from '../../domain/currency';

export function SafeToSpendHero({ currency='CNY' }: {currency?:CurrencyCode}) {
  const {snapshot}=useDemo();
  const clock=useShanghaiClock();
  const plan=safeToSpend(snapshot,clock?new Date(clock).toISOString():snapshot.asOf);
  const dailyBudget=dailySpendingBudget(snapshot,clock?new Date(clock).toISOString():snapshot.asOf);
  const display=(value:typeof plan.total)=>formatMoney(referenceConversion(value,currency,snapshot.exchangeRates).amount);
  const nextBill=plan.reservations[0];
  return <LocalizedSection className="balance-hero student-safe-hero" aria-label="Safe to spend">
    <LocalizedP className="student-safe-label">Available after recorded bills</LocalizedP><LocalizedP className="student-hero-number">{display(plan.total)}</LocalizedP>
    <LocalizedP className="student-safe-per-day">{dailyBudget?`Daily budget remaining: ${display(dailyBudget.perDay)} / day`:'Set a monthly spending budget in Planner'}</LocalizedP>
    <LocalizedP className="student-safe-horizon">{plan.nextIncome?`Until ${plan.nextIncome.merchant} on ${plan.horizon.slice(0,10)}`:'No future recurring inflow recorded · 30-day planning window'}</LocalizedP>
    <LocalizedP className="student-next-bill">Next bill: {nextBill?`${nextBill.label} · ${display({...plan.total,amountMinor:nextBill.amountMinor})} · ${nextBill.dueAt.slice(0,10)}`:'No recorded bills before the next inflow'}</LocalizedP>
    <LocalizedDiv className="student-send-receive"><Link href="/transfers?direction=send">↗ Send home</Link><Link href="/transfers?direction=receive">↙ Receive from home</Link></LocalizedDiv>
    <LocalizedDetails className="student-safe-breakdown"><LocalizedSummary>How safe-to-spend is calculated</LocalizedSummary>
      <LocalizedP>Available cash {display(plan.available)} − recorded bills due before the next inflow {display(plan.reserved)}. Daily amount is rounded down. Overdue unpaid bills remain reserved.</LocalizedP>
      <LocalizedP>Equal daily share of available cash: {display(plan.perDay)} / day · {plan.days} days</LocalizedP><LocalizedP>This is not your spending budget. Savings remain included.</LocalizedP>
      {dailyBudget?<LocalizedP>Monthly discretionary budget remaining: {display(dailyBudget.remaining)} · {dailyBudget.days} days</LocalizedP>:null}
      <LocalizedP>Food, transport, shopping and other configured spending caps exclude rent and subscriptions; recorded purchases are deducted.</LocalizedP>
      <LocalizedUl>{plan.reservations.map(r=><LocalizedLi key={r.id}>{r.label} · {display({...plan.total,amountMinor:r.amountMinor})} · {r.dueAt.slice(0,10)}</LocalizedLi>)}</LocalizedUl>
      {plan.shortfall.amountMinor>0n?<LocalizedP>Funding shortfall: {display(plan.shortfall)}</LocalizedP>:null}
      <LocalizedP>Fixed sandbox accounting rates. Unknown or unrecorded bills and future spending are not included; this is a planning estimate.</LocalizedP>
    </LocalizedDetails>
    <LocalizedDiv className="student-invest-actions"><PortfolioQuickActions/></LocalizedDiv>
  </LocalizedSection>;
}
