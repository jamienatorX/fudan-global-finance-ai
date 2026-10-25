import type {NextRequest} from 'next/server';
import {checkedRpc,competitionEndpoint,id,revision} from '../../../../src/server/competition-http';
export const runtime='nodejs';
export async function POST(request:NextRequest){return competitionEndpoint(request,['operation','ticketId','workflowId','revision','message','consent','command','operator'],async(client,b)=>{
 const message=()=>{if(typeof b.message!=='string'||!b.message.trim()||b.message.length>2000)throw new Error('INVALID_MESSAGE');return b.message.trim();};
 switch(b.operation){
  case 'create':return checkedRpc(client,'bank_support_create',{p_workflow_id:b.workflowId?id(b.workflowId):null,p_consent:b.consent&&typeof b.consent==='object'&&!Array.isArray(b.consent)?b.consent:{},p_message:message()});
  case 'get':return checkedRpc(client,'bank_support_get',{p_id:id(b.ticketId)});
  case 'list':return checkedRpc(client,'bank_support_list',{p_operator:b.operator===true});
  case 'reply':return checkedRpc(client,'bank_support_reply',{p_id:id(b.ticketId),p_revision:revision(b.revision),p_message:message()});
  case 'operator':if(typeof b.command!=='string'||!['claim','reply','propose','release','resolve','review_unlock'].includes(b.command))throw new Error('INVALID_REQUEST');return checkedRpc(client,'bank_operator_command',{p_id:id(b.ticketId),p_revision:revision(b.revision),p_command:b.command,p_message:['reply','propose'].includes(b.command)?message():''});
  default:throw new Error('INVALID_REQUEST');
 }
});}
