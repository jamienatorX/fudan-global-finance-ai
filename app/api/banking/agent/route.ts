import {NextRequest,NextResponse} from 'next/server';
import {authenticatedBanking,securityFailure} from '../../../../src/server/secure-banking';
import {sameOrigin} from '../../../../src/lib/security/request-origin';
import {createBankingPlan} from '../../../../src/server/banking-agent';
export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={'Cache-Control':'private, no-store'};
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{...headers,...(status===429?{'Retry-After':'60'}:{})}});
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return respond({error:'ORIGIN_REJECTED'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return respond({error:'INVALID_TYPE'},415);
 try{
  const reader=request.body?.getReader();if(!reader)return respond({error:'INVALID_REQUEST'},400);
  const decoder=new TextDecoder();let raw='',bytes=0;
  while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>4096){await reader.cancel();return respond({error:'PAYLOAD_TOO_LARGE'},413);}raw+=decoder.decode(part.value,{stream:true});}
  raw+=decoder.decode();const body:unknown=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body))return respond({error:'INVALID_REQUEST'},400);
  const b=body as Record<string,unknown>,session=await authenticatedBanking();if(!session)return respond({error:'AUTH_REQUIRED'},401);
  const guard=await session.client.rpc('bank_security_guard');if(guard.error)throw new Error(guard.error.message);
  if(b.operation==='plan'){
   if(typeof b.command!=='string'||!b.command.trim()||b.command.length>1000)return respond({error:'INVALID_COMMAND'},400);
   return respond(await createBankingPlan(session.client,b.command));
  }
  let result;
  if(b.operation==='sample-history')result=await session.client.rpc('bank_agent_sample_history');
  else if(b.operation==='prepare'&&typeof b.planId==='string'&&uuid.test(b.planId)&&Number.isInteger(b.index)&&Number(b.index)>=0&&Number(b.index)<10)
   result=await session.client.rpc('bank_agent_prepare',{p_plan_id:b.planId,p_index:b.index});
  else if(b.operation==='execute'&&typeof b.actionId==='string'&&uuid.test(b.actionId)&&typeof b.approve==='boolean')
   result=await session.client.rpc('bank_agent_execute',{p_action_id:b.actionId,p_approve:b.approve});
  else return respond({error:'INVALID_OPERATION'},400);
  if(result.error)throw new Error(result.error.message);if(result.data?.code)return respond({error:result.data.code},409);return respond(result.data);
 }catch(error){
  const message=error instanceof Error?error.message:'';const security=securityFailure(message);
  if(security)return respond({error:security.code},security.status);
  const code=['STALE_STATE','PLAN_EXPIRED','PLAN_NOT_FOUND','ENROLLMENT_REQUIRED','HISTORY_UNAVAILABLE','MODEL_UNAVAILABLE'].find(c=>message.includes(c));
  return respond({error:code??'AGENT_UNAVAILABLE'},code?.includes('UNAVAILABLE')?503:409);
 }
}
