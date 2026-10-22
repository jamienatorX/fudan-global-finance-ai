import { expect, it } from 'vitest';
import { buildCashFlowSeries, cumulativeFlow, stepCurve } from '../../src/features/overview/cash-flow-series';
import { createSeedSnapshot } from '../../src/demo/seed';

it('builds cash-flow history from ledger entries without inventing price performance', () => {
  const seed = createSeedSnapshot('v1');
  const data = buildCashFlowSeries(seed, 30);
  expect(data).toHaveLength(30);
  expect(data.at(-1)?.date).toBe('2026-10-14');
  expect(data.reduce((sum, day) => sum + day.netMinor, 0n)).toBe(2028636n);
  expect(cumulativeFlow(data).at(-1)?.amountMinor).toBe(data.reduce((sum, day) => sum + day.netMinor, 0n));
  expect(data.some(day => day.netMinor !== 0n)).toBe(true);
});
it('handles empty periods and makes a recorded step path', () => {
  expect(stepCurve([{ x: 0, y: 10 }, { x: 20, y: 0 }])).toBe('M0,10 H20 V0');
  const seed = createSeedSnapshot('v1');
  expect(buildCashFlowSeries({ ...seed, transactions: [] }, 7).every(day => day.netMinor === 0n)).toBe(true);
});
