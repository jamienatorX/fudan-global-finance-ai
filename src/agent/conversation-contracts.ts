import type {AgentPlanResult} from './contracts';
export const TASK_KINDS=['read','transfer','budget','tuition','investment','card','cancel_subscription','subscription_payment','affordability','unsupported'] as const;
export type TaskKind=typeof TASK_KINDS[number];
export type DraftTask={id:string;kind:TaskKind;source:string;target:string;amountMinor:string;currency:string;category:string;mode:string;schedule:string;risk:string;query:string;reservation:'ask'|'include'|'exclude';status:'draft'|'completed'|'rejected'|'failed'|'skipped';receipt?:{actionId:string;status:string;verified:boolean}};
export type DraftUpdate=Omit<DraftTask,'reservation'|'status'|'receipt'>;
export type ConversationUpdate={reply?:string;tasks:DraftUpdate[];removeIds:string[]};
export type ConversationState={id:string;revision:number;source:'demo'|'private';messages:{role:'user'|'assistant';content:string;links?:{href:string;label:string}[]}[];drafts:DraftTask[];expiresAt:number};
export type AffordabilityResult={currency:string;availableMinor:string;obligationsMinor:string;proposedCashMinor:string;additionalMinor:string;scenarioNeedsMinor:string;cashRemainingMinor:string;budgetRemainingMinor:string|null;categoryRemainingMinor:string|null;sourceWarnings:string[];limitations:string[];verdict:'limited'|'insufficient'|'within-recorded-limits';asOf:string};
export type ConversationTask={draft:DraftTask;status:'ready'|'needs-input'|'unsupported'|'completed'|'rejected'|'failed'|'skipped';message:string;question?:string;plan?:AgentPlanResult};
export type ConversationTurn={serviceError?:string;state:ConversationState;tasks:ConversationTask[];question?:string;impact:AffordabilityResult|null;impacts?:AffordabilityResult[];mode:'live-model'|'deterministic';entities:{accounts:{id:string;name:string;currency:string}[];recipients:{id:string;name:string}[];products:{id:string;name:string}[];tuition:{id:string;name:string}[];cards:{id:string;name:string}[];subscriptions:{id:string;name:string}[]}};
export const blankTask=(kind:TaskKind):DraftUpdate=>({id:'',kind,source:'',target:'',amountMinor:'',currency:'',category:'',mode:'',schedule:'',risk:'',query:''});
export function newConversation(source:'demo'|'private'):ConversationState{return{id:crypto.randomUUID(),source,revision:0,messages:[],drafts:[],expiresAt:Date.now()+1800000};}
export function validateUpdate(value:unknown):ConversationUpdate{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('INVALID_DRAFT');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).filter(k=>k!=='reply').sort().join(',')!=='removeIds,tasks'||('reply' in v&&(typeof v.reply!=='string'||v.reply.length>2000))||!Array.isArray(v.tasks)||v.tasks.length>6||!Array.isArray(v.removeIds)||v.removeIds.length>6||v.removeIds.some(id=>typeof id!=='string'||id.length>80))throw new Error('INVALID_DRAFT');
 const keys=Object.keys(blankTask('read')).sort().join(',');
 const tasks=v.tasks.map((task:unknown)=>{if(!task||typeof task!=='object'||Array.isArray(task))throw new Error('INVALID_DRAFT');const t=task as Record<string,unknown>;
  if(Object.keys(t).sort().join(',')!==keys||Object.values(t).some(x=>typeof x!=='string'||x.length>500)||!TASK_KINDS.includes(t.kind as TaskKind)||t.amountMinor&&!/^[1-9]\d{0,10}$/.test(t.amountMinor as string)||t.currency&&!['CNY','USD','IDR','SGD'].includes(t.currency as string)||t.category&&!['rent','food','transportation','shopping','other'].includes(t.category as string)||t.risk&&!['low','medium','high'].includes(t.risk as string))throw new Error('INVALID_DRAFT');return t as unknown as DraftUpdate;});
 return{tasks,removeIds:v.removeIds as string[],...(typeof v.reply==='string'?{reply:v.reply}: {})};
}
