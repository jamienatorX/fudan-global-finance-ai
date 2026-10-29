type Row=Record<string,unknown>;
const object=(value:unknown):Row=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
const show=(value:unknown)=>typeof value==='string'||typeof value==='number'?String(value):'Not recorded';
export function ExecutionEvidence({value}:{value:unknown}){
 const record=object(value),policy=object(record.policy),result=object(record.result);
 const events=[...(Array.isArray(record.events)?record.events:[]),...(Array.isArray(record.securityEvents)?record.securityEvents:[])].map(object).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
 return <article aria-label="Execution evidence" className="space-y-3 rounded-xl border p-4 text-sm">
  <h4 className="font-bold">Recorded action receipt</h4>
  <p>Fictional banking record. This shows saved evidence, not a new approval or payment.</p>
  <dl className="grid gap-2 sm:grid-cols-2">{[
   ['Action reference',record.action_id],['Permission level',policy.tier],['Permission reason',policy.reason],['Customer decision',record.decision],
   ['Verification reference',record.verification_id??'No action verification reference recorded'],['Final status',result.status],['Recorded at',record.recorded_at],
  ].map(([label,detail])=><div key={String(label)} className="min-w-0"><dt className="font-semibold">{String(label)}</dt><dd className="break-words">{show(detail)}</dd></div>)}</dl>
  <h5 className="font-semibold">Recorded events</h5>
  {events.length?<ol className="space-y-2">{events.map((event,i)=><li key={i} className="break-words"><span>{show(event.created_at)}</span> · <strong>{show(event.category??event.event)}</strong></li>)}</ol>:<p>No correlated events were returned.</p>}
  <details><summary>Inspect full recorded details</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(value,null,2)}</pre></details>
 </article>;
}

