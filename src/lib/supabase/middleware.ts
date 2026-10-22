import { requestOrigin } from '../security/request-origin';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, supabaseConfig } from './config';

const publicRoute = (path: string) => path === '/' || path === '/login' || path === '/register' || path === '/demo' || path.startsWith('/auth/');
// Only fictional browser-local competition surfaces are public when explicitly enabled.
// Server data APIs, Supabase functions, and future private pages remain authentication-gated.
const demoRoutes = new Set([
  '/overview', '/accounts', '/transfers', '/transactions', '/wealth', '/cards',
  '/subscriptions', '/fx', '/planner', '/investing', '/parent-summary', '/audit', '/settings', '/showcase', '/copilot',
]);
const publicSimulation = (path: string) => process.env.COMPETITION_PUBLIC_DEMO === '1' && demoRoutes.has(path);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store');
  const login = () => {
    const redirect = request.nextUrl.pathname.startsWith('/api/banking/')
      ? NextResponse.json({error:'AUTH_REQUIRED'},{status:401})
      : new NextResponse(null,{status:307,headers:{Location:requestOrigin(request)+'/login'}});
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, name) => {
      if (!['set-cookie', 'location', 'x-middleware-next', 'x-middleware-override-headers'].includes(name) && !name.startsWith('x-middleware-request-')) redirect.headers.set(name, value);
    });
    return redirect;
  };
  if(request.nextUrl.pathname==='/api/agent/demo-conversation'&&process.env.FUFU_DEMO_SHARED_STORE==='true'&&process.env.COMPETITION_PUBLIC_DEMO==='1'&&request.cookies.get('bank-demo')?.value==='1')return response;
  if (request.nextUrl.pathname==='/api/agent/demo-conversation' && process.env.NODE_ENV!=='production' && ['127.0.0.1','localhost','[::1]'].includes(request.nextUrl.hostname)) return response;
  if ((publicSimulation(request.nextUrl.pathname) && request.cookies.get('bank-demo')?.value === '1') || (process.env.COMPETITION_PUBLIC_DEMO === '1' && (request.nextUrl.pathname === '/api/fx/rate' || request.nextUrl.pathname === '/api/fx/currencies' || request.nextUrl.pathname === '/api/fx/ticker'))) return response;
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
  if (data?.claims.sub && request.nextUrl.pathname === '/banking' && data.claims.aal !== 'aal2') {
    const target = new NextResponse(null,{status:307,headers:{Location:requestOrigin(request)+'/security'}});
    response.cookies.getAll().forEach(cookie => target.cookies.set(cookie));
    target.headers.set('Cache-Control', 'private, no-store');
    return target;
  }
  return response;
}


