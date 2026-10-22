// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GET } from '../../app/auth/callback/route';
import { supabaseConfig } from '@/lib/supabase/config';

const boundary = vi.hoisted(() => ({
  subject: null as string | null,
  exchangeError: null as Error | null,
  refresh: true,
  cookies: [] as { name: string; value: string }[],
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => boundary.cookies, set: (name: string, value: string) => { boundary.cookies.push({ name, value }); } }) }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[], headers: Record<string, string>) => void } }) => ({
    auth: {
      getClaims: async () => {
        if (boundary.refresh) options.cookies.setAll([{ name: 'refreshed', value: 'token', options: { httpOnly: true, path: '/' } }], { 'Cache-Control': 'private, no-store', Expires: '0', Pragma: 'no-cache', 'X-Auth-Refresh': 'done' });
        return { data: boundary.subject ? { claims: { sub: boundary.subject } } : null, error: null };
      },
      exchangeCodeForSession: async () => { options.cookies.setAll([{ name: 'session', value: 'new', options: { path: '/' } }], { 'Cache-Control': 'private, no-store', Expires: '0', Pragma: 'no-cache' }); return { error: boundary.exchangeError }; },
    },
  }),
}));

describe('SSR auth boundary', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
    vi.stubEnv('PLAYWRIGHT_DEMO_MODE', '');
    boundary.subject = null; boundary.exchangeError = null; boundary.cookies = []; boundary.refresh = true;
  });
  it('forwards refresh cookies and every SSR header through an unauthorized redirect', async () => {
    const request = new NextRequest('https://app.example/accounts');
    const response = await updateSession(request);
    expect(response.headers.get('location')).toBe('https://app.example/login');
    expect(response.cookies.get('refreshed')?.value).toBe('token');
    expect(request.cookies.get('refreshed')?.value).toBe('token');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('expires')).toBe('0');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('x-auth-refresh')).toBe('done');
  });
  it('allows demo root and login without configuration but fails closed for private routes', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    expect((await updateSession(new NextRequest('https://app.example/'))).status).toBe(200);
    expect((await updateSession(new NextRequest('https://app.example/accounts'))).headers.get('location')).toBe('https://app.example/login');
  });
  it('allows product routes only in the explicit local Playwright demo mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('PLAYWRIGHT_DEMO_MODE', '1');
    expect((await updateSession(new NextRequest('https://app.example/overview'))).status).toBe(200);
    expect((await updateSession(new NextRequest('https://app.example/accounts'))).status).toBe(200);
  });
  it('creates different server clients for separate requests', async () => {
    expect(await createServerSupabaseClient()).not.toBe(await createServerSupabaseClient());
  });
  it('allows verified claims through private routes', async () => {
    boundary.subject = 'verified-user';
    expect((await updateSession(new NextRequest('https://app.example/accounts'))).status).toBe(200);
  });
  it('prevents shared caching of authenticated responses even without refresh', async () => {
    boundary.subject = 'verified-user'; boundary.refresh = false;
    expect((await updateSession(new NextRequest('https://app.example/accounts'))).headers.get('cache-control')).toContain('no-store');
  });
  it('rejects legacy or secret keys and malformed URLs before creating clients', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'legacy-jwt');
    expect(() => supabaseConfig()).toThrow(/publishable/);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://');
    expect(() => supabaseConfig()).toThrow(/URL/);
  });
  it('exchanges PKCE code and blocks external callback redirects without dropping cache headers', async () => {
    const response = await GET(new NextRequest('https://app.example/auth/callback?code=valid&next=https://evil.example'));
    expect(response.headers.get('location')).toBe('https://app.example/security');
    expect(response.cookies.get('session')?.value).toBe('new');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('returns safe login error for failed exchange or missing code', async () => {
    boundary.exchangeError = new Error('private provider details');
    expect((await GET(new NextRequest('https://app.example/auth/callback?code=bad'))).headers.get('location')).toBe('https://app.example/login?error=auth');
    expect((await GET(new NextRequest('https://app.example/auth/callback'))).headers.get('location')).toBe('https://app.example/login?error=auth');
  });
});
