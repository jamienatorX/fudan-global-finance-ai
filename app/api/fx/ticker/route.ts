import { NextResponse } from 'next/server';
import { buildTickerQuotes, TICKER_CURRENCIES } from '../../../../src/features/fx/ticker-quotes';

export const runtime = 'nodejs';
export async function GET() {
  const from = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0,10);
  try {
    const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=USD&quotes=${TICKER_CURRENCIES.join(',')}&from=${from}`, {
      next: { revalidate: 3600 }, signal: AbortSignal.timeout(7000), headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('FX unavailable');
    const payload: unknown = await response.json();
    const today = new Date().toISOString().slice(0, 10);
    const published = Array.isArray(payload) ? payload.filter(row => {
      if (!row || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || row.date > today) return false;
      const timestamp = Date.parse(`${row.date}T00:00:00Z`);
      return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === row.date;
    }) : [];
    const quotes = buildTickerQuotes(published);
    if (!quotes.length) throw new Error('No published quotes');
    return NextResponse.json({ quotes, provider: 'Frankfurter' }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ quotes: [], error: 'Rates unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
