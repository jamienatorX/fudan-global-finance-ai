import { AccountLink as Link } from '../../components/shell/account-link';
import { ArrowDownRight, ArrowUpRight, CalendarClock, CircleAlert, PiggyBank, WalletCards, ArrowRight, SendHorizontal, GraduationCap, ReceiptText, Repeat2, Compass, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader } from '../../components/ui/card';
import { formatMoney, type Money } from '../../domain/money';
import type { OverviewModel } from './overview-queries';
import { MembershipBadge, MembershipProgress } from './membership-progress';
import { getMembership } from './membership';
import { DashboardBankCard } from './dashboard-bank-card';
import { CashFlowCurve } from './cash-flow-curve';
import { SpendingBreakdown } from './spending-breakdown';
import { PortfolioQuickActions, PortfolioActivityPanel } from '../investing/portfolio-actions';

function MetricCard({ label, value, detail, tone = 'neutral', icon }: Readonly<{ label: string; value: string; detail: string; tone?: 'neutral' | 'positive' | 'warning'; icon: React.ReactNode }>) {
  const toneClass = tone === 'positive' ? 'text-emerald-700 bg-emerald-50' : tone === 'warning' ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-50';
  return (
    <Card className="metric-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="metric-label text-sm font-medium text-slate-500">{label}</p><p className="metric-value mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] tabular-nums text-[var(--color-navy)]">{value}</p></div><span className={`metric-icon grid size-11 place-items-center rounded-2xl ${toneClass}`}>{icon}</span></div>
      <p className="metric-detail mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </Card>
  );
}

function SignedMoney({ amount, direction }: Readonly<{ amount: Money; direction: 'credit' | 'debit' }>) {
  return <span className={`font-semibold tabular-nums ${direction === 'credit' ? 'text-emerald-700' : 'text-slate-900'}`}>{direction === 'credit' ? '+' : '−'}{formatMoney(amount)}</span>;
}

function BalanceHero({ overview }: Readonly<{ overview: OverviewModel }>) {
  const cashShare = overview.totalNetWorth.amountMinor > 0n
    ? Math.min(100, Math.max(0, Number(overview.availableCash.amountMinor * 10000n / overview.totalNetWorth.amountMinor) / 100))
    : 0;
  return (
    <section aria-label="Your financial snapshot" className="dashboard-hero-grid">
      <div className="balance-hero portfolio-glass-hero relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-medium tracking-wide text-[var(--color-hero-muted)]">Consolidated net worth</p><MembershipBadge balance={overview.membershipBalanceCny} /></div>
          <p className="balance-number text-center mt-5 break-words text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-tight tracking-[-0.055em] tabular-nums">{formatMoney(overview.totalNetWorth)}</p>
          <p className="mt-2 text-center text-xs leading-5 text-[var(--color-hero-muted)]">Across {overview.accountBalances.length} accounts · {overview.holdingsCount} holdings</p>
          <PortfolioQuickActions />
          <MembershipProgress balance={overview.membershipBalanceCny} />
          <div className="mt-6 max-w-lg">
            <div className="flex justify-between gap-4 text-xs text-[var(--color-hero-muted)]"><span>Cash allocation</span><span className="tabular-nums">{cashShare.toFixed(1)}%</span></div>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true"><span className="h-full rounded-full bg-[var(--color-hero-accent)]" style={{ width: `${cashShare}%` }} /></div>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5"><span className="flex items-center gap-2 text-xs text-[var(--color-hero-muted)]"><ShieldCheck size={15} aria-hidden />Account overview</span><Link href="/accounts" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-hero-accent)] px-5 text-xs font-semibold text-[var(--color-navy)] transition-colors hover:bg-white">View your accounts<ArrowUpRight size={15} aria-hidden /></Link></div>
        </div>
      </div>
      <DashboardBankCard cards={overview.cards} cardholderName={overview.cardholderName} tier={getMembership(overview.membershipBalanceCny).current} />
    </section>
  );
}

function BankingShortcuts() {
  const shortcuts = [
    { href: '/transfers', title: 'Transfer money', detail: 'Move between accounts', icon: SendHorizontal },
    { href: '/planner', title: 'Plan tuition', detail: 'Prepare for what is next', icon: GraduationCap },
    { href: '/transactions', title: 'Review spending', detail: 'Understand your activity', icon: ReceiptText },
    { href: '/subscriptions', title: 'Manage subscriptions', detail: 'Keep recurring costs clear', icon: Repeat2 },
    { href: '/showcase', title: 'Explore the product', detail: 'Take the guided tour', icon: Compass },
  ] as const;
  return (
    <section aria-label="Banking shortcuts">
      <div className="mb-3 flex items-center gap-3"><h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Your everyday essentials</h2><span className="h-px flex-1 bg-[var(--color-border)]" /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {shortcuts.map(({ href, title, detail, icon: Icon }) => (
          <Link key={href} href={href} className="shortcut-card group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-info-soft)] xl:flex-col xl:items-start 2xl:flex-row 2xl:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-info-soft)] text-[var(--color-primary)]"><Icon size={19} strokeWidth={1.7} aria-hidden /></span>
            <span className="min-w-0"><span className="block text-xs font-semibold leading-5 text-[var(--color-text)]">{title}</span><span className="mt-0.5 block text-[11px] leading-4 text-[var(--color-text-muted)]">{detail}</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CashFlowCard({ overview }: Readonly<{ overview: OverviewModel }>) {
  const max = Math.max(Number(overview.monthlyIncome.amountMinor), Number(overview.monthlyExpenses.amountMinor));
  const incomeWidth = max ? Math.round(Number(overview.monthlyIncome.amountMinor) / max * 100) : 0;
  const expenseWidth = max ? Math.round(Number(overview.monthlyExpenses.amountMinor) / max * 100) : 0;
  return (
    <Card>
      <CardHeader title="Monthly cash flow" eyebrow="This month" action={<Badge tone="positive">+{formatMoney(overview.monthlyCashFlow)}</Badge>} />
      <div className="space-y-5 p-5 sm:p-6">
        <div><div className="mb-2 flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><ArrowDownRight size={16} className="text-emerald-600" aria-hidden />Income</span><strong>{formatMoney(overview.monthlyIncome)}</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${incomeWidth}%` }} /></div></div>
        <div><div className="mb-2 flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><ArrowUpRight size={16} className="text-amber-600" aria-hidden />Expenses</span><strong>{formatMoney(overview.monthlyExpenses)}</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${expenseWidth}%` }} /></div></div>

      </div>
    </Card>
  );
}

function ForecastCard({ overview }: Readonly<{ overview: OverviewModel }>) {
  return (
    <Card>
      <CardHeader title="3-month cash-flow forecast" eyebrow="Forward view" />
      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        {overview.forecast.map((point) => (
          <div key={point.month} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
              {new Date(`${point.month}-01T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
            </p>
            <p className="mt-2 text-center text-lg font-bold tabular-nums text-slate-950">{formatMoney(point.closing)}</p>
            <p className="mt-1 text-xs text-slate-500">Projected closing cash</p>
            <dl className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Recurring inflow</dt><dd className="font-semibold text-emerald-700">+{formatMoney(point.inflow)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Living budget</dt><dd className="font-semibold text-slate-700">−{formatMoney(point.recurringOutflow)}</dd></div>
              {point.obligations.amountMinor > 0n ? <div className="flex justify-between gap-2"><dt className="text-slate-500">Obligations</dt><dd className="font-semibold text-amber-700">−{formatMoney(point.obligations)}</dd></div> : null}
            </dl>
          </div>
        ))}
      </div>

    </Card>
  );
}

export function OverviewDashboard({ overview }: Readonly<{ overview: OverviewModel }>) {
  const usedPercent = Math.round(overview.budget.usedBasisPoints / 100);
  const emergencyPercent = Math.round((overview.emergencyFund?.progressBasisPoints ?? 0) / 100);
  const unusedSubscription = overview.subscriptions.active.find((subscription) => !subscription.lastUsageAt);
  const unusedAnnualCost = unusedSubscription
    ? { ...unusedSubscription.amount, amountMinor: unusedSubscription.amount.amountMinor * (unusedSubscription.cadence === 'monthly' ? 12n : 1n) }
    : null;
  return (
    <div className="overview-dashboard pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">Your global workspace</span><span className="text-xs text-slate-500">As of {new Date(overview.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span></div><h1 className="text-3xl font-semibold tracking-[-0.045em] text-[var(--color-navy)] sm:text-4xl">Good morning, {overview.userName}</h1><p className="mt-2 text-sm text-slate-600 sm:text-base">Your finances across Shanghai and home, all in one place.</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><span className={`size-2 rounded-full ${overview.fxSource.source === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{overview.fxSource.source === 'live' ? 'Live FX' : 'Fallback FX'} · {overview.fxSource.referenceAt.slice(0, 10)}</div></header>
      <BalanceHero overview={overview} />
      <div className="dashboard-planner-callout">
        <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-planning-label)]">Looking ahead</span><GraduationCap size={22} className="text-[var(--color-planning-icon)]" aria-hidden /></div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--color-navy)]">Your next chapter, already in the plan.</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-planning-text)]">Keep tuition and everyday living in balance with a clear view of what comes next.</p>
        <div className="mt-5 flex items-center gap-2 border-t border-[var(--color-planning-divider)] pt-5 text-xs text-[var(--color-planning-text)]"><CalendarClock size={16} aria-hidden /><span>{overview.tuition.next ? `Next tuition due ${new Date(overview.tuition.next.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}` : 'Review your upcoming commitments'}</span></div>
        <Link href="/planner" className="mt-4 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[var(--color-navy)] underline decoration-[var(--color-planning-underline)] underline-offset-4">Open your planner<ArrowRight size={16} aria-hidden /></Link>
      </div>
      <section aria-label="Financial summary" className="financial-summary">
        <MetricCard label="Available cash" value={formatMoney(overview.availableCash)} detail="Across your accounts" icon={<WalletCards size={20} aria-hidden />} />
        <MetricCard label="Monthly expenses" value={formatMoney(overview.monthlyExpenses)} detail={`${usedPercent}% of your living budget`} tone={usedPercent >= 100 ? 'warning' : 'neutral'} icon={<ArrowUpRight size={20} aria-hidden />} />
        <MetricCard label="Cash runway" value={`${overview.cashRunwayMonths.toFixed(1)} months`} detail="After the upcoming tuition installment" tone="positive" icon={<PiggyBank size={20} aria-hidden />} />
      </section>
      <section className="portfolio-insights-grid"><CashFlowCurve history={overview.cashFlowHistory} /><PortfolioActivityPanel /></section>
      <BankingShortcuts />
      {overview.selectedAccount ? <Card aria-label="Selected account" className="border-blue-200 bg-blue-50/50 p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Selected account</p><p className="mt-1 text-sm font-medium text-slate-600">{overview.selectedAccount.label}</p></div><div className="sm:text-right"><p className="text-2xl font-bold tabular-nums text-slate-950">{formatMoney(overview.selectedAccount.amount)}</p>{overview.selectedAccount.amount.currency !== overview.selectedAccount.reportingAmount.currency ? <p className="mt-1 text-xs text-slate-500">≈ {formatMoney(overview.selectedAccount.reportingAmount)} reporting value</p> : <p className="mt-1 text-xs text-slate-500">Account currency</p>}</div></div></Card> : null}
      <Card>
        <CardHeader title="Multi-currency balances" eyebrow={`${overview.accountBalances.length} active accounts`} action={<Link href="/accounts" className="text-xs font-semibold text-blue-600">View accounts</Link>} />
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 2xl:grid-cols-5">
          {overview.accountBalances.map((account) => (
            <div key={account.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs font-medium text-slate-500">{account.label}</p>
              <p className="mt-2 text-center text-base font-bold tabular-nums text-slate-950">{formatMoney(account.amount)}</p>
              {account.amount.currency !== account.reportingAmount.currency ? <p className="mt-1 text-xs leading-5 text-slate-500">≈ {formatMoney(account.reportingAmount)} equivalent</p> : null}
            </div>
          ))}
        </div>
      </Card>
      <section className="grid gap-4 xl:grid-cols-2"><SpendingBreakdown overview={overview} /><CashFlowCard overview={overview} /></section>
      <ForecastCard overview={overview} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader title="Budget health" eyebrow={`${overview.budget.categories.length} categories`} action={<Link href="/planner" className="text-xs font-semibold text-blue-600">Adjust</Link>} /><div className="p-5 sm:p-6"><div className="flex flex-col items-center justify-between gap-3 text-center"><div><p className="text-center text-2xl font-bold text-slate-950">{usedPercent}% used</p><p className="mt-1 text-xs text-slate-500">{formatMoney(overview.budget.actual)} of {formatMoney(overview.budget.limit)}</p></div><Badge tone={usedPercent >= 100 ? 'warning' : 'positive'}>{usedPercent >= 100 ? 'At limit' : 'On track'}</Badge></div><div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(usedPercent, 100)}%` }} /></div>{overview.emergencyFund ? <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex justify-between text-xs"><span className="text-slate-500">Emergency fund</span><strong>{emergencyPercent}% funded</strong></div></div> : null}</div></Card>
        <Card><CardHeader title="Subscriptions" eyebrow={`${overview.subscriptions.active.length} active`} action={<Link href="/subscriptions" className="text-xs font-semibold text-blue-600">Optimize</Link>} /><div className="p-5 sm:p-6"><p className="text-center text-2xl font-bold text-slate-950">{formatMoney(overview.subscriptions.monthly)} / month</p><p className="mt-1 text-xs text-slate-500">{formatMoney(overview.subscriptions.annual)} annualized</p>{overview.subscriptions.unusedCount ? <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden />{overview.subscriptions.unusedCount} potentially unused service could be reviewed.</div> : null}</div></Card>
        <Card><CardHeader title="Tuition plan" eyebrow="Upcoming obligation" action={<Link href="/planner" className="text-xs font-semibold text-blue-600">Plan payment</Link>} /><div className="p-5 sm:p-6"><p className="text-center text-2xl font-bold text-slate-950">{formatMoney(overview.tuition.outstanding)} outstanding</p><p className="mt-1 text-xs text-slate-500">{overview.tuition.next?.institution} · {overview.tuition.next?.installment}</p><div className="mt-5 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-800"><CalendarClock size={16} aria-hidden />Due {overview.tuition.next ? new Date(overview.tuition.next.dueAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }) : '—'}</div></div></Card>
        <Card><CardHeader title="Investment portfolio" eyebrow="Your holdings" action={<Link href="/wealth" className="text-xs font-semibold text-blue-600">Explore</Link>} /><div className="p-5 sm:p-6"><p className="text-center text-2xl font-bold text-slate-950">{formatMoney(overview.investedValue)}</p><p className="mt-1 text-xs text-slate-500">{overview.holdingsCount} holdings</p><div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">Values may rise or fall.</div></div></Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden"><CardHeader title="Recent transactions" eyebrow="All accounts" action={<Link href="/transactions" className="text-xs font-semibold text-blue-600">View all</Link>} /><div className="mt-3 divide-y divide-slate-100">{overview.recentTransactions.map((transaction) => <div key={transaction.id} data-testid="recent-transaction" className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${transaction.direction === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{transaction.direction === 'credit' ? <ArrowDownRight size={17} aria-hidden /> : <ArrowUpRight size={17} aria-hidden />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{transaction.merchant}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{transaction.category.replace('-', ' ')} · {transaction.originalCurrency}</p></div><SignedMoney amount={transaction.amount} direction={transaction.direction} /></div>)}</div></Card>
        <div className="space-y-4"><Card><CardHeader title="Spending insight" eyebrow="For you" /><div className="p-5 sm:p-6"><div className="flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950"><CircleAlert size={18} className="mt-1 shrink-0 text-blue-600" aria-hidden /><p>{unusedSubscription && unusedAnnualCost ? <>{unusedSubscription.merchant} has no recorded usage. Reviewing it could save {formatMoney(unusedAnnualCost)} per year.</> : <>Your recurring commitments are currently supported by your cash runway.</>}</p></div></div></Card><Card><CardHeader title="Financial alerts" eyebrow={`${overview.alerts.length} items`} /><ul className="space-y-3 p-5 sm:p-6">{overview.alerts.slice(0, 3).map((alert) => <li key={alert} className="flex gap-3 text-sm leading-5 text-slate-700"><span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" />{alert}</li>)}</ul></Card></div>
      </section>

    </div>
  );
}

