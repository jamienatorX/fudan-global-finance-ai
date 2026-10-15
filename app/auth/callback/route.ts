import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const proposed = request.nextUrl.searchParams.get('next');
  const allowed = proposed && /^\/[a-z0-9/-]*$/i.test(proposed) && !proposed.startsWith('//') ? proposed : '/overview';
  const response = NextResponse.redirect(new URL(allowed, request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  const failure = () => {
    const failed = NextResponse.redirect(new URL('/login?error=auth', request.url));
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
