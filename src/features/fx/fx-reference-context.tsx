'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ExchangeRate } from '../../domain/entities';
import type { TickerQuote } from './ticker-quotes';

export type FxReference = {
  quotes: TickerQuote[];
  status: 'loading' | 'live' | 'fallback';
  date: string | null;
  provider: string | null;
};
const fallback: FxReference = { quotes: [], status: 'fallback', date: null, provider: null };
const FxReferenceContext = createContext<FxReference>(fallback);

function publishedDate(value: unknown, today: string): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value && value <= today;
}

export function parseFxReference(input: unknown, now = new Date()): FxReference {
  if (!input || typeof input !== 'object') return fallback;
  const data = input as { quotes?: unknown; provider?: unknown };
  const today = now.toISOString().slice(0, 10);
  const quotes = Array.isArray(data.quotes) ? data.quotes.filter((q): q is TickerQuote =>
    q && typeof q === 'object' && /^USD\/[A-Z]{3}$/.test(q.pair) &&
    typeof q.rate === 'number' && Number.isFinite(q.rate) && q.rate > 0 &&
    (q.change === null || (typeof q.change === 'number' && Number.isFinite(q.change))) &&
    publishedDate(q.date, today) && (q.previousDate === null || (publishedDate(q.previousDate, today) && q.previousDate < q.date))) : [];
  if (!['CNY', 'SGD', 'IDR'].every(currency => quotes.some(q => q.pair === `USD/${currency}`)) ||
    typeof data.provider !== 'string' || !data.provider.trim()) return fallback;
  return { quotes, status: 'live', date: quotes.map(q => q.date).sort()[0], provider: data.provider };
}

export function FxReferenceProvider({ children }: { children: ReactNode }) {
  const [reference, setReference] = useState<FxReference>({ ...fallback, status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch('/api/fx/ticker', { signal: controller.signal });
        if (!response.ok) throw new Error('Rates unavailable');
        const value = parseFxReference(await response.json());
        if (!controller.signal.aborted) setReference(value);
      } catch {
        if (!controller.signal.aborted) setReference(fallback);
      } finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 300_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  return <FxReferenceContext.Provider value={reference}>{children}</FxReferenceContext.Provider>;
}

export function useFxReference(): FxReference { return useContext(FxReferenceContext); }

/** Current valuation estimates only: never replace ledger or transaction accounting rates. */
export function ratesFromQuotes(seedRates: readonly ExchangeRate[], quotes: readonly TickerQuote[]): readonly ExchangeRate[] {
  const reference = parseFxReference({ quotes, provider: 'Frankfurter' });
  if (reference.status !== 'live') return seedRates;
  const usd = new Map(reference.quotes.map(q => [q.pair.slice(4), q.rate]));
  usd.set('USD', 1);
  return seedRates.map(rate => {
    const base = usd.get(rate.base);
    const quote = usd.get(rate.quote);
    if (!base || !quote) return rate;
    const date = reference.quotes.filter(q => q.pair === `USD/${rate.base}` || q.pair === `USD/${rate.quote}`).map(q => q.date).sort()[0] ?? reference.date!;
    return { ...rate, rate: (quote / base).toFixed(12), provider: reference.provider!, source: 'live',
      referenceAt: `${date}T00:00:00.000Z`, retrievedAt: new Date().toISOString() };
  });
}
