import type {SimClient} from './secure-banking';
import {readBankingState} from './secure-banking';
import {readAgentHistory} from './agent-history';
import {privateAgentContext} from '../agent/context-adapters';
import {describeConversation} from '../agent/conversation-controller';
import type {ConversationState} from '../agent/conversation-contracts';
import {checkedRpc} from './competition-http';
export async function createConversationWorkflow(client:SimClient,conversationId:string,revision:number){
 const state=await checkedRpc(client,'bank_conversation_open',{p_id:conversationId}) as ConversationState;
 if(state.revision!==revision)throw new Error('STALE_CONVERSATION');
 const banking=await readBankingState(client),history=await readAgentHistory(client);
 const turn=describeConversation(state,privateAgentContext(banking,history.transactions,history.coverage),'deterministic');
 const actions=turn.tasks.filter(t=>t.status==='ready').flatMap(t=>t.plan?.actions??[]);
 if(!actions.length||actions.length>10)throw new Error('PLAN_NOT_READY');
 const plan={id:crypto.randomUUID(),version:banking.version,conversationId,mode:'deterministic',actions};
 await checkedRpc(client,'bank_agent_store_plan',{p_plan:plan});
 return checkedRpc(client,'bank_workflow_create',{p_plan_id:plan.id,p_dependencies:null});
}
