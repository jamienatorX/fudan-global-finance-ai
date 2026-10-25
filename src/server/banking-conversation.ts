import {readBankingState,type SimClient} from './secure-banking';
import {readAgentHistory} from './agent-history';
import {privateAgentContext} from '../agent/context-adapters';
import {describeConversation} from '../agent/conversation-controller';
import type {ConversationState,ConversationTurn} from '../agent/conversation-contracts';
import {applyConversationOperation} from './agent-conversation-operations';
async function rpc<T>(client:SimClient,name:string,args:Record<string,unknown>):Promise<T>{const r=await client.rpc(name,args);if(r.error)throw new Error(r.error.message);if(r.data?.code)throw new Error(String(r.data.code));return r.data as T;}
async function context(client:SimClient){const state=await readBankingState(client);if(!state.enrolled)throw new Error('ENROLLMENT_REQUIRED');const history=await readAgentHistory(client);return privateAgentContext(state,history.transactions,history.coverage);}
function privateLinks(turn:ConversationTurn){const tabs:Record<string,string>={'/overview':'overview','/accounts':'overview','/transfers':'transfers','/transactions':'activity','/wealth':'wealth','/cards':'cards','/subscriptions':'subscriptions','/planner':'budgets','/audit':'activity','/copilot':'overview'};for(const m of turn.state.messages)if(m.links)m.links=m.links.map(l=>({...l,href:tabs[l.href]?'/banking?tab='+tabs[l.href]:l.href==='/settings'?'/security':l.href}));for(const t of turn.tasks)if(t.plan?.links)t.plan.links=t.plan.links.map(l=>({...l,href:tabs[l.href]?'/banking?tab='+tabs[l.href]:l.href==='/settings'?'/security':l.href}));return turn;}
export async function bankingConversation(client:SimClient,b:Record<string,unknown>){
 if(b.context!==undefined||b.status!==undefined||b.verified!==undefined)throw new Error('INVALID_REQUEST');
 const cid=typeof b.conversationId==='string'?b.conversationId:null;
 let state:ConversationState;try{state=await rpc<ConversationState>(client,'bank_conversation_open',{p_id:cid});}catch(e){if(b.operation!=='reset'||!/(CONVERSATION_NOT_FOUND|CONVERSATION_EXPIRED)/.test(e instanceof Error?e.message:''))throw e;state=await rpc<ConversationState>(client,'bank_conversation_open',{p_id:null});b.revision=state.revision;}
 const c=await context(client);
 const mode=process.env.BANK_AGENT_MODE==='live'?'live-model':'deterministic';
 if(b.operation==='prepare'){
  if(b.revision!==state.revision)throw new Error('STALE_CONVERSATION');
  const task=describeConversation(state,c,mode).tasks.find(t=>t.draft.id===b.taskId);
  if(task?.status!=='ready'||task.plan?.actions.length!==1)throw new Error('INVALID_DRAFT');
  const prepared=await rpc<{id:string;expiresInSeconds:number}>(client,'bank_conversation_prepare',{p_id:state.id,p_revision:state.revision,p_task:task.draft.id,p_plan:task.plan});
  return{pending:{id:prepared.id,expiresAt:Date.now()+prepared.expiresInSeconds*1000,description:task.plan.actions[0].description,taskId:task.draft.id,conversationId:state.id,revision:state.revision}};
 }
 if(b.operation==='execute'){
  if(typeof b.actionId!=='string'||typeof b.approve!=='boolean')throw new Error('INVALID_REQUEST');
  // Record verifies the action's conversation link and reads the actual immutable result.
  // Check association before execution as well, so a caller cannot decide a different conversation's action.
  const actions=await client.from('sim_actions').select('id').eq('id',b.actionId).limit(1);if(actions.error||!actions.data?.length)throw new Error('ACTION_NOT_FOUND');
  const links=await client.from('sim_audit').select('detail').eq('action_id',b.actionId).eq('event','agent.action.prepared').limit(1);if(links.error||!links.data?.length)throw new Error('CONVERSATION_ACTION_REQUIRED');
  const planId=(links.data[0].detail as Record<string,unknown>)?.correlationId;
  const plans=await client.from('sim_agent_plans').select('plan').eq('id',planId).limit(1);if(plans.error||(plans.data?.[0]?.plan as Record<string,unknown>)?.conversationId!==state.id)throw new Error('CONVERSATION_ACTION_REQUIRED');
  const outcome=await rpc<{status:string;verified:boolean;code?:string}>(client,'bank_agent_execute',{p_action_id:b.actionId,p_approve:b.approve});
  if(outcome.code)throw new Error(outcome.code);
  const next=await rpc<ConversationState>(client,'bank_conversation_record',{p_id:state.id,p_action:b.actionId});
  return{turn:privateLinks(describeConversation(next,await context(client),mode)),outcome};
 }
 const turn=await applyConversationOperation(state,c,b);
 if(turn.state.revision!==state.revision)turn.state=await rpc<ConversationState>(client,'bank_conversation_save',{p_id:state.id,p_revision:state.revision,p_state:turn.state});
 return privateLinks(turn);
}
