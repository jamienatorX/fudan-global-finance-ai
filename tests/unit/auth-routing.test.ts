// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '../../src/lib/supabase/middleware';

describe('local browser demo routing', () => {
  afterEach(() => vi.unstubAllEnvs());

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
