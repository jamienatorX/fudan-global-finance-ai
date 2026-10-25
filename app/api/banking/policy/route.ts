import type {NextRequest} from 'next/server';
import {checkedRpc,competitionEndpoint,id} from '../../../../src/server/competition-http';
export const runtime='nodejs';
export async function POST(request:NextRequest){return competitionEndpoint(request,['operation','actionId','grantId'],async(client,b)=>{
 switch(b.operation){
  case 'policy':return checkedRpc(client,'bank_action_policy',{p_action_id:id(b.actionId)});
  case 'begin':return checkedRpc(client,'bank_action_verification_begin',{p_action_id:id(b.actionId)});
  case 'verify':return checkedRpc(client,'bank_action_verification_complete',{p_grant_id:id(b.grantId)});
  case 'status':return checkedRpc(client,'bank_security_status');
  case 'recover':return checkedRpc(client,'bank_security_recover');
  case 'evidence':{const result=await client.from('bank_security_events').select('id,action_id,category,created_at').order('created_at',{ascending:false}).limit(200);if(result.error)throw new Error('SERVICE_UNAVAILABLE');return {events:result.data};}
  default:throw new Error('INVALID_REQUEST');
 }
});}
