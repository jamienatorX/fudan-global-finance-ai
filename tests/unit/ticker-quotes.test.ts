import { describe, expect, it } from 'vitest';
import { buildTickerQuotes } from '../../src/features/fx/ticker-quotes';

describe('published FX changes', () => {
  it('compares the last two distinct published dates, including across weekends', () => {
    const result = buildTickerQuotes([
      {base:'USD',quote:'CNY',rate:7,date:'2026-10-09'},
      {base:'USD',quote:'CNY',rate:7.07,date:'2026-10-12'},
      {base:'USD',quote:'SGD',rate:1.3,date:'2026-10-09'},
      {base:'USD',quote:'SGD',rate:1.287,date:'2026-10-12'},
    ]);
    expect(result[0].change).toBeCloseTo(1);
    expect(result[1].change).toBeCloseTo(-1);
    expect(result[0].previousDate).toBe('2026-10-09');
  });
  it('does not fabricate a change when only one observation exists', () => {
    expect(buildTickerQuotes([{base:'USD',quote:'CNY',rate:7,date:'2026-10-12'}])[0].change).toBeNull();
  });
  it('rejects malformed observations and duplicate dates do not count as history', () => {
    expect(buildTickerQuotes(null)).toEqual([]);
    expect(buildTickerQuotes([{base:'EUR',quote:'CNY',rate:7,date:'2026-10-12'}, {base:'USD',quote:'CNY',rate:0,date:'2026-10-12'}])).toEqual([]);
    expect(buildTickerQuotes(Array(2).fill({base:'USD',quote:'CNY',rate:7,date:'2026-10-12'}))[0].change).toBeNull();
  });
});
