'use client';
import {useRef} from 'react';
import {useDemo} from '../../demo/demo-context';
import type {Proposal} from '../../agent/contracts';
import type {ConversationTask,ConversationTurn} from '../../agent/conversation-contracts';
import {ConversationPanel,type ConversationPending} from './conversation-panel';
import {conversationPost} from './conversation-client';
export function DemoConversation({supportDestination}:{supportDestination?:string}){
 const demo=useDemo(),tokens=useRef(new Map<string,{payload:Proposal;version:number;pending:ConversationPending}>());
 const request=(b:Record<string,unknown>)=>conversationPost<ConversationTurn>('/api/agent/demo-conversation',{...b,context:demo.getAgentContext()});
 return <ConversationPanel version={demo.version} source="Browser-local fictional demo" supportDestination={supportDestination} transport={{request,
  prepare:async(turn,taskId)=>{const r=await conversationPost<{task:ConversationTask}>('/api/agent/demo-conversation',{operation:'review',conversationId:turn.state.id,revision:turn.state.revision,taskId,context:demo.getAgentContext()});const action=r.task.plan?.actions[0];if(!action||!r.task.plan)throw new Error('This task needs fresh details.');const pending={id:crypto.randomUUID(),taskId,conversationId:turn.state.id,revision:turn.state.revision,expiresAt:r.task.plan.expiresAt,description:action.description};tokens.current.set(pending.id,{payload:structuredClone(action.payload),version:r.task.plan.version,pending});return pending;},
  decide:async(p,approve)=>{const saved=tokens.current.get(p.id);if(!saved)throw new Error('Confirmation expired. Review again.');
   // A replay already recorded locally uses the original receipt even if the conversation revision advanced.
   const context=demo.getAgentContext(),original=demo.snapshot.auditEvents.some(e=>e.targetId===p.id&&e.eventType.startsWith('agent.action.'));
   if(!original)await conversationPost('/api/agent/demo-conversation',{operation:'review',conversationId:p.conversationId,revision:p.revision,taskId:p.taskId,context});
   const outcome=demo.decideAgent(p.id,saved.payload,saved.version,p.expiresAt,approve);
   const turn=await request({operation:'receipt',conversationId:p.conversationId,revision:p.revision,taskId:p.taskId,actionId:p.id,status:outcome.status,verified:outcome.verified});return{turn,outcome};},
 }}/ >;
}
