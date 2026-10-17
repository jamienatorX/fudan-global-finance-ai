import { NextRequest,NextResponse } from 'next/server';
import { authenticatedBanking,readBankingState } from '../../../../src/server/secure-banking';
import { buildAIPlan } from '../../../../src/server/banking-plan';
import { sameOrigin } from '../action/route';

export const runtime='nodejs';
export async function POST(request:NextRequest){
  const headers={'Cache-Control':'private, no-store'};
  if(!sameOrigin(request))return NextResponse.json({error:'ORIGIN_REJECTED'},{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'INVALID_TYPE'},{status:415,headers});
  try{
    const text=await request.text();
    if(text.length>2500)return NextResponse.json({error:'REQUEST_TOO_LONG'},{status:413,headers});
    const body=JSON.parse(text) as {prompt?:unknown};
    if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>1500)return NextResponse.json({error:'INVALID_PROMPT'},{status:400,headers});
    const session=await authenticatedBanking();
    if(!session)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401,headers});
    const state=await readBankingState(session.client);
    if(!state.enrolled)return NextResponse.json({error:'INITIALIZE_REQUIRED'},{status:409,headers});
    const plan=await buildAIPlan(body.prompt.trim(),state);
    return NextResponse.json(plan,{headers});
  }catch{return NextResponse.json({error:'PLAN_UNAVAILABLE'},{status:503,headers});}
}
