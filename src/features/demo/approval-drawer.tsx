'use client';
import { useDemo } from '../../demo/demo-context';

export function ApprovalDrawer() {
  const { pending, notice, approve, reject } = useDemo();
  if (!pending && !notice) return null;
  return <aside aria-label="Simulation approval and result" role="region" className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-xl rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl lg:left-72">
    {pending ? <>
      <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Review simulated change · approval required</p>
      <h2 className="mt-2 text-base font-semibold text-slate-900">{pending.action.type.toUpperCase()}</h2>
      <p className="mt-2 break-words text-xs text-slate-600">Exact action: {JSON.stringify(pending.action)}. This changes only browser-local fictional demo data, not real money.</p>
      <p className="mt-2 text-xs text-slate-500">Approval expires after 10 minutes. Changes to the account state invalidate it.</p>
      <div className="mt-4 flex gap-3">
        <button onClick={approve} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Approve simulation</button>
        <button onClick={reject} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Reject</button>
      </div>
    </> : <p role="status" className="pr-5 text-sm text-slate-700">{notice}</p>}
  </aside>;
}
