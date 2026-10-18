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
    const quotes = buildTickerQuotes(await response.json());
    if (!quotes.length) throw new Error('No published quotes');
    return NextResponse.json({ quotes, provider: 'Frankfurter' }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ quotes: [], error: 'Rates unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
