import type {SubscriptionEvidence as Evidence} from '../../agent/conversation-contracts';
import {displayAmount} from '../../agent/contracts';
function money(amount:string,currency:string){try{return displayAmount(amount,currency);}catch{return 'Amount unavailable';}}
/** Historical conversation evidence is an explanatory snapshot, never execution authority. */
export function SubscriptionEvidence({evidence}:{evidence:Evidence}){
 return <section aria-label="Subscription evidence" className="mt-4 min-w-0 space-y-4 text-sm">
  <h3 className="font-bold">Recurring payments · evidence</h3>
  <p className="text-xs text-[var(--color-text-muted)]">Recorded as of {evidence.asOf.slice(0,10)}. History: {evidence.coverage.from.slice(0,10)}–{evidence.coverage.to.slice(0,10)}. {evidence.coverage.truncated?'History is truncated.':'Available records only; a complete account history is not guaranteed.'}</p>
  {!evidence.candidates.length&&<p>There aren’t enough dated charges to establish a recurring pattern. Registered subscriptions below are separate records, not transaction-detected evidence.</p>}
  {evidence.candidates.map((r,i)=><article key={i} className="rounded-xl border border-[var(--color-border)] p-3">
   <h4 className="font-semibold">{r.merchant} · {money(r.amountMinor,r.currency)} / {r.cadence}</h4>
   <p className="mt-1">Confidence: {r.confidence}. This is a pattern heuristic, not proof of a subscription contract.</p>
   <ul className="mt-2 list-disc pl-5">{r.reasons.map((reason,j)=><li key={j}>{reason}</li>)}</ul>
   <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="text-left font-semibold">Supporting settled charges (up to three)</caption><thead><tr><th scope="col" className="py-2 pr-4">Date</th><th scope="col" className="py-2 pr-4">Amount</th><th scope="col" className="py-2">Record</th></tr></thead><tbody>{r.evidence.map((charge,j)=><tr key={j}><td className="py-1 pr-4 whitespace-nowrap">{charge.date.slice(0,10)}</td><td className="py-1 pr-4 whitespace-nowrap">{money(charge.amountMinor,charge.currency)}</td><td className="max-w-40 break-all py-1">{charge.id}</td></tr>)}</tbody></table></div>
   <p className="mt-2 text-xs">Estimated next charge window: {r.nextWindow.from.slice(0,10)}–{r.nextWindow.to.slice(0,10)}. No cancellation capability is inferred from a pattern.</p>
  </article>)}
  {evidence.subscriptions.length>0&&<div><h4 className="font-semibold">Registered subscriptions · capability checks</h4><ul className="mt-2 space-y-3">{evidence.subscriptions.map(s=><li key={s.id}><strong>{s.name}</strong> · {money(s.amountMinor,s.currency)} / {s.cadence} · {s.active?'Active':'Inactive'}<br/>Cancellation: {s.capability==='simulated'?'Supported in the fictional banking ledger; exact confirmation required.':s.capability==='merchant-managed'?'Managed by the merchant; bank cancellation unavailable.':'Not verified; cancellation unavailable.'}<br/>Usage: {s.usage}. {s.nextRenewal&&'Recorded renewal: '+s.nextRenewal.slice(0,10)+'.'}</li>)}</ul></div>}
  <p className="text-xs text-[var(--color-text-muted)]">Showing {evidence.candidates.length} of {evidence.candidateCount} detected patterns and {evidence.subscriptions.length} of {evidence.subscriptionCount} registered subscriptions. These are historical results for this reply; ask again to refresh. No payment or cancellation was made.</p>
 </section>;
}
