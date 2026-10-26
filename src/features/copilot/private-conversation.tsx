'use client';
import type {ConversationTurn} from '../../agent/conversation-contracts';
import {ConversationPanel,type ConversationPending} from './conversation-panel';
import {conversationPost} from './conversation-client';
export function PrivateConversation({supportDestination,refresh,version}:{supportDestination?:string;refresh:()=>Promise<void>;version:number}){
 const request=(b:Record<string,unknown>)=>conversationPost<ConversationTurn>('/api/banking/conversation',b);
 return <ConversationPanel version={version} source="Signed-in banking simulation" supportDestination={supportDestination} transport={{request,loadHistory:async()=>{await conversationPost('/api/banking/agent',{operation:'sample-history'});await refresh();},
  prepare:async(turn,taskId)=>(await conversationPost<{pending:ConversationPending}>('/api/banking/conversation',{operation:'prepare',conversationId:turn.state.id,revision:turn.state.revision,taskId})).pending,
  decide:async(p,approve)=>{const r=await conversationPost<{turn:ConversationTurn;outcome:{status:string;verified:boolean}}>('/api/banking/conversation',{operation:'execute',conversationId:p.conversationId,revision:p.revision,actionId:p.id,approve});await refresh();return r;},
 }}/ >;
}
