'use client';
import { useDemo } from '../../demo/demo-context';
import { formatMoney, money } from '../../domain/money';

export function ApprovalDrawer() {
  const { snapshot, pending, notice, approve, reject } = useDemo();
  function detail(key: string, value: string) {
    if (key === 'sourceId' || key === 'destinationId') {
      const account = snapshot.accounts.find(a => a.id === value);
      return account ? `${account.currency} ${account.type}` : value;
    }
    if (key === 'beneficiaryId') return snapshot.beneficiaries.find(b => b.id === value)?.displayName ?? value;
    if (key === 'cardId') return snapshot.cards.find(c => c.id === value)?.maskedNumber ?? value;
    if (key === 'subscriptionId') return snapshot.subscriptions.find(s => s.id === value)?.merchant ?? value;
    if (key === 'productId') return snapshot.investmentProducts.find(p => p.id === value)?.name.replace(/^Demo /, '') ?? value;
    if (key === 'tuitionId') return snapshot.tuitionObligations.find(t => t.id === value)?.institution ?? value;
    if (key === 'amountMinor' || key === 'limitMinor') {
      const sourceId = pending && 'sourceId' in pending.action ? pending.action.sourceId : '';
      const currency = snapshot.accounts.find(a => a.id === sourceId)?.currency ?? 'CNY';
      return formatMoney(money(BigInt(value), currency));
    }
    return value;
  }
  const labels: Record<string, string> = { sourceId: 'From', destinationId: 'To', beneficiaryId: 'Recipient', cardId: 'Card', subscriptionId: 'Subscription', productId: 'Product', tuitionId: 'Tuition', amountMinor: 'Amount', limitMinor: 'Limit', scheduledAt: 'Scheduled date', mode: 'Change', category: 'Category', direction: 'Order' };
  if (!pending && !notice) return null;
  return <aside aria-label="Review and confirmation" role="region" className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-xl rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl lg:left-72">
    {pending ? <>
      <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Review & confirm · approval required</p>
      <h2 className="mt-2 text-base font-semibold text-slate-900">{pending.action.type.toUpperCase()}</h2>
      <dl className="mt-3 space-y-2 text-sm">{Object.entries(pending.action).filter(([key]) => key !== 'type').map(([key, value]) => <div key={key} className="flex justify-between gap-4"><dt className="text-slate-500">{labels[key] ?? key}</dt><dd className="break-words text-right font-medium capitalize text-slate-900">{detail(key, String(value))}</dd></div>)}</dl>
      <div className="mt-4 flex gap-3">
        <button onClick={approve} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Confirm</button>
        <button onClick={reject} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button>
      </div>
    </> : <p role="status" className="pr-5 text-sm text-slate-700">{notice}</p>}
  </aside>;
}

