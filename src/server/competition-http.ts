import {NextResponse,type NextRequest} from 'next/server';
import {sameOrigin} from '../lib/security/request-origin';
import {authenticatedBanking,type SimClient} from './secure-banking';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function id(value:unknown):string {if(typeof value!=='string'||!UUID.test(value))throw new Error('INVALID_REQUEST');return value;}
export function revision(value:unknown):number {if(!Number.isSafeInteger(value)||Number(value)<0)throw new Error('INVALID_REQUEST');return Number(value);}
export async function checkedRpc(client:SimClient,name:string,args:Record<string,unknown>={}){
 const r=await client.rpc(name,args);if(r.error)throw new Error(r.error.message);
 if(r.data?.code)throw new Error(String(r.data.code));return r.data;
}
export function reply(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});}
export async function competitionEndpoint(request:NextRequest,keys:string[],handler:(client:SimClient,b:Record<string,unknown>)=>Promise<unknown>){
 try{
  if(!sameOrigin(request))return reply({error:'ORIGIN_REJECTED'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'INVALID_TYPE'},415);
  const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_REQUEST');let raw='';let size=0;const decoder=new TextDecoder();
  while(true){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>8192){await reader.cancel();return reply({error:'PAYLOAD_TOO_LARGE'},413);}raw+=decoder.decode(p.value,{stream:true});}raw+=decoder.decode();
  let b:Record<string,unknown>;try{b=JSON.parse(raw);}catch{throw new Error('INVALID_REQUEST');}
  if(!b||Array.isArray(b)||typeof b!=='object'||Object.keys(b).some(k=>!keys.includes(k)))throw new Error('INVALID_REQUEST');
  const session=await authenticatedBanking();if(!session)return reply({error:'AUTH_REQUIRED'},401);
  await checkedRpc(session.client,'bank_security_guard');return reply(await handler(session.client,b));
 }catch(e){
  const message=e instanceof Error?e.message:'';
  const known=['AUTH_REQUIRED','MFA_REQUIRED','REAUTH_REQUIRED','SESSION_EXPIRED','SAFETY_LOCKED','ACTION_VERIFICATION_REQUIRED','FRESH_CHALLENGE_REQUIRED','VERIFICATION_EXPIRED','STALE_STATE','STALE_WORKFLOW','STALE_CONVERSATION','STALE_TICKET','WORKFLOW_NOT_FOUND','ACTION_NOT_FOUND','OPERATOR_REQUIRED','ASSIGNMENT_REQUIRED','TICKET_NOT_FOUND','SUPPORT_LIMIT','TICKET_ALREADY_ASSIGNED','HUMAN_TAKEOVER_ACTIVE','MANUAL_REVIEW_REQUIRED','NO_RECOVERY_AVAILABLE','PAUSE_WORKFLOW_FIRST','OPERATOR_REVIEW_REQUIRED','NO_READY_NODE','INVALID_REQUEST','INVALID_MESSAGE','RATE_LIMITED','PLAN_NOT_READY','JOB_NOT_FOUND','JOB_NOT_READY','INVALID_JOB_COMMAND','MANDATE_SESSION_REVOKED','INVALID_PERIOD','INVALID_ACTION_FIELDS','INVALID_ASSESSMENT'];
  const code=known.find(c=>message===c||message.startsWith(c+' '))??'SERVICE_UNAVAILABLE';
  return reply({error:code},code==='AUTH_REQUIRED'||code==='SESSION_EXPIRED'?401:code==='INVALID_REQUEST'||code==='INVALID_MESSAGE'?400:code==='OPERATOR_REQUIRED'||code==='MFA_REQUIRED'?403:code==='RATE_LIMITED'?429:code==='SERVICE_UNAVAILABLE'?503:409);
 }
}
