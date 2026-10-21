import { LocalizedDd, LocalizedDiv, LocalizedDl, LocalizedDt, LocalizedH1, LocalizedH2, LocalizedHeader, LocalizedLi, LocalizedP, LocalizedSection, LocalizedSmall, LocalizedSpan, LocalizedStrong, LocalizedUl } from '../../i18n/localized';
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
    {o.selectedAccount ? <LocalizedDiv className="student-note" role="region" aria-label="Selected account">{o.selectedAccount.label} · {formatMoney(o.selectedAccount.amount)}</LocalizedDiv> : null}
    <LocalizedDiv className="student-balance-grid">{o.accountBalances.map(a => <LocalizedDiv key={a.id}><LocalizedP>{a.label}</LocalizedP><LocalizedStrong>{formatMoney(a.amount)}</LocalizedStrong><LocalizedSmall>{formatMoney(a.reportingAmount)} reporting value</LocalizedSmall></LocalizedDiv>)}</LocalizedDiv>
  </Card>;
}
export function ForecastCard({ overview: o }: { overview: OverviewModel }) {
  return <Card><CardHeader title="3-month cash-flow forecast" eyebrow="Forward view" />
    <LocalizedDiv className="student-balance-grid">{o.forecast.map(p => <LocalizedDiv key={p.month}><LocalizedP>{p.month}</LocalizedP><LocalizedStrong>{formatMoney(p.closing)}</LocalizedStrong><LocalizedSmall>Projected closing cash</LocalizedSmall>
      <LocalizedDl className="student-key-values"><LocalizedDiv><LocalizedDt>Opening</LocalizedDt><LocalizedDd>{formatMoney(p.opening)}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Recurring inflow</LocalizedDt><LocalizedDd>+{formatMoney(p.inflow)}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Living budget</LocalizedDt><LocalizedDd>−{formatMoney(p.recurringOutflow)}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Tuition</LocalizedDt><LocalizedDd>−{formatMoney(p.obligations)}</LocalizedDd></LocalizedDiv></LocalizedDl></LocalizedDiv>)}</LocalizedDiv>
    <LocalizedP className="student-note">Fixed sandbox accounting rates; excludes one-off income. Opening + recurring inflow − budget − tuition = closing cash.</LocalizedP>
  </Card>;
}
export function RecentTransactions({ overview: o }: { overview: OverviewModel }) {
  return <Card className="student-panel"><CardHeader title="Recent transactions" eyebrow="Original-currency ledger" action={<Link href="/transactions" className="student-link">View all</Link>} />
    <LocalizedUl className="student-recent-list">{o.recentTransactions.map(t => <LocalizedLi key={t.id} data-testid="recent-transaction"><LocalizedSpan className="student-transaction-icon">{t.direction === 'credit' ? <ArrowDownRight size={18} aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}</LocalizedSpan><LocalizedDiv><LocalizedStrong>{t.merchant}</LocalizedStrong><LocalizedSmall>{t.occurredAt.slice(0,10)} · {t.category.replaceAll('-',' ')}</LocalizedSmall></LocalizedDiv><LocalizedSpan>{t.direction === 'credit' ? '+' : '−'}{formatMoney(t.amount)}</LocalizedSpan></LocalizedLi>)}</LocalizedUl>
  </Card>;
}
export function BankingShortcuts() {
  const actions = [{href:'/transfers?direction=receive',label:'Receive from home',icon:ArrowDownRight},{href:'/transfers?direction=send',label:'Send home',icon:ArrowUpRight},{href:'/accounts',label:'View accounts',icon:WalletCards},{href:'/planner',label:'Plan tuition',icon:GraduationCap},{href:'/transactions',label:'Review spending',icon:ReceiptText},{href:'/fx',label:'Compare currencies',icon:ArrowLeftRight}];
  return <LocalizedSection aria-label="Banking shortcuts"><LocalizedH2 className="student-section-title">Quick actions</LocalizedH2><LocalizedDiv className="student-quick-grid">{actions.map(({href,label,icon:Icon}) => <Link key={href} href={href}><Icon size={20} aria-hidden /><LocalizedSpan>{label}</LocalizedSpan></Link>)}</LocalizedDiv></LocalizedSection>;
}
export function TuitionSummary({ overview: o }: { overview: OverviewModel }) {
  if(!o.tuition.next || o.tuition.outstanding.amountMinor<=0n)return null;
  return <Card className="student-panel tuition-summary"><CardHeader title="Upcoming tuition" eyebrow="Your next commitment" action={<Link href="/planner" className="student-link">Plan payment</Link>} />
    <LocalizedP className="student-amount">{formatMoney(o.tuition.outstanding)}</LocalizedP><LocalizedP className="student-note">{o.tuition.next ? `${o.tuition.next.institution} · ${o.tuition.next.installment} · due ${o.tuition.next.dueAt.slice(0,10)}` : 'No unpaid tuition.'}</LocalizedP>
  </Card>;
}
export function OverviewDashboard({ overview: o, hero, tuition }: { overview: OverviewModel; hero?: React.ReactNode; tuition?: React.ReactNode }) {
  const cashShare = o.totalNetWorth.amountMinor > 0n ? Number(o.availableCash.amountMinor * 10000n / o.totalNetWorth.amountMinor) / 100 : 0;
  return <LocalizedDiv className="overview-dashboard student-overview">
    <LocalizedHeader className="student-overview-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">Your global workspace</LocalizedP><LocalizedH1><ShanghaiGreeting name={o.userName} /></LocalizedH1></LocalizedDiv><LocalizedSpan className="student-sandbox-badge">Sandbox · fictional funds</LocalizedSpan></LocalizedHeader>
    {hero ?? <LocalizedSection className="balance-hero student-safe-hero"><LocalizedP>Your financial snapshot</LocalizedP><LocalizedP className="student-hero-number">{formatMoney(o.availableCash)}</LocalizedP><PortfolioQuickActions /></LocalizedSection>}
    <LocalizedSection aria-label="Net worth and cash" className="student-net-worth"><LocalizedDiv><LocalizedSpan>Net worth</LocalizedSpan><LocalizedStrong>{formatMoney(o.totalNetWorth)}</LocalizedStrong><LocalizedSmall>Cash + investments</LocalizedSmall></LocalizedDiv><LocalizedDiv><LocalizedSpan>Available cash</LocalizedSpan><LocalizedStrong>{formatMoney(o.availableCash)}</LocalizedStrong><LocalizedSmall>{Math.min(100,Math.max(0,cashShare)).toFixed(1)}% cash allocation</LocalizedSmall></LocalizedDiv></LocalizedSection>
    <FinancialAlerts overview={o} />
    {o.tuition.next && o.tuition.outstanding.amountMinor>0n ? tuition ?? <TuitionSummary overview={o} /> : null}
    <RecentTransactions overview={o} />
    <BankingShortcuts />
  </LocalizedDiv>;
}
