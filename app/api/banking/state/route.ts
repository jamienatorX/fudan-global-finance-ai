import { NextResponse } from 'next/server';
import { authenticatedBanking, readBankingState, securityFailure } from '../../../../src/server/secure-banking';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
  try{
    const session=await authenticatedBanking();
    if(!session)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401,headers:{'Cache-Control':'private, no-store'}});
    const guard=await session.client.rpc('bank_security_guard');
    if(guard.error){const failure=securityFailure(guard.error.message);return NextResponse.json({error:failure?.code??'BANKING_UNAVAILABLE'},{status:failure?.status??503,headers:{'Cache-Control':'private, no-store'}});}
    const state=await readBankingState(session.client);
    return NextResponse.json(state,{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'BANKING_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
