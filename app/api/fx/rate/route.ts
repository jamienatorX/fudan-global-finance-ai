import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
const validCurrency = (s: string | null) => !!s && /^[A-Z]{3}$/.test(s);
export async function GET(request: NextRequest) {
  const base = request.nextUrl.searchParams.get('base')?.toUpperCase() ?? null;
  const quote = request.nextUrl.searchParams.get('quote')?.toUpperCase() ?? null;
  const headers = { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600' };
  if (!validCurrency(base) || !validCurrency(quote)) {
    return NextResponse.json({ error: 'Choose two valid currency codes.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if (base === quote) {
    return NextResponse.json({ base, quote, rate: 1, date: new Date().toISOString().slice(0,10),
      source: 'identity', provider: 'Identity conversion' }, { headers });
  }
  try {
    const url = 'https://api.frankfurter.dev/v2/rate/' + base + '/' + quote;
    const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(7000),
      headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return NextResponse.json({ error: response.status === 404 || response.status === 422 ?
        'Reference rate not published for this pair.' : 'FX provider unavailable.' },
        { status: response.status === 404 || response.status === 422 ? 404 : 503,
          headers: { 'Cache-Control': 'no-store' } });
    }
    const row = await response.json() as { base?: string; quote?: string; date?: string; rate?: number };
    if (row.base?.toUpperCase() !== base || row.quote?.toUpperCase() !== quote ||
        typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0 ||
        typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      return NextResponse.json({ error: 'Invalid reference-rate response.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ base, quote, rate: row.rate, date: row.date,
      source: 'live-reference', provider: 'Frankfurter (blended official-source mid-market rates)' }, { headers });
  } catch {
    return NextResponse.json({ error: 'Reference service currently unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
