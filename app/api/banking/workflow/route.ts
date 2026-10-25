import type {NextRequest} from 'next/server';
import {checkedRpc,competitionEndpoint,id,revision} from '../../../../src/server/competition-http';
import {createConversationWorkflow} from '../../../../src/server/banking-workflows';
export const runtime='nodejs';
export async function POST(request:NextRequest){return competitionEndpoint(request,['operation','conversationId','revision','workflowId','command','actionId'],async(client,b)=>{
 switch(b.operation){
  case 'create':return createConversationWorkflow(client,id(b.conversationId),revision(b.revision));
  case 'list':{const r=await client.from('bank_workflows').select('id,status,revision,created_at').order('created_at',{ascending:false}).limit(10);if(r.error)throw new Error('SERVICE_UNAVAILABLE');return {workflows:r.data};}
  case 'get':return checkedRpc(client,'bank_workflow_get',{p_id:id(b.workflowId)});
  case 'command':if(typeof b.command!=='string'||!['advance','pause','resume','cancel_remaining','confirm','reject'].includes(b.command))throw new Error('INVALID_REQUEST');return checkedRpc(client,'bank_workflow_command',{p_id:id(b.workflowId),p_revision:revision(b.revision),p_command:b.command,p_action_id:b.actionId?id(b.actionId):null});
  case 'recovery':return checkedRpc(client,'bank_workflow_recovery_prepare',{p_id:id(b.workflowId),p_revision:revision(b.revision)});
  default:throw new Error('INVALID_REQUEST');
 }
});}
