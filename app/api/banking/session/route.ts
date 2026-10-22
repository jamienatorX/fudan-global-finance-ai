import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '../../../../src/lib/security/request-origin';
import { authenticatedBanking,securityFailure } from '../../../../src/server/secure-banking';
export async function POST(request:NextRequest){
  const headers={'Cache-Control':'private, no-store'};
  if(!sameOrigin(request))return NextResponse.json({error:'ORIGIN_REJECTED'},{status:403,headers});
  const session=await authenticatedBanking();
  if(!session)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401,headers});
  const guard=await session.client.rpc('bank_security_guard');
  if(guard.error){const failure=securityFailure(guard.error.message);return NextResponse.json({error:failure?.code??'BANKING_UNAVAILABLE'},{status:failure?.status??503,headers});}
  return NextResponse.json({status:'ok'},{headers});
}
