import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/api/fx/ticker/route';

afterEach(() => vi.unstubAllGlobals());
describe('FX ticker API', () => {
  it('returns sourced dated changes from a single cached provider request', async () => {
    const fetcher = vi.fn(async () => Response.json([
      {base:'USD',quote:'CNY',rate:7,date:'2026-10-15'},
      {base:'USD',quote:'CNY',rate:7.07,date:'2026-10-16'},
    ]));
    vi.stubGlobal('fetch', fetcher);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    const data = await response.json();
    expect(data.provider).toBe('Frankfurter');
    expect(data.quotes[0].change).toBeCloseTo(1);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each(['offline','invalid'])('does not fabricate quotes for %s responses', async state => {
    vi.stubGlobal('fetch',vi.fn(async () => {
      if (state === 'offline') throw new Error('offline');
      return Response.json([{rate:-1}]);
    }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await response.json()).quotes).toEqual([]);
  });
});
