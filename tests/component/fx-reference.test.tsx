import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FxReferenceProvider, parseFxReference, ratesFromQuotes, useFxReference } from '../../src/features/fx/fx-reference-context';
import type { ExchangeRate } from '../../src/domain/entities';

const date = new Date().toISOString().slice(0, 10);
const quotes = ['CNY', 'SGD', 'IDR'].map((currency, i) => ({ pair: `USD/${currency}`, rate: [7, 1.4, 14000][i], date, change: null, previousDate: null }));
const payload = { provider: 'Frankfurter', quotes };
function Consumer() { const value = useFxReference(); return <div>{value.status} {value.date}</div>; }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('shared FX reference', () => {
  it('fetches once for multiple consumers', async () => {
    const fetcher = vi.fn(async () => Response.json(payload));
    vi.stubGlobal('fetch', fetcher);
    render(<FxReferenceProvider><Consumer /><Consumer /></FxReferenceProvider>);
    await waitFor(() => expect(screen.getAllByText(`live ${date}`)).toHaveLength(2));
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('falls back on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    render(<FxReferenceProvider><Consumer /></FxReferenceProvider>);
    await waitFor(() => expect(screen.getByText('fallback')).toBeInTheDocument());
  });
  it('offers a safe fallback without a provider', () => {
    render(<Consumer />);
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });
  it.each(['2099-01-01', '2026-02-30', 'invalid'])('rejects unpublished date %s', invalidDate => {
    expect(parseFxReference({ ...payload, quotes: quotes.map(q => ({ ...q, date: invalidDate })) }).status).toBe('fallback');
  });
  it('requires all core currencies with finite positive values', () => {
    expect(parseFxReference({ ...payload, quotes: quotes.slice(0, 2) }).status).toBe('fallback');
    expect(parseFxReference({ ...payload, quotes: quotes.map(q => ({ ...q, rate: Infinity })) }).status).toBe('fallback');
  });
  it('derives cross rates without mutating accounting references', () => {
    const seed = [{ id: 'seed', base: 'SGD', quote: 'CNY', rate: '5.4', provider: 'Sandbox', referenceAt: date, retrievedAt: date, source: 'fallback' }] as readonly ExchangeRate[];
    expect(ratesFromQuotes(seed, quotes)[0].rate).toBe('5.000000000000');
    expect(seed[0].rate).toBe('5.4');
    expect(ratesFromQuotes(seed, [])).toBe(seed);
  });
});
