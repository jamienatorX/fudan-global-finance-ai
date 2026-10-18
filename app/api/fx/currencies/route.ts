import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
const common = [
  ['AUD','Australian Dollar'],['CAD','Canadian Dollar'],['CHF','Swiss Franc'],['CNY','Chinese Yuan'],
  ['EUR','Euro'],['GBP','British Pound'],['HKD','Hong Kong Dollar'],['IDR','Indonesian Rupiah'],
  ['INR','Indian Rupee'],['JPY','Japanese Yen'],['KRW','South Korean Won'],['MYR','Malaysian Ringgit'],
  ['NZD','New Zealand Dollar'],['PHP','Philippine Peso'],['SGD','Singapore Dollar'],['THB','Thai Baht'],
  ['TWD','New Taiwan Dollar'],['USD','US Dollar'],['VND','Vietnamese Dong']
] as const;

export async function GET() {
  const headers = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400' };
  try {
    const response = await fetch('https://api.frankfurter.dev/v2/currencies',
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(7000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Currency catalog unavailable');
    const rows = await response.json() as { iso_code?: string; name?: string; end_date?: string | null }[];
    if (!Array.isArray(rows)) throw new Error('Invalid catalog');
    const results = rows.filter(r => typeof r.iso_code === 'string' && /^[A-Z]{3}$/.test(r.iso_code) &&
      typeof r.name === 'string' && r.name.length <= 100 && !r.end_date)
      .map(r => ({ code: r.iso_code!, name: r.name! }))
      .toSorted((a,b)=>a.code.localeCompare(b.code));
    if (results.length < 15) throw new Error('Empty catalog');
    return NextResponse.json({ currencies: results, source: 'live-catalog' }, { headers });
  } catch {
    return NextResponse.json({ currencies: common.map(([code,name])=>({code,name})),
      source: 'offline-catalog', warning: 'Showing common currencies. Rates may be unavailable while the provider is offline.' },
      { headers: { 'Cache-Control': 'public, max-age=60' } });
  }
}
