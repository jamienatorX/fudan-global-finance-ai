import { LocalizedDiv, LocalizedP, LocalizedSpan, LocalizedTable, LocalizedTbody, LocalizedTd, LocalizedTh, LocalizedThead, LocalizedTr } from '../../i18n/localized';
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
        action={<LocalizedSpan className="text-xs text-slate-500">{transactions.length} of {total} records</LocalizedSpan>} />
      {transactions.length === 0 ? <LocalizedP className="px-6 py-8 text-sm text-slate-500">No transactions match these filters.</LocalizedP> : (
        <LocalizedDiv className="mt-4 overflow-x-auto">
          <LocalizedTable className="w-full min-w-[620px] text-left text-sm">
            <LocalizedThead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><LocalizedTr>
              <LocalizedTh scope="col" className="px-6 py-3 font-semibold">Date</LocalizedTh>
              <LocalizedTh scope="col" className="px-4 py-3 font-semibold">Merchant / category</LocalizedTh>
              <LocalizedTh scope="col" className="px-4 py-3 font-semibold">Classification</LocalizedTh>
              <LocalizedTh scope="col" className="px-6 py-3 text-right font-semibold">Amount</LocalizedTh>
            </LocalizedTr></LocalizedThead>
            <LocalizedTbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <LocalizedTr id={'transaction-' + transaction.id} key={transaction.id} className="align-top">
                  <LocalizedTd className="whitespace-nowrap px-6 py-4 text-slate-500">{transaction.occurredAt.slice(0, 10)}</LocalizedTd>
                  <LocalizedTd className="px-4 py-4">
                    <LocalizedSpan className="block font-medium text-slate-900">{transaction.merchant}</LocalizedSpan>
                    <LocalizedSpan className="block text-xs text-slate-500">{humanize(transaction.category)}</LocalizedSpan>
                    {transaction.anomaly ? <LocalizedSpan className="mt-1 block text-xs font-medium text-amber-700">{transaction.anomaly}</LocalizedSpan> : null}
                  </LocalizedTd>
                  <LocalizedTd className="px-4 py-4"><LocalizedSpan className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{humanize(transaction.classification)}</LocalizedSpan></LocalizedTd>
                  <LocalizedTd className={`whitespace-nowrap px-6 py-4 text-right font-semibold tabular-nums ${transaction.direction === 'credit' ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {transaction.direction === 'credit' ? '+' : '−'}{formatMoney(transaction.amount)}
                  </LocalizedTd>
                </LocalizedTr>
              ))}
            </LocalizedTbody>
          </LocalizedTable>
        </LocalizedDiv>
      )}
    </Card>
  );
}
