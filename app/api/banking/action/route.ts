import { sameOrigin } from '../../../../src/lib/security/request-origin';
import { NextRequest,NextResponse } from 'next/server';
import { authenticatedBanking, securityFailure } from '../../../../src/server/secure-banking';

export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request:NextRequest){
  const headers={'Cache-Control':'private, no-store'};
  if(!sameOrigin(request))return NextResponse.json({error:'ORIGIN_REJECTED'},{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'INVALID_TYPE'},{status:415,headers});
  try{
    if(Number(request.headers.get('content-length')??0)>4096)return NextResponse.json({error:'PAYLOAD_TOO_LARGE'},{status:413,headers});
    const reader=request.body?.getReader();let text='';let bytes=0;const decoder=new TextDecoder();
    if(!reader)return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});
    while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;
      if(bytes>4096){await reader.cancel();return NextResponse.json({error:'PAYLOAD_TOO_LARGE'},{status:413,headers});}
      text+=decoder.decode(part.value,{stream:true});}
    text+=decoder.decode();
    const body=JSON.parse(text) as Record<string,unknown>;
    const session=await authenticatedBanking();
    if(!session)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401,headers});
    const guard=await session.client.rpc('bank_security_guard');
    if(guard.error){const failure=securityFailure(guard.error.message);return NextResponse.json({error:failure?.code??'BANKING_UNAVAILABLE'},{status:failure?.status??503,headers:{...headers,...(failure?.status===429?{'Retry-After':'60'}:{})}});}
    let result: {data:unknown;error:{message:string}|null};
    switch(body.operation){
      case 'initialize':
        result=await session.client.rpc('sim_initialize');
        break;
      case 'prepare':
        if(!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))return NextResponse.json({error:'INVALID_ACTION'},{status:400,headers});
        result=await session.client.rpc('sim_prepare',{p_payload:body.payload});
        break;
      case 'execute':
        if(typeof body.actionId!=='string'||!uuid.test(body.actionId)||typeof body.approve!=='boolean')return NextResponse.json({error:'INVALID_DECISION'},{status:400,headers});
        result=await session.client.rpc('sim_execute',{p_action_id:body.actionId,p_approve:body.approve});
        break;
      default:return NextResponse.json({error:'UNKNOWN_OPERATION'},{status:400,headers});
    }
    if(result.error){const failure=securityFailure(result.error.message);return NextResponse.json({error:failure?.code??'ACTION_REJECTED'},{status:failure?.status??409,headers:{...headers,...(failure?.status===429?{'Retry-After':'60'}:{})}});}
    return NextResponse.json(result.data,{headers});
  }catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});}
}
