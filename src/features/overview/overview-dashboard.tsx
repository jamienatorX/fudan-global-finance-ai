import { AccountLink as Link } from '../../components/shell/account-link';
import { ArrowDownRight, ArrowUpRight, CalendarClock, CircleAlert, PiggyBank, TrendingUp, WalletCards } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader } from '../../components/ui/card';
import { formatMoney, type Money } from '../../domain/money';
import type { OverviewModel } from './overview-queries';

const CATEGORY_COLORS: Record<string, string> = { rent: '#2563EB', food: '#10B981', transportation: '#F59E0B', shopping: '#8B5CF6', other: '#94A3B8' };

function MetricCard({ label, value, detail, tone = 'neutral', icon }: Readonly<{ label: string; value: string; detail: string; tone?: 'neutral' | 'positive' | 'warning'; icon: React.ReactNode }>) {
  const toneClass = tone === 'positive' ? 'text-emerald-700 bg-emerald-50' : tone === 'warning' ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-50';
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><span className={`grid size-10 place-items-center rounded-xl ${toneClass}`}>{icon}</span></div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </Card>
  );
}

function SignedMoney({ amount, direction }: Readonly<{ amount: Money; direction: 'credit' | 'debit' }>) {
  return <span className={`font-semibold tabular-nums ${direction === 'credit' ? 'text-emerald-700' : 'text-slate-900'}`}>{direction === 'credit' ? '+' : '−'}{formatMoney(amount)}</span>;
}

function BankingShortcuts() {
  const shortcuts = [
    { href: '/transfers', title: 'Transfer money', detail: 'Between simulated accounts' },
    { href: '/planner', title: 'Plan tuition', detail: 'Budgets and cash runway' },
    { href: '/transactions', title: 'Review spending', detail: 'Transactions and trends' },
    { href: '/subscriptions', title: 'Manage subscriptions', detail: 'Review recurring costs' },
  ] as const;
  return (
    <section aria-label="Banking shortcuts" className="rounded-3xl bg-[var(--color-navy)] px-5 py-6 text-white shadow-[var(--shadow-elevated)] sm:px-8 sm:py-8">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Manage your finances</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Explore simulated banking services. You control each action and must approve changes before they take effect.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map(({ href, title, detail }) => (
          <Link key={href} href={href} className="rounded-2xl border border-white/15 bg-white/10 p-4 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300">
            <span className="block text-sm font-semibold text-white">{title}</span>
            <span className="mt-1 block text-xs text-blue-100">{detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SpendingCard({ overview }: Readonly<{ overview: OverviewModel }>) {
  const stops = overview.spending.map((item, index, items) => {
    const start = items.slice(0, index).reduce((total, previous) => total + previous.shareBasisPoints / 100, 0);
    const end = start + item.shareBasisPoints / 100;
    return `${CATEGORY_COLORS[item.category] ?? '#94A3B8'} ${start}% ${end}%`;
  }).join(', ');
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Spending by category" eyebrow="October 2026" action={<Link href="/transactions" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View analysis</Link>} />
      <div className="grid gap-6 p-5 sm:grid-cols-[10rem_1fr] sm:items-center sm:p-6">
        <div role="img" aria-label={`Spending category chart. Total ${formatMoney(overview.monthlyExpenses)}`} className="relative mx-auto grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(${stops})` }}><div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-inner"><div><p className="text-xs text-slate-500">Spent</p><p className="text-sm font-bold text-slate-950">{formatMoney(overview.monthlyExpenses)}</p></div></div></div>
        <ul className="space-y-3">{overview.spending.map((item) => <li key={item.category} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 capitalize text-slate-600"><span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] }} />{item.category}</span><span className="font-semibold tabular-nums text-slate-900">{formatMoney(item.amount)}</span></li>)}</ul>
      </div>
    </Card>
  );
}

function CashFlowCard({ overview }: Readonly<{ overview: OverviewModel }>) {
  const max = Math.max(Number(overview.monthlyIncome.amountMinor), Number(overview.monthlyExpenses.amountMinor));
  const incomeWidth = max ? Math.round(Number(overview.monthlyIncome.amountMinor) / max * 100) : 0;
  const expenseWidth = max ? Math.round(Number(overview.monthlyExpenses.amountMinor) / max * 100) : 0;
  return (
    <Card>
      <CardHeader title="Monthly cash flow" eyebrow="Verified snapshot" action={<Badge tone="positive">+{formatMoney(overview.monthlyCashFlow)}</Badge>} />
      <div className="space-y-5 p-5 sm:p-6">
        <div><div className="mb-2 flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><ArrowDownRight size={16} className="text-emerald-600" aria-hidden />Income</span><strong>{formatMoney(overview.monthlyIncome)}</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${incomeWidth}%` }} /></div></div>
        <div><div className="mb-2 flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><ArrowUpRight size={16} className="text-amber-600" aria-hidden />Expenses</span><strong>{formatMoney(overview.monthlyExpenses)}</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${expenseWidth}%` }} /></div></div>
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">Internal transfers and investment purchases are excluded from income and consumption totals.</p>
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
            <p className="mt-2 text-lg font-bold tabular-nums text-slate-950">{formatMoney(point.closing)}</p>
            <p className="mt-1 text-xs text-slate-500">Projected closing cash</p>
            <dl className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Recurring inflow</dt><dd className="font-semibold text-emerald-700">+{formatMoney(point.inflow)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Living budget</dt><dd className="font-semibold text-slate-700">−{formatMoney(point.recurringOutflow)}</dd></div>
              {point.obligations.amountMinor > 0n ? <div className="flex justify-between gap-2"><dt className="text-slate-500">Obligations</dt><dd className="font-semibold text-amber-700">−{formatMoney(point.obligations)}</dd></div> : null}
            </dl>
          </div>
        ))}
      </div>
      <p className="px-5 pb-5 text-xs leading-5 text-slate-500 sm:px-6 sm:pb-6">Projection uses recurring income observed in the reporting month, the current monthly budget, and dated unpaid tuition obligations. It is a planning estimate, not a guarantee.</p>
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
    <div className="space-y-6 pb-20 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge tone="info">Student finance cockpit</Badge><span className="text-xs text-slate-500">As of {new Date(overview.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span></div><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Good morning, {overview.userName}</h1><p className="mt-2 text-sm text-slate-600 sm:text-base">Your finances across Shanghai and home, in one verified view.</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><span className={`size-2 rounded-full ${overview.fxSource.source === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{overview.fxSource.source === 'live' ? 'Live FX' : 'Fallback FX'} · {overview.fxSource.referenceAt.slice(0, 10)}</div></header>
      <BankingShortcuts />
      <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Consolidated net worth" value={formatMoney(overview.totalNetWorth)} detail={`Includes ${formatMoney(overview.investedValue)} simulated investments`} icon={<TrendingUp size={20} aria-hidden />} />
        <MetricCard label="Available cash" value={formatMoney(overview.availableCash)} detail="Converted using seeded reference rates" icon={<WalletCards size={20} aria-hidden />} />
        <MetricCard label="Monthly expenses" value={formatMoney(overview.monthlyExpenses)} detail={`${usedPercent}% of your living budget`} tone={usedPercent >= 100 ? 'warning' : 'neutral'} icon={<ArrowUpRight size={20} aria-hidden />} />
        <MetricCard label="Cash runway" value={`${overview.cashRunwayMonths.toFixed(1)} months`} detail="After the upcoming tuition installment" tone="positive" icon={<PiggyBank size={20} aria-hidden />} />
      </section>
      {overview.selectedAccount ? <Card aria-label="Selected account" className="border-blue-200 bg-blue-50/50 p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Selected account</p><p className="mt-1 text-sm font-medium text-slate-600">{overview.selectedAccount.label}</p></div><div className="sm:text-right"><p className="text-2xl font-bold tabular-nums text-slate-950">{formatMoney(overview.selectedAccount.amount)}</p>{overview.selectedAccount.amount.currency !== 'CNY' ? <p className="mt-1 text-xs text-slate-500">≈ {formatMoney(overview.selectedAccount.reportingAmount)} reporting value</p> : <p className="mt-1 text-xs text-slate-500">Reporting currency</p>}</div></div></Card> : null}
      <Card>
        <CardHeader title="Multi-currency balances" eyebrow={`${overview.accountBalances.length} active accounts`} action={<Link href="/accounts" className="text-xs font-semibold text-blue-600">View accounts</Link>} />
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
          {overview.accountBalances.map((account) => (
            <div key={account.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs font-medium text-slate-500">{account.label}</p>
              <p className="mt-2 text-base font-bold tabular-nums text-slate-950">{formatMoney(account.amount)}</p>
              {account.amount.currency !== 'CNY' ? <p className="mt-1 text-[11px] text-slate-500">≈ {formatMoney(account.reportingAmount)} fallback</p> : null}
            </div>
          ))}
        </div>
      </Card>
      <section className="grid gap-4 xl:grid-cols-2"><SpendingCard overview={overview} /><CashFlowCard overview={overview} /></section>
      <ForecastCard overview={overview} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader title="Budget health" eyebrow={`${overview.budget.categories.length} categories`} action={<Link href="/planner" className="text-xs font-semibold text-blue-600">Adjust</Link>} /><div className="p-5 sm:p-6"><div className="flex items-end justify-between"><div><p className="text-2xl font-bold text-slate-950">{usedPercent}% used</p><p className="mt-1 text-xs text-slate-500">{formatMoney(overview.budget.actual)} of {formatMoney(overview.budget.limit)}</p></div><Badge tone={usedPercent >= 100 ? 'warning' : 'positive'}>{usedPercent >= 100 ? 'At limit' : 'On track'}</Badge></div><div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(usedPercent, 100)}%` }} /></div>{overview.emergencyFund ? <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex justify-between text-xs"><span className="text-slate-500">Emergency fund</span><strong>{emergencyPercent}% funded</strong></div></div> : null}</div></Card>
        <Card><CardHeader title="Subscriptions" eyebrow={`${overview.subscriptions.active.length} active`} action={<Link href="/subscriptions" className="text-xs font-semibold text-blue-600">Optimize</Link>} /><div className="p-5 sm:p-6"><p className="text-2xl font-bold text-slate-950">{formatMoney(overview.subscriptions.monthly)} / month</p><p className="mt-1 text-xs text-slate-500">{formatMoney(overview.subscriptions.annual)} annualized</p>{overview.subscriptions.unusedCount ? <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden />{overview.subscriptions.unusedCount} potentially unused service could be reviewed.</div> : null}</div></Card>
        <Card><CardHeader title="Tuition plan" eyebrow="Upcoming obligation" action={<Link href="/planner" className="text-xs font-semibold text-blue-600">Plan payment</Link>} /><div className="p-5 sm:p-6"><p className="text-2xl font-bold text-slate-950">{formatMoney(overview.tuition.outstanding)} outstanding</p><p className="mt-1 text-xs text-slate-500">{overview.tuition.next?.institution} · {overview.tuition.next?.installment}</p><div className="mt-5 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-800"><CalendarClock size={16} aria-hidden />Due {overview.tuition.next ? new Date(overview.tuition.next.dueAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }) : '—'}</div></div></Card>
        <Card><CardHeader title="Investment portfolio" eyebrow="Simulated holdings" action={<Link href="/wealth" className="text-xs font-semibold text-blue-600">Explore</Link>} /><div className="p-5 sm:p-6"><p className="text-2xl font-bold text-slate-950">{formatMoney(overview.investedValue)}</p><p className="mt-1 text-xs text-slate-500">{overview.holdingsCount} holdings</p><div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">Fictional products only. Historical simulations do not guarantee returns.</div></div></Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden"><CardHeader title="Recent transactions" eyebrow="All accounts" action={<Link href="/transactions" className="text-xs font-semibold text-blue-600">View all</Link>} /><div className="mt-3 divide-y divide-slate-100">{overview.recentTransactions.map((transaction) => <div key={transaction.id} data-testid="recent-transaction" className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${transaction.direction === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{transaction.direction === 'credit' ? <ArrowDownRight size={17} aria-hidden /> : <ArrowUpRight size={17} aria-hidden />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{transaction.merchant}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{transaction.category.replace('-', ' ')} · {transaction.originalCurrency}</p></div><SignedMoney amount={transaction.amount} direction={transaction.direction} /></div>)}</div></Card>
        <div className="space-y-4"><Card><CardHeader title="Spending insight" eyebrow="From your simulated records" /><div className="p-5 sm:p-6"><div className="flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950"><CircleAlert size={18} className="mt-1 shrink-0 text-blue-600" aria-hidden /><p>{unusedSubscription && unusedAnnualCost ? <>{unusedSubscription.merchant} has no recorded usage. Reviewing it could save {formatMoney(unusedAnnualCost)} per year.</> : <>Your recurring commitments are currently supported by your cash runway.</>}</p></div></div></Card><Card><CardHeader title="Financial alerts" eyebrow={`${overview.alerts.length} items`} /><ul className="space-y-3 p-5 sm:p-6">{overview.alerts.slice(0, 3).map((alert) => <li key={alert} className="flex gap-3 text-sm leading-5 text-slate-700"><span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" />{alert}</li>)}</ul></Card></div>
      </section>
      <p className="text-center text-xs leading-5 text-slate-500">All balances, products, rates, and actions are fictional or simulated. This prototype is not a licensed financial institution.</p>
    </div>
  );
}
