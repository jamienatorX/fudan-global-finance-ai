import { formatMoney } from '../../domain/money';
import type { Transaction } from '../../domain/entities';
import { Card, CardHeader } from '../../components/ui/card';

function humanize(value: string): string {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function TransactionTable({ transactions, total }: Readonly<{
  transactions: readonly Transaction[];
  total: number;
}>) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Transaction history" eyebrow="Original-currency ledger"
        action={<span className="text-xs text-slate-500">{transactions.length} of {total} records</span>} />
      {transactions.length === 0 ? <p className="px-6 py-8 text-sm text-slate-500">No transactions match these filters.</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
              <th scope="col" className="px-6 py-3 font-semibold">Date</th>
              <th scope="col" className="px-4 py-3 font-semibold">Merchant / category</th>
              <th scope="col" className="px-4 py-3 font-semibold">Classification</th>
              <th scope="col" className="px-6 py-3 text-right font-semibold">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <tr id={'transaction-' + transaction.id} key={transaction.id} className="align-top">
                  <td className="whitespace-nowrap px-6 py-4 text-slate-500">{transaction.occurredAt.slice(0, 10)}</td>
                  <td className="px-4 py-4">
                    <span className="block font-medium text-slate-900">{transaction.merchant}</span>
                    <span className="block text-xs text-slate-500">{humanize(transaction.category)}</span>
                    {transaction.anomaly ? <span className="mt-1 block text-xs font-medium text-amber-700">{transaction.anomaly}</span> : null}
                  </td>
                  <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{humanize(transaction.classification)}</span></td>
                  <td className={`whitespace-nowrap px-6 py-4 text-right font-semibold tabular-nums ${transaction.direction === 'credit' ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {transaction.direction === 'credit' ? '+' : '−'}{formatMoney(transaction.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
