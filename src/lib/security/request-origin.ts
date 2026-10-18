import type { NextRequest } from 'next/server';
/** Use the actual Host, not a forwarded-host header or the server's internal hostname. */
export function requestOrigin(request:Pick<NextRequest,'headers'|'nextUrl'>) {
  const host=request.headers.get('host');
  if(host){
    try{
      const url=new URL(request.nextUrl.protocol+'//'+host);
      if(!url.username&&!url.password&&url.host===host.toLowerCase())return url.origin;
    }catch{}
  }
  return request.nextUrl.origin;
}
