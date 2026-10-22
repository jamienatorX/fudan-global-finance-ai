export const TICKER_CURRENCIES = ['CNY', 'SGD', 'IDR', 'EUR', 'JPY', 'GBP'] as const;
export type TickerQuote = { pair: string; rate: number; change: number | null; date: string; previousDate: string | null };

export function buildTickerQuotes(input: unknown): TickerQuote[] {
  if (!Array.isArray(input)) return [];
  return TICKER_CURRENCIES.flatMap(quote => {
    const rows = input.filter((row): row is { base: string; quote: string; rate: number; date: string } =>
      !!row && typeof row === 'object' && row.base === 'USD' && row.quote === quote &&
      typeof row.rate === 'number' && Number.isFinite(row.rate) && row.rate > 0 &&
      typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date));
    const unique = [...new Map(rows.map(row => [row.date, row])).values()].sort((a,b) => b.date.localeCompare(a.date));
    const [latest, previous] = unique;
    if (!latest) return [];
    return [{ pair: `USD/${quote}`, rate: latest.rate, date: latest.date,
      previousDate: previous?.date ?? null, change: previous ? (latest.rate / previous.rate - 1) * 100 : null }];
  });
}
