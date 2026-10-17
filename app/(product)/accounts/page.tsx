import { DemoFinancialRepository } from '../../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../../src/demo/seed';
import { AccountList } from '../../../src/features/accounts/account-list';
import { getOverviewModel } from '../../../src/features/overview/overview-queries';
import { formatMoney } from '../../../src/domain/money';

export default async function AccountsPage() {
  const repository = new DemoFinancialRepository();
  const [accounts, overview] = await Promise.all([
    repository.listAccounts(DEMO_USER_ID),
    getOverviewModel(repository, DEMO_USER_ID),
  ]);
  return (
    <div className="space-y-6">
      <header><p className="text-sm font-semibold text-blue-700">Phase 2 · Simulated banking</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Accounts & balances</h1><p className="mt-2 text-sm text-slate-600">Original currencies are preserved. CNY equivalents use a labeled demo fallback rate, not live quotes.</p></header>
      <section className="rounded-2xl bg-[var(--color-navy)] p-6 text-white" aria-label="Account overview">
        <p className="text-sm text-blue-200">Total available cash · CNY reference</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{formatMoney(overview.availableCash)}</p>
        <p className="mt-2 text-xs text-slate-300">Demo reference fixture (not live) · {accounts.length} accounts</p>
      </section>
      <AccountList accounts={accounts} reportingBalances={overview.accountBalances} />
    </div>
  );
}
