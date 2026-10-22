import {NextResponse,type NextRequest} from 'next/server';
import {requestOrigin} from '../lib/security/request-origin';
export async function conversationBody(request:NextRequest):Promise<Record<string,unknown>>{
 if(request.headers.get('origin')!==requestOrigin(request))throw new Error('ORIGIN_REJECTED');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('INVALID_TYPE');
 const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_REQUEST');let size=0,raw='';const decoder=new TextDecoder();
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>131072){await reader.cancel();throw new Error('PAYLOAD_TOO_LARGE');}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();
 const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('INVALID_REQUEST');
 if(Object.keys(body).some(k=>!['operation','conversationId','revision','context','message','task','taskId','include','actionId','approve','status','verified'].includes(k)))throw new Error('INVALID_REQUEST');return body;
}
export const conversationReply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store',...(status===429?{'Retry-After':'60'}:{})}});
export function conversationError(e:unknown){const message=e instanceof Error?e.message:'';const code=['ORIGIN_REJECTED','INVALID_TYPE','PAYLOAD_TOO_LARGE','AUTH_REQUIRED','MFA_REQUIRED','REAUTH_REQUIRED','SESSION_EXPIRED','RATE_LIMITED','CONVERSATION_EXPIRED','CONVERSATION_NOT_FOUND','STALE_CONVERSATION','CONVERSATION_LIMIT','MODEL_UNAVAILABLE','LOCAL_DEMO_ONLY','HISTORY_UNAVAILABLE'].find(c=>message.includes(c))??'CONVERSATION_UNAVAILABLE';return conversationReply({error:code},code==='ORIGIN_REJECTED'?403:code==='AUTH_REQUIRED'?401:code==='RATE_LIMITED'?429:code==='PAYLOAD_TOO_LARGE'?413:code.includes('UNAVAILABLE')?503:409);}
