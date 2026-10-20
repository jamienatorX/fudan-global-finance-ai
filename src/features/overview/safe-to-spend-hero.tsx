'use client';
import { useDemo } from '../../demo/demo-context';
import { formatMoney } from '../../domain/money';
import { referenceConversion } from '../demo/planning-helpers';
import { safeToSpend } from './safe-to-spend';
import { AccountLink as Link } from '../../components/shell/account-link';
import { PortfolioQuickActions } from '../investing/portfolio-actions';
import { useShanghaiClock } from './use-shanghai-clock';
import type { CurrencyCode } from '../../domain/currency';

export function SafeToSpendHero({ currency='CNY' }: {currency?:CurrencyCode}) {
  const {snapshot}=useDemo();
  const clock=useShanghaiClock();
  const plan=safeToSpend(snapshot,clock?new Date(clock).toISOString():snapshot.asOf);
  const display=(value:typeof plan.total)=>formatMoney(referenceConversion(value,currency,snapshot.exchangeRates).amount);
  const nextBill=plan.reservations[0];
  return <section className="balance-hero student-safe-hero" aria-label="Safe to spend">
    <p className="student-safe-label">Safe to spend</p><p className="student-hero-number">{display(plan.total)}</p>
    <p className="student-safe-per-day">{display(plan.perDay)} / day · {plan.days} days</p>
    <p className="student-safe-horizon">{plan.nextIncome?`Until ${plan.nextIncome.merchant} on ${plan.horizon.slice(0,10)}`:'No future recurring inflow recorded · 30-day planning window'}</p>
    <p className="student-next-bill">Next bill: {nextBill?`${nextBill.label} · ${display({...plan.total,amountMinor:nextBill.amountMinor})} · ${nextBill.dueAt.slice(0,10)}`:'No recorded bills before the next inflow'}</p>
    <div className="student-send-receive"><Link href="/transfers?direction=send">↗ Send home</Link><Link href="/transfers?direction=receive">↙ Receive from home</Link></div>
    <details className="student-safe-breakdown"><summary>How safe-to-spend is calculated</summary>
      <p>Available cash {display(plan.available)} − recorded bills due before the next inflow {display(plan.reserved)}. Daily amount is rounded down. Overdue unpaid bills remain reserved.</p>
      <ul>{plan.reservations.map(r=><li key={r.id}>{r.label} · {display({...plan.total,amountMinor:r.amountMinor})} · {r.dueAt.slice(0,10)}</li>)}</ul>
      {plan.shortfall.amountMinor>0n?<p>Funding shortfall: {display(plan.shortfall)}</p>:null}
      <p>Fixed sandbox accounting rates. Unknown or unrecorded bills and future spending are not included; this is a planning estimate.</p>
    </details>
    <div className="student-invest-actions"><PortfolioQuickActions/></div>
  </section>;
}
