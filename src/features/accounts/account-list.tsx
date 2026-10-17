import type { Account } from '../../domain/entities';
import type { Money } from '../../domain/money';
import { formatMoney } from '../../domain/money';
import Link from 'next/link';
import { Card } from '../../components/ui/card';

export function AccountList({ accounts, reportingBalances }: Readonly<{
  accounts: readonly Account[];
  reportingBalances: readonly Readonly<{ id: string; reportingAmount: Money }>[];
}>) {
  const conversions = new Map(reportingBalances.map((entry) => [entry.id, entry.reportingAmount]));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {accounts.map((account) => (
        <Card key={account.id} className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{account.currency} / {account.type} account</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatMoney(account.balance)}</h2>
          <p className="mt-1 text-sm text-slate-500">Available {formatMoney(account.availableBalance)}</p>
          {conversions.has(account.id) ? <p className="mt-2 text-xs text-slate-500">CNY reference: {formatMoney(conversions.get(account.id)!)}</p> : null}
          {account.goal ? <p className="mt-2 text-xs text-slate-500">Savings goal: {formatMoney(account.goal)}</p> : null}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="text-xs capitalize text-slate-500">{account.status} · Simulated</span>
            <Link href={`/transactions?account=${encodeURIComponent(account.id)}&currency=${account.currency}`}
              className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500">View transactions</Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
