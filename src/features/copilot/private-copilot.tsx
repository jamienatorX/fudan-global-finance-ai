'use client';
import {PrivateConversation} from './private-conversation';
import {AgentPanel,type AgentOutcome,type AgentPending} from './agent-panel';
import type {AgentPlanResult} from '../../agent/contracts';
async function post<T>(body:unknown):Promise<T>{
 const r=await fetch('/api/banking/agent',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
 const result=await r.json();if(!r.ok){const code=result.error;throw new Error(code==='MFA_REQUIRED'||code==='REAUTH_REQUIRED'?'Verify again under Security, then review a fresh plan.':code==='STALE_STATE'||code==='PLAN_EXPIRED'?'Plan expired or state changed. Send your request again.':code==='AUTH_REQUIRED'||code==='SESSION_EXPIRED'?'Your session ended. Sign in again.':code==='RATE_LIMITED'?'Too many requests. Please wait a minute.':code==='MODEL_UNAVAILABLE'?'Fufu’s language service is unavailable. Check the server provider, key, model and supported structured outputs. No action was confirmed.':code==='HISTORY_UNAVAILABLE'?'Purchase history is unavailable. The agent database migration may need to be applied.':'Agent unavailable. No success was confirmed; check activity before retrying.');}return result as T;
}
export function PrivateCopilot({version,refresh,supportDestination}:{version:number;refresh:()=>Promise<void>;supportDestination?:string}){
 return <><PrivateConversation version={version} supportDestination={supportDestination} refresh={refresh}/><details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Single-task tools</summary><div className="mt-4"><AgentPanel supportDestination={supportDestination} source="Signed-in banking simulation" version={version} transport={{
  plan:command=>post<AgentPlanResult>({operation:'plan',command}),
  prepare:async(plan,index)=>{const result=await post<{id:string;expiresInSeconds:number}>({operation:'prepare',planId:plan.id,index});return{id:result.id,expiresAt:Date.now()+result.expiresInSeconds*1000};},
  decide:async(pending:AgentPending,approve)=>{const outcome=await post<AgentOutcome>({operation:'execute',actionId:pending.id,approve});await refresh();return outcome;},
  loadHistory:async()=>{await post({operation:'sample-history'});await refresh();},
 }}/></div></details></>
}
