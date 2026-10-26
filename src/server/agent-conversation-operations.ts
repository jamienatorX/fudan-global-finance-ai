import {readOnlyConversationUpdate} from '../agent/conversation-read-fallback';
import {AgentModelError,modelFailureMessage} from './agent-model-provider';
import {advanceConversation,describeConversation} from '../agent/conversation-controller';
import {assertConversationCapacity,newConversation,validateUpdate,type ConversationState,type ConversationTurn} from '../agent/conversation-contracts';
import type {AgentContext} from '../agent/contracts';
import {interpretConversation} from './agent-conversation-model';
export async function applyConversationOperation(state:ConversationState,c:AgentContext,b:Record<string,unknown>):Promise<ConversationTurn>{
 const turn=await applyOperation(state,c,b);if(turn.state.revision!==state.revision)assertConversationCapacity(turn.state);return turn;
}
async function applyOperation(state:ConversationState,c:AgentContext,b:Record<string,unknown>):Promise<ConversationTurn>{
 const mode=process.env.BANK_AGENT_MODE==='live'?'live-model':'deterministic';
 if(b.operation==='load')return describeConversation(state,c,mode);
 if(b.operation==='receipt'){
  if(state.source!=='demo')throw new Error('INVALID_OPERATION');
  const d=state.drafts.find(d=>d.id===b.taskId);if(!d||typeof b.actionId!=='string'||!/^[a-f0-9-]{36}$/.test(b.actionId)||!['executed','rejected','failed','stale','expired'].includes(String(b.status))||typeof b.verified!=='boolean')throw new Error('INVALID_RECEIPT');
  if(d.receipt?.actionId===b.actionId)return describeConversation(state,c,mode);
 }
 if(b.revision!==state.revision)throw new Error('STALE_CONVERSATION');
 if(b.operation==='reset')return describeConversation({...newConversation(state.source),id:state.id,revision:state.revision+1},c,mode);
 if(state.messages.length>=40)throw new Error('CONVERSATION_LIMIT');
 if(b.operation==='message'){
  if(typeof b.message!=='string'||!b.message.trim()||b.message.length>1000)throw new Error('INVALID_MESSAGE');
  const local=readOnlyConversationUpdate(b.message,state,c);if(local)return advanceConversation(state,local,c,b.message,'deterministic');
  try{return advanceConversation(state,await interpretConversation(b.message,state,c),c,b.message,mode);}catch(e){
   const code=e instanceof AgentModelError?e.code:['MODEL_RATE_LIMITED','MODEL_TIMEOUT','MODEL_CONFIGURATION','MODEL_BAD_RESPONSE'].find(code=>e instanceof Error&&e.message.includes(code))??'MODEL_UNAVAILABLE';
   if(!(e instanceof Error)||!e.message.includes('MODEL_'))throw e;
   const next:ConversationState={...state,revision:state.revision+1,expiresAt:Date.now()+1800000,messages:[...state.messages,{role:'user',content:b.message},{role:'assistant',content:modelFailureMessage(code,/[\u3400-\u9fff]/.test(b.message))}]};
   return{...describeConversation(next,c,mode),serviceError:code};
  }
 }
 if(b.operation==='draft')return advanceConversation(state,validateUpdate({tasks:[b.task],removeIds:[]}),c,'Task fields updated using the visible task form.',mode);
 if(b.operation==='reservation'||b.operation==='receipt'){
  const next=structuredClone(state),d=next.drafts.find(d=>d.id===b.taskId);if(!d||d.status!=='draft')throw new Error('INVALID_DRAFT');
  if(b.operation==='reservation'){if(d.kind!=='subscription_payment'||typeof b.include!=='boolean')throw new Error('INVALID_DRAFT');d.reservation=b.include?'include':'exclude';next.messages.push({role:'user',content:b.include?'Include this cost hypothetically in the scenario; do not pay it.':'Exclude this hypothetical cost.'});}
  else{d.status=b.status==='executed'?'completed':b.status==='rejected'?'rejected':'failed';d.receipt={actionId:b.actionId as string,status:b.status as string,verified:b.verified as boolean};next.messages.push({role:'assistant',content:'Browser-local action receipt: '+String(b.status)+(b.verified?' (verified)':'')+'.'});}
  next.revision++;next.expiresAt=Date.now()+1800000;return describeConversation(next,c,mode);
 }
 throw new Error('INVALID_OPERATION');
}
