import { AccountLink as Link } from '../../components/shell/account-link';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, GraduationCap, ReceiptText, WalletCards } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/card';
import { formatMoney } from '../../domain/money';
import type { OverviewModel } from './overview-queries';
import { ShanghaiGreeting } from './shanghai-greeting';
import { FinancialAlerts } from './financial-details';
import { PortfolioQuickActions } from '../investing/portfolio-actions';

export function AccountBalances({ overview: o }: { overview: OverviewModel }) {
  return <Card><CardHeader title="Multi-currency balances" eyebrow={`${o.accountBalances.length} active accounts`} />
    {o.selectedAccount ? <div className="student-note" role="region" aria-label="Selected account">{o.selectedAccount.label} · {formatMoney(o.selectedAccount.amount)}</div> : null}
    <div className="student-balance-grid">{o.accountBalances.map(a => <div key={a.id}><p>{a.label}</p><strong>{formatMoney(a.amount)}</strong><small>{formatMoney(a.reportingAmount)} reporting value</small></div>)}</div>
  </Card>;
}
export function ForecastCard({ overview: o }: { overview: OverviewModel }) {
  return <Card><CardHeader title="3-month cash-flow forecast" eyebrow="Forward view" />
    <div className="student-balance-grid">{o.forecast.map(p => <div key={p.month}><p>{p.month}</p><strong>{formatMoney(p.closing)}</strong><small>Projected closing cash</small>
      <dl className="student-key-values"><div><dt>Opening</dt><dd>{formatMoney(p.opening)}</dd></div><div><dt>Recurring inflow</dt><dd>+{formatMoney(p.inflow)}</dd></div><div><dt>Living budget</dt><dd>−{formatMoney(p.recurringOutflow)}</dd></div><div><dt>Tuition</dt><dd>−{formatMoney(p.obligations)}</dd></div></dl></div>)}</div>
    <p className="student-note">Fixed sandbox accounting rates; excludes one-off income. Opening + recurring inflow − budget − tuition = closing cash.</p>
  </Card>;
}
export function RecentTransactions({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel"><CardHeader title="Recent transactions" eyebrow="Original-currency ledger" action={<Link href="/transactions" className="student-link">View all</Link>} />
    <ul className="student-recent-list">{o.recentTransactions.map(t => <li key={t.id} data-testid="recent-transaction"><span className="student-transaction-icon">{t.direction === 'credit' ? <ArrowDownRight size={18} aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}</span><div><strong>{t.merchant}</strong><small>{t.occurredAt.slice(0,10)} · {t.category.replaceAll('-',' ')}</small></div><span>{t.direction === 'credit' ? '+' : '−'}{formatMoney(t.amount)}</span></li>)}</ul>
  </Card>;
}
export function BankingShortcuts() {
  const actions = [{href:'/transfers?direction=receive',label:'Receive from home',icon:ArrowDownRight},{href:'/transfers?direction=send',label:'Send home',icon:ArrowUpRight},{href:'/accounts',label:'View accounts',icon:WalletCards},{href:'/planner',label:'Plan tuition',icon:GraduationCap},{href:'/transactions',label:'Review spending',icon:ReceiptText},{href:'/fx',label:'Compare currencies',icon:ArrowLeftRight}];
  return <section aria-label="Banking shortcuts"><h2 className="student-section-title">Quick actions</h2><div className="student-quick-grid">{actions.map(({href,label,icon:Icon}) => <Link key={href} href={href}><Icon size={20} aria-hidden /><span>{label}</span></Link>)}</div></section>;
}
export function TuitionSummary({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel tuition-summary"><CardHeader title="Upcoming tuition" eyebrow="Your next commitment" action={<Link href="/planner" className="student-link">Plan payment</Link>} />
    <p className="student-amount">{formatMoney(o.tuition.outstanding)}</p><p className="student-note">{o.tuition.next ? `${o.tuition.next.institution} · ${o.tuition.next.installment} · due ${o.tuition.next.dueAt.slice(0,10)}` : 'No unpaid tuition.'}</p>
  </Card>;
}
export function OverviewDashboard({ overview: o, hero, tuition }: { overview: OverviewModel; hero?: React.ReactNode; tuition?: React.ReactNode }) {
  const cashShare = o.totalNetWorth.amountMinor > 0n ? Number(o.availableCash.amountMinor * 10000n / o.totalNetWorth.amountMinor) / 100 : 0;
  return <div className="overview-dashboard student-overview">
    <header className="student-overview-heading"><div><p className="invest-eyebrow">Your global workspace</p><h1><ShanghaiGreeting name={o.userName} /></h1></div><span className="student-sandbox-badge">Sandbox · fictional funds</span></header>
    {hero ?? <section className="balance-hero student-safe-hero"><p>Your financial snapshot</p><p className="student-hero-number">{formatMoney(o.availableCash)}</p><PortfolioQuickActions /></section>}
    <section aria-label="Net worth and cash" className="student-net-worth"><div><span>Net worth</span><strong>{formatMoney(o.totalNetWorth)}</strong><small>Cash + investments</small></div><div><span>Available cash</span><strong>{formatMoney(o.availableCash)}</strong><small>{Math.min(100,Math.max(0,cashShare)).toFixed(1)}% cash allocation</small></div></section>
    <FinancialAlerts overview={o} />
    {tuition ?? <TuitionSummary overview={o} />}
    <RecentTransactions overview={o} />
    <BankingShortcuts />
  </div>;
}
