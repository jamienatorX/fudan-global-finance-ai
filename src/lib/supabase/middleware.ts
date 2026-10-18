import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, supabaseConfig } from './config';

const publicRoute = (path: string) => path === '/' || path === '/login' || path === '/register' || path.startsWith('/auth/');
// Only fictional browser-local competition surfaces are public when explicitly enabled.
// Server data APIs, Supabase functions, and future private pages remain authentication-gated.
const demoRoutes = new Set([
  '/overview', '/accounts', '/transfers', '/transactions', '/wealth', '/cards',
  '/subscriptions', '/fx', '/planner', '/audit', '/settings', '/showcase',
]);
const publicSimulation = (path: string) => process.env.COMPETITION_PUBLIC_DEMO === '1' && demoRoutes.has(path);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store');
  const login = () => {
    const destination = new URL('/login', request.url);
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, name) => {
      if (!['set-cookie', 'location', 'x-middleware-next', 'x-middleware-override-headers'].includes(name) && !name.startsWith('x-middleware-request-')) redirect.headers.set(name, value);
    });
    return redirect;
  };
  if (publicSimulation(request.nextUrl.pathname) || (process.env.COMPETITION_PUBLIC_DEMO === '1' && (request.nextUrl.pathname === '/api/fx/rate' || request.nextUrl.pathname === '/api/fx/currencies'))) return response;
  if (!isSupabaseConfigured()) {
    const localBrowserDemo = process.env.NODE_ENV !== 'production' && process.env.PLAYWRIGHT_DEMO_MODE === '1';
    return publicRoute(request.nextUrl.pathname) || localBrowserDemo ? response : login();
  }
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previous = response;
        response = NextResponse.next({ request });
        previous.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
        previous.headers.forEach((value, name) => { if (!name.startsWith('x-middleware-') && name !== 'set-cookie') response.headers.set(name, value); });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  if ((error || !data?.claims.sub) && !publicRoute(request.nextUrl.pathname)) return login();
  return response;
}
