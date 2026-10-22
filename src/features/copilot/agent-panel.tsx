'use client';
import {useRef,useState} from 'react';
import {FufuMascot} from './fufu-mascot';
import {HumanSupport} from './human-support';
import {FEATURES} from '../../agent/capabilities';
import {AccountLink} from '../../components/shell/account-link';
import {displayAmount,type AgentPlanResult} from '../../agent/contracts';
export type AgentPending={id:string;expiresAt:number};
export type AgentOutcome={status:string;verified?:boolean;message?:string};
export type AgentTransport={plan:(command:string)=>Promise<AgentPlanResult>;prepare:(plan:AgentPlanResult,index:number)=>Promise<AgentPending>;decide:(pending:AgentPending,approve:boolean)=>Promise<AgentOutcome>;loadHistory:()=>Promise<void>};
const button='rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
const secondary='rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 disabled:opacity-50';
export function AgentPanel({source,version,transport,supportDestination}:{source:string;version:number;transport:AgentTransport;supportDestination?:string}){
 const [command,setCommand]=useState(''),[plan,setPlan]=useState<AgentPlanResult|null>(null),[pending,setPending]=useState<{token:AgentPending;index:number}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[done,setDone]=useState<Record<number,string>>({});
 const lock=useRef(false),confirmButton=useRef<HTMLButtonElement>(null);
 async function run(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:'Agent unavailable. Try again.');}finally{lock.current=false;setBusy(false);}}
 function send(text=command){void run(async()=>{setNotice('');setPending(null);setPlan(await transport.plan(text));setDone({});});}
 const stale=Boolean(plan&&plan.version!==version);
 return <section aria-label="Banking agent" className="rounded-3xl border border-blue-200 bg-white p-5 text-slate-900 shadow-sm sm:p-7">
  <div className="flex items-center gap-4 rounded-2xl bg-[#E9F9F3] p-4"><FufuMascot state={busy?'thinking':plan?.resultKind==='unsupported'?'decline':notice.startsWith('Verified')?'success':'idle'}/><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">FU Bank · meet Fufu</p><h2 className="mt-1 text-2xl font-bold">Tell us what you want to do</h2><p className="mt-1 text-sm text-slate-600">Tiny tie. Big help. You stay in charge.</p></div></div>
  <p className="mt-2 text-sm text-slate-600">{source}. Fictional finances only. Every change needs your confirmation.</p>
  <p className="mt-1 text-xs text-slate-500">{plan?.mode==='live-model'?'Live model interprets requests; validated tools calculate and act.':'Scripted language interpreter · no live AI model connected in this mode.'}</p>
  <form className="mt-5 space-y-3" onSubmit={e=>{e.preventDefault();send();}}>
   <label htmlFor="agent-command" className="block text-sm font-semibold">Your banking request</label>
   <textarea id="agent-command" maxLength={1000} rows={2} value={command} disabled={busy||Boolean(pending)} onChange={e=>setCommand(e.target.value)} placeholder="Ask Fufu about balances, transfers, budgets, tuition, investments or subscriptions…" className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900"/>
   <button type="submit" disabled={busy||Boolean(pending)||!command.trim()} className={button}>{busy?'Working…':'Send request'}</button>
  </form>
  <div className="mt-4 flex flex-wrap gap-2">{['Show my accounts','Show my budgets','Find recurring payments','Explain spending this month','Freeze my shopping card'].map(s=><button key={s} disabled={busy||Boolean(pending)} className={secondary} onClick={()=>{setCommand(s);send(s);}}>{s}</button>)}</div>
  <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">What can Fufu help with?</summary><ul className="mt-3 grid gap-2 sm:grid-cols-2">{FEATURES.map(f=><li key={f.path} className="rounded-xl bg-slate-50 p-3"><strong>{f.name}</strong><p className="mt-1 text-xs text-slate-600">{f.help}</p></li>)}</ul><p className="mt-3 text-xs text-slate-600">Use “Show my accounts”, “Show investment products” or “Show my tuition” for exact names. Changes require all fields; for example “Transfer CNY 10 from daily CNY to savings CNY” or “Set food budget to CNY 500”. Signed-in banking supports own-account immediate transfers; beneficiary and scheduled transfers are available only in the public simulation.</p></details>
  <div className="mt-4"><HumanSupport destination={plan?.supportDestination??supportDestination} summary={command}/></div>
  <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Try a reproducible sample</summary><p className="mt-2 text-slate-600">Load three months of fictional subscription charges. This adds labelled historical records, leaves opening balances unchanged, and invalidates older plans.</p><button disabled={busy||Boolean(pending)} className={secondary+' mt-3'} onClick={()=>void run(async()=>{await transport.loadHistory();setPlan(null);setNotice('Sample purchase history loaded. Ask to find recurring payments again.');})}>Load fictional purchase history</button></details>
  {plan&&<div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
   <h3 className="text-lg font-semibold">Fufu’s plan & evidence</h3><p className="whitespace-pre-wrap text-sm leading-6">{plan.message}</p>
   <p className="text-xs text-slate-500">Source: {plan.source} · As of {plan.asOf} · Reference {plan.id}</p>
   <p className="text-xs text-slate-500">Retrieved purchase history: {plan.coverage.from.slice(0,10)}–{plan.coverage.to.slice(0,10)}. {plan.coverage.truncated?'Truncated; results are incomplete.':'All available records in this window; this does not guarantee a complete account history.'}</p>
   {plan.links?.map(link=><AccountLink key={link.href} href={link.href} className={secondary+' inline-block'}>{link.label}</AccountLink>)}
   {plan.choices.map(choice=><button disabled={busy||Boolean(pending)} key={choice} className={secondary} onClick={()=>{setCommand(choice);send(choice);}}>{choice}</button>)}
   {plan.recurring.map(r=><details key={r.accountId+r.currency+r.merchant} className="rounded-xl border border-slate-200 p-4">
    <summary className="cursor-pointer font-semibold">{r.merchant} · {displayAmount(r.amountMinor,r.currency)} · {r.cadence} · {r.confidence} confidence</summary>
    <p className="mt-3 text-xs text-slate-500">Account {r.accountId}. Predicted renewal window {r.nextWindow.from}–{r.nextWindow.to}; estimate only.</p>
    <ul className="mt-2 list-inside list-disc text-sm">{r.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="pb-2 text-left font-semibold">Supporting settled transactions</caption><thead><tr><th className="pr-3">Date</th><th className="pr-3">Charge</th><th>Transaction ID</th></tr></thead><tbody>{r.evidence.map(t=><tr key={t.id}><td className="py-2 pr-3">{t.date.slice(0,10)}</td><td className="pr-3">{displayAmount(t.amountMinor,t.currency)}</td><td className="break-all">{t.id}</td></tr>)}</tbody></table></div>
   </details>)}
   {plan.subscriptions.map(s=><div key={s.id} className="rounded-xl bg-slate-50 p-4 text-sm"><strong>{s.name}</strong><p className="mt-1">{displayAmount(s.amountMinor,s.currency)} / {s.cadence==='monthly'?'month':'year'} · {s.active?'Active':'Cancelled'}</p><p>Annualized cost estimate: {displayAmount((BigInt(s.amountMinor)*(s.cadence==='monthly'?12n:1n)).toString(),s.currency)} if the price stays unchanged.</p><p>Usage: {s.usage}</p><p>Cancellation capability: {s.capability==='simulated'?'Simulated cancellation only':s.capability}</p>{s.nextRenewal&&<p>Recorded next renewal: {s.nextRenewal.slice(0,10)}</p>}<p className="mt-1 text-xs text-slate-500">Registered record. Transaction evidence is shown separately when available.</p></div>)}
   {stale&&<p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Account state changed. Send the request again to review remaining actions against fresh data.</p>}
   {plan.actions.map((action,index)=><div key={action.id} className="rounded-xl border border-blue-200 p-4"><p className="text-sm font-medium">{action.description}</p><button className={button+' mt-3'} disabled={busy||stale||Boolean(pending)||Boolean(done[index])} onClick={()=>void run(async()=>{const token=await transport.prepare(plan,index);setPending({token,index});setTimeout(()=>confirmButton.current?.focus(),0);})}>Review action {index+1}</button>{done[index]&&<p className="mt-2 text-sm">{done[index]}</p>}</div>)}
   {pending&&<section aria-label="Confirm agent action" className="rounded-2xl border-2 border-blue-600 bg-blue-50 p-5"><h3 className="font-bold">Confirm this exact change</h3><p className="mt-2 text-sm">{plan.actions[pending.index].description}</p><p className="mt-2 text-xs">Expires at {new Date(pending.token.expiresAt).toLocaleTimeString()}. Real services and money are unaffected.</p><div className="mt-4 flex flex-wrap gap-3">{[true,false].map(approve=><button ref={approve?confirmButton:undefined} key={String(approve)} className={approve?button:secondary} disabled={busy} onClick={()=>void run(async()=>{const outcome=await transport.decide(pending.token,approve);const message=outcome.status==='executed'?(outcome.verified?'Verified: the requested state was reread and matches.':'Execution reported; verification failed. Check activity before retrying.'):outcome.status==='rejected'?'Rejected; no banking change.':`Not completed: ${outcome.status}. Send the request again for fresh review.`;setDone(d=>({...d,[pending.index]:message}));setNotice(message);setPending(null);})}>{approve?'Confirm exact change':'Reject without changes'}</button>)}</div></section>}
  </div>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-950">{notice}</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
 </section>;
}
