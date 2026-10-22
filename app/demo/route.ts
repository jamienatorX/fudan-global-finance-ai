import { requestOrigin } from '../../src/lib/security/request-origin';
import { NextResponse, type NextRequest } from 'next/server';
import { sameOrigin } from '../../src/lib/security/request-origin';
export async function POST(request:NextRequest) {
  if(!sameOrigin(request))return NextResponse.json({error:'ORIGIN_REJECTED'},{status:403});
  if (process.env.COMPETITION_PUBLIC_DEMO !== '1' && !(process.env.NODE_ENV !== 'production' && process.env.PLAYWRIGHT_DEMO_MODE === '1')) {
    return new NextResponse(null,{status:307,headers:{Location:requestOrigin(request)+'/login'}});
  }
  const response = new NextResponse(null,{status:303,headers:{Location:requestOrigin(request)+'/overview'}});
  response.cookies.set('bank-demo', '1', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 3600 });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
