import { NextRequest,NextResponse } from 'next/server';
import { authenticatedBanking } from '../../../../src/server/secure-banking';

export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sameOrigin(request:Pick<NextRequest,'headers'|'nextUrl'>):boolean {
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try{
    const parsed=new URL(origin);
    return parsed.protocol==='https:' || parsed.protocol==='http:'
      ? parsed.origin===request.nextUrl.origin : false;
  }catch{return false;}
}
export async function POST(request:NextRequest){
  const headers={'Cache-Control':'private, no-store'};
  if(!sameOrigin(request))return NextResponse.json({error:'ORIGIN_REJECTED'},{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'INVALID_TYPE'},{status:415,headers});
  try{
    const text=await request.text();
    if(new TextEncoder().encode(text).length>4096)return NextResponse.json({error:'PAYLOAD_TOO_LARGE'},{status:413,headers});
    const body=JSON.parse(text) as Record<string,unknown>;
    const session=await authenticatedBanking();
    if(!session)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401,headers});
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
    if(result.error)return NextResponse.json({error:'ACTION_REJECTED',message:result.error.message.slice(0,180)},{status:409,headers});
    return NextResponse.json(result.data,{headers});
  }catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});}
}
