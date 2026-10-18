import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getRate } from '../../app/api/fx/rate/route';
import { GET as getCurrencies } from '../../app/api/fx/currencies/route';

afterEach(()=>vi.unstubAllGlobals());
describe('keyless FX reference API',()=>{
  const request=(base:string,quote:string)=>new NextRequest('https://example.org/api/fx/rate?base='+encodeURIComponent(base)+'&quote='+encodeURIComponent(quote));
  it('blocks invalid rate symbols before contacting any provider', async()=>{
    const spy=vi.fn();vi.stubGlobal('fetch',spy);
    expect((await getRate(request('US1','SGD'))).status).toBe(400);
    expect((await getRate(request('USD','!'))).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
  it('validates a dated Frankfurter quote with a source label',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({
      date:'2026-10-16',base:'USD',quote:'SGD',rate:1.2927
    }),{status:200,headers:{'content-type':'application/json'}})));
    const response=await getRate(request('USD','SGD'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({base:'USD',quote:'SGD',rate:1.2927,date:'2026-10-16',source:'live-reference'});
  });
  it('does not fabricate rates for missing or failed upstream responses',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('unavailable',{status:404})));
    expect((await getRate(request('USD','JPY'))).status).toBe(404);
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:200})));
    expect((await getRate(request('USD','JPY'))).status).toBe(503);
    vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('timeout')}));
    expect((await getRate(request('USD','JPY'))).status).toBe(503);
  });
  it('publishes only a verified catalog and falls back honestly',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline')}));
    const unavailable=await getCurrencies();
    const fallback=await unavailable.json() as {currencies:{code:string}[];source:string};
    expect(fallback.source).toBe('offline-catalog');
    expect(fallback.currencies.find(x=>x.code==='IDR')).toBeDefined();
  });
});
