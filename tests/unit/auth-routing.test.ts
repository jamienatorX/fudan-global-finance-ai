// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '../../src/lib/supabase/middleware';

describe('local browser demo routing', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('permits only explicitly allowlisted browser-local demo pages when enabled', async () => {
    vi.stubEnv('COMPETITION_PUBLIC_DEMO', '1');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    expect((await updateSession(new NextRequest('https://app.example/transfers',{headers:{cookie:'bank-demo=1'}}))).status).toBe(200);
    expect((await updateSession(new NextRequest('https://app.example/copilot'))).status).toBe(307);
    expect((await updateSession(new NextRequest('https://app.example/competition'))).status).toBe(307);
    expect((await updateSession(new NextRequest('https://app.example/overview',{headers:{cookie:'bank-demo=1'}}))).status).toBe(200);
    expect((await updateSession(new NextRequest('https://app.example/showcase',{headers:{cookie:'bank-demo=1'}}))).status).toBe(200);
    expect((await updateSession(new NextRequest('https://app.example/api/fx/ticker'))).status).toBe(200);
    expect((await updateSession(new NextRequest('https://app.example/api/banking/state'))).status).toBe(401);
    expect((await updateSession(new NextRequest('https://app.example/overview'))).status).toBe(307);
    expect((await updateSession(new NextRequest('https://app.example/api/private'))).headers.get('location')).toBe('https://app.example/login');
  });

  it('remains fail-closed in production even when the Playwright demo flag is present', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('PLAYWRIGHT_DEMO_MODE', '1');

    const response = await updateSession(new NextRequest('https://app.example/overview'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example/login');
  });
});


it('opens the homepage for first-time visitors without granting private banking access',async()=>{
 vi.stubEnv('COMPETITION_PUBLIC_DEMO','1');vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');
 const home=await updateSession(new NextRequest('https://app.example/'));
 expect(home.headers.get('location')).toBe('https://app.example/overview');expect(home.cookies.get('bank-demo')?.value).toBe('1');expect(home.headers.get('set-cookie')).toContain('HttpOnly');expect(home.headers.get('set-cookie')).toContain('Secure');expect(home.headers.get('cache-control')).toBe('private, no-store');
 expect((await updateSession(new NextRequest('https://app.example/api/banking/state',{headers:{cookie:'bank-demo=1'}}))).status).toBe(401);
});
it('serves only public voice assets without opening private data',async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');
 for(const path of ['/voice-stream/1.12.20/manifest.json','/voice-stream/1.12.20/model-0.bin','/voice-pcm-worklet.js'])expect((await updateSession(new NextRequest('https://app.example'+path))).status).toBe(200);
 expect((await updateSession(new NextRequest('https://app.example/voice-stream/private'))).status).toBe(307);
});
