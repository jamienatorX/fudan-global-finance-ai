'use client';
import { useEffect, useState } from 'react';
import { useDemo } from '../../demo/demo-context';
import type { DemoBatchStep } from '../../demo/demo-engine';
import { FLAGSHIP_COMMAND, interpretDemoCommand } from '../../agent/deterministic-demo';
import { formatMoney } from '../../domain/money';
import { projectedRunway } from './planning-helpers';
import Link from 'next/link';

type Plan=Readonly<{steps:readonly DemoBatchStep[]; labels:readonly string[]; messages:readonly string[]; version:number; expiresAt:number; command:string}>;
export function CopilotWorkspace({ initialPrompt = '', presentation = false }: Readonly<{initialPrompt?:string;presentation?:boolean}>) {
  const {snapshot,version,executeBatch,results}=useDemo();
  const [command,setCommand]=useState(initialPrompt);
  const [plan,setPlan]=useState<Plan|null>(null);
  const [approval,setApproval]=useState<Record<string,boolean>>({});
  const [done,setDone]=useState(false);
  function prepare(text:string) {
    const interpretation=interpretDemoCommand(text,snapshot);
    const steps=interpretation.steps.map(s=>({action:s.action,approved:false,id:crypto.randomUUID()}));
    setPlan({steps,labels:interpretation.steps.map(s=>s.label),messages:interpretation.messages,version,expiresAt:Date.now()+600_000,command:text});
    setApproval({});setDone(false);setCommand(text);
  }
  useEffect(()=>{if(initialPrompt){const i=interpretDemoCommand(initialPrompt,snapshot);
    // Initial shared-link hydration occurs only when opening this workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlan({steps:i.steps.map(s=>({action:s.action,approved:false,id:crypto.randomUUID()})),
      labels:i.steps.map(s=>s.label),messages:i.messages,version,expiresAt:Date.now()+600_000,command:initialPrompt});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApproval({});setDone(false);
  // Only seed the initial shared-link prompt. Do not silently reset an edited plan on balance changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }},[initialPrompt]);
  const runway=projectedRunway(snapshot);
  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-widest text-blue-700">{presentation?'Flagship judge demonstration':'Deterministic simulated AI agent'}</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">{presentation?'Competition demonstration':'AI banking copilot'}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">The command interpreter is rules-based and works without a paid model. It reads the same browser-local financial state as all six scenarios. Proposed changes require independent human approval. No real financial services are connected.</p>
    </header>
    {presentation&&<div className="grid gap-3 sm:grid-cols-3">
      {[['Problem','Students manage multi-currency balances, tuition and recurring costs in separate places.'],['Approach','One simulated financial state, deterministic tools, plan and approval checkpoints.'],['Proof','Approve actions individually and verify balances, budgets, subscriptions and audit events.']].map(([heading,body])=><section key={heading} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{heading}</h2><p className="mt-2 text-sm text-slate-600">{body}</p></section>)}
    </div>}
    <section className="rounded-2xl bg-[var(--color-navy)] p-6 text-white">
      <form onSubmit={e=>{e.preventDefault();prepare(command)}} className="space-y-3">
        <label htmlFor="agent-command" className="block text-sm font-semibold">Your banking instruction</label>
        <textarea id="agent-command" value={command} onChange={e=>setCommand(e.target.value)} rows={3} className="w-full rounded-xl border border-white/20 bg-white p-4 text-sm text-slate-950" placeholder="e.g. Pay tuition, reduce shopping by 20% and cancel unused video"/>
        <div className="flex flex-wrap gap-3"><button type="submit" className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">Create reviewable plan</button>
          <button type="button" onClick={()=>prepare(FLAGSHIP_COMMAND)} className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Load flagship demo</button></div>
      </form>
    </section>
    {plan&&<section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold">Plan · retrieve → calculate → review → approve → execute → verify</h2>
      <p className="mt-2 text-xs text-slate-500">Proposed from version {plan.version}. Approvals expire after 10 minutes and are invalidated by intervening state changes.</p>
      <div className="mt-4 space-y-3">{plan.steps.map((step,index)=><label key={step.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
        <input type="checkbox" className="mt-1 size-4" disabled={done} checked={approval[step.id]??false} onChange={e=>setApproval(p=>({...p,[step.id]:e.target.checked}))}/>
        <span className="min-w-0"><strong className="text-sm text-slate-900">{plan.labels[index]}</strong><span className="mt-1 block break-words text-xs text-slate-500">{JSON.stringify(step.action)}</span>
        <span className="mt-1 block text-xs text-blue-700">Explicit opt-in required. Unchecked actions will be rejected without side effects.</span></span>
      </label>)}</div>
      {plan.messages.map((m,i)=><p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" key={i}>{m}</p>)}
      {plan.steps.length>0&&!done&&<button type="button" className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700" onClick={()=>{
        executeBatch(plan.steps.map(s=>({...s,approved:Boolean(approval[s.id])})),plan.version,plan.expiresAt);
        setDone(true);
      }}>Execute only selected approved simulations</button>}
      {plan.steps.length===0&&<p className="mt-4 text-sm text-slate-500">This request has no state-changing actions.</p>}
      {done&&<p className="mt-4 text-sm font-semibold text-emerald-700">Execution attempt submitted. Review the outcome and fresh figures below.</p>}
    </section>}
    {done&&<section className="rounded-2xl border border-slate-200 bg-white p-6" aria-label="Verification results">
      <h2 className="text-lg font-semibold">Verification results</h2>
      <div className="mt-3 space-y-2">{results.map(r=><p key={r.id} className="text-sm"><strong className={r.status==='executed'?'text-emerald-700':'text-amber-700'}>{r.status.toUpperCase()}</strong> · {r.message}</p>)}</div>
      <p className="mt-4 text-sm">Available CNY (reference): <strong>{formatMoney(runway.available)}</strong></p>
      <p className="mt-1 text-sm">Monthly budget caps: <strong>{formatMoney(runway.monthly)}</strong></p>
      <p className="mt-1 text-sm">Outstanding tuition: <strong>{formatMoney(runway.due)}</strong></p>
      <p className="mt-1 text-sm">Updated illustrative runway: <strong>{runway.months===null?'Not finite':runway.months+' months'}</strong></p>
      <Link href="/audit" className="mt-4 inline-block text-sm font-semibold text-blue-700 underline">View correlated audit events</Link>
    </section>}
    {presentation&&<section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Six integrated AI banking scenarios</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
        ['Smart transfers','/transfers'],['Bill analysis','/transactions'],['Wealth management','/wealth'],
        ['Virtual card controls','/cards'],['Subscription optimization','/subscriptions'],['Cross-scenario AI agent','/copilot']
      ].map(([name,href])=><Link href={href} className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 hover:bg-blue-100" key={name}>{name} →</Link>)}</div>
      <p className="mt-4 text-xs text-slate-500">Next.js / React · TypeScript domain engine · simulation persistence in browser local storage · standalone Supabase schema with RLS · Vercel hosting. Browser storage is not a trusted banking backend.</p>
    </section>}
  </div>;
}
