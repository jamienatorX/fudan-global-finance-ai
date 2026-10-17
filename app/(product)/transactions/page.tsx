import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from '../../../src/domain/currency';
import { formatMoney } from '../../../src/domain/money';
import { DemoFinancialRepository } from '../../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../../src/demo/seed';
import { buildSpendingReport } from '../../../src/features/transactions/reporting';
import { searchTransactions } from '../../../src/features/transactions/transaction-service';
import { TransactionTable } from '../../../src/features/transactions/transaction-table';
import { CsvImportPreview } from '../../../src/features/transactions/csv-preview';

type Params = Record<string, string | string[] | undefined>;
function single(value: Params[string]): string | undefined { return typeof value === 'string' ? value : undefined; }
function prevMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return date.toISOString().slice(0, 7);
}
export default async function TransactionsPage({ searchParams }: Readonly<{ searchParams: Promise<Params> }>) {
  const params = await searchParams;
  const repository = new DemoFinancialRepository();
  const snapshot = await repository.getSnapshot(DEMO_USER_ID);
  const currencyParam = single(params.currency);
  const currency: CurrencyCode = currencyParam && Object.hasOwn(CURRENCY_MINOR_DIGITS, currencyParam)
    ? currencyParam as CurrencyCode : 'CNY';
  const accountRequested = single(params.account);
  const ownedAccount = snapshot.accounts.find((account) => account.id === accountRequested);
  const accountId = ownedAccount?.id;
  const monthParam = single(params.month);
  const month = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : snapshot.asOf.slice(0, 7);
  const search = single(params.q)?.slice(0, 120) ?? '';
  const result = await searchTransactions(repository, DEMO_USER_ID, { accountId, currency, month, search, pageSize: 100 });
  const report = buildSpendingReport(snapshot.transactions, month, prevMonth(month), currency, accountId);
  return (
    <div className="space-y-6">
      <header><p className="text-sm font-semibold text-blue-700">Phase 2 · Read-only ledger</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Transactions & bill analysis</h1><p className="mt-2 text-sm text-slate-600">Spending totals include consumption only. Internal transfers, investment movements, and external remittances remain visible in the ledger but are not counted as consumption.</p></header>
      <form action="/transactions" method="get" aria-label="Transaction filters" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600">Account
          <select name="account" defaultValue={accountId ?? ''} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900">
            <option value="">All accounts</option>{snapshot.accounts.map((account) => <option key={account.id} value={account.id}>{account.currency} {account.type}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Currency
          <select name="currency" defaultValue={currency} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900">
            {Object.keys(CURRENCY_MINOR_DIGITS).map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Month
          <input name="month" type="month" defaultValue={month} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Search merchant
          <input name="q" type="search" maxLength={120} defaultValue={search} placeholder="e.g. Campus" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" />
        </label>
        <button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 sm:col-span-2 lg:col-span-4">Apply filters</button>
      </form>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Monthly reporting totals">
        {[['Income', report.income], ['Consumption', report.expenses], ['Net cash flow', report.netCashFlow]].map(([label, amount]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]"><p className="text-sm text-slate-500">{label as string} · {month}</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{formatMoney(amount as typeof report.income)}</p></div>
        ))}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]" aria-label="Spending breakdown">
        <h2 className="text-base font-semibold text-slate-950">Consumption by category</h2>
        {report.categories.length === 0 ? <p className="mt-3 text-sm text-slate-500">No consumption for this currency and period.</p>
          : <ul className="mt-3 divide-y divide-slate-100">{report.categories.map((row) => <li key={row.category} className="flex justify-between gap-4 py-2 text-sm"><span className="capitalize text-slate-600">{row.category}</span><strong className="tabular-nums text-slate-950">{formatMoney(row.amount)}</strong></li>)}</ul>}
        <p className="mt-3 text-xs text-slate-500">
          {report.comparison.status === 'insufficient-data' ? 'Insufficient data for a previous-month comparison.' : report.comparison.expenseChangeBasisPoints === null
            ? 'Previous-month consumption was zero, so a percentage change is unavailable.'
            : `Change versus ${report.comparisonPeriod}: ${(report.comparison.expenseChangeBasisPoints / 100).toFixed(1)}%`}
        </p>
        <p className="mt-1 text-xs text-slate-500">{report.recurringCount} recurring entries · {report.anomalies.length} flagged spending entries</p>
      </section>
      <TransactionTable transactions={result.transactions} total={result.total} />
      {result.total > result.transactions.length ? <p className="text-xs text-slate-500">Showing the most recent 100 matching entries. Narrow the filters to view older transactions.</p> : null}
      <CsvImportPreview />
    </div>
  );
}
