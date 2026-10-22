import { LocalizedDiv, LocalizedH2, LocalizedP, LocalizedSpan } from '../../i18n/localized';
import type { Account } from '../../domain/entities';
import type { Money } from '../../domain/money';
import { formatMoney } from '../../domain/money';
import { LocalizedLink as Link } from '../../i18n/localized';
import { Card } from '../../components/ui/card';

export function AccountList({ accounts, reportingBalances }: Readonly<{
  accounts: readonly Account[];
  reportingBalances: readonly Readonly<{ id: string; reportingAmount: Money }>[];
}>) {
  const conversions = new Map(reportingBalances.map((entry) => [entry.id, entry.reportingAmount]));
  return (
    <LocalizedDiv className="grid gap-4 md:grid-cols-2">
      {accounts.map((account) => (
        <Card key={account.id} className="p-5 sm:p-6">
          <LocalizedP className="text-xs font-semibold uppercase tracking-wider text-blue-600">{account.currency} / {account.type} account</LocalizedP>
          <LocalizedH2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatMoney(account.balance)}</LocalizedH2>
          <LocalizedP className="mt-1 text-sm text-slate-500">Available {formatMoney(account.availableBalance)}</LocalizedP>
          {conversions.has(account.id) ? <LocalizedP className="mt-2 text-xs text-slate-500">CNY reference: {formatMoney(conversions.get(account.id)!)}</LocalizedP> : null}
          {account.goal ? <LocalizedP className="mt-2 text-xs text-slate-500">Savings goal: {formatMoney(account.goal)}</LocalizedP> : null}
          <LocalizedDiv className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <LocalizedSpan className="text-xs capitalize text-slate-500">{account.status}</LocalizedSpan>
            <Link href={`/transactions?account=${encodeURIComponent(account.id)}&currency=${account.currency}`}
              className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500">View transactions</Link>
          </LocalizedDiv>
        </Card>
      ))}
    </LocalizedDiv>
  );
}

