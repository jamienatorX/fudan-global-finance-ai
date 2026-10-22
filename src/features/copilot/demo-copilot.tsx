'use client';

import {useRef} from 'react';
import {useDemo} from '../../demo/demo-context';
import {demoAgentContext} from '../../agent/context-adapters';
import {planQuote} from '../../agent/fx-tool';
import type {ReferenceQuote} from '../fx/reference-quote';
import {planCommand} from '../../agent/planner';
import type {AgentPlanResult,Proposal} from '../../agent/contracts';
import {DemoConversation} from './demo-conversation';
import {AgentPanel} from './agent-panel';
export function DemoCopilot({supportDestination}:{supportDestination?:string}){
 const demo=useDemo(),plans=useRef(new Map<string,AgentPlanResult>()),pending=useRef(new Map<string,{payload:Proposal;version:number;expiresAt:number}>());
 return <><DemoConversation supportDestination={supportDestination}/><details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Single-task tools</summary><div className="mt-4"><AgentPanel supportDestination={supportDestination} source="Browser-local simulation" version={demo.version} transport={{
  plan:async command=>{const context=demoAgentContext(demo.snapshot,demo.version);const plan=planCommand(command,context);const quote=await planQuote(command,context,async(base,quote)=>{const r=await fetch('/api/fx/rate?'+new URLSearchParams({base,quote}),{signal:AbortSignal.timeout(8000)});return r.ok?await r.json() as ReferenceQuote:undefined;});if(quote)Object.assign(plan,quote);plans.current.set(plan.id,structuredClone(plan));return plan;},
  prepare:async(plan,index)=>{const stored=plans.current.get(plan.id);if(!stored||stored.version!==demo.version||stored.expiresAt<Date.now())throw new Error('Plan expired or state changed. Send the request again.');const action=stored.actions[index];if(!action)throw new Error('Action unavailable');const id=crypto.randomUUID(),expiresAt=Math.min(stored.expiresAt,Date.now()+600000);pending.current.set(id,{payload:structuredClone(action.payload),version:stored.version,expiresAt});return{id,expiresAt};},
  decide:async (token,approve)=>{const p=pending.current.get(token.id);if(!p)throw new Error('Confirmation unavailable. Please replan.');return demo.decideAgent(token.id,p.payload,p.version,p.expiresAt,approve);},
  loadHistory:async()=>demo.loadAgentHistory(),
 }}/></div></details></>
}
