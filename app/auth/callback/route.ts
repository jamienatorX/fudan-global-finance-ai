import { requestOrigin } from '../../../src/lib/security/request-origin';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  // Every completed first-factor sign-in goes through the MFA checkpoint.
  const allowed = '/security';
  const response = new NextResponse(null,{status:307,headers:{Location:requestOrigin(request)+allowed}});
  response.headers.set('Cache-Control', 'private, no-store');
  const failure = () => {
    const failed = new NextResponse(null,{status:307,headers:{Location:requestOrigin(request)+'/login?error=auth'}});
    response.cookies.getAll().forEach((cookie) => failed.cookies.set(cookie));
    response.headers.forEach((value, name) => { if (!['location', 'set-cookie'].includes(name)) failed.headers.set(name, value); });
    return failed;
  };
  if (!code) return failure();
  try {
    const { url, key } = supabaseConfig();
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return failure();
    return response;
  } catch { return failure(); }
}
