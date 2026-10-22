import { expect, it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { applyDemoAction } from '../../src/demo/demo-engine';

it('creates a masked virtual card once without changing cash', () => {
  const seed = createSeedSnapshot('v1');
  const action = { type: 'create-card', sourceId: seed.accounts[0].id, purpose: 'online-shopping' } as const;
  const next = applyDemoAction(seed, action, 'new-card').snapshot;
  expect(next.cards).toHaveLength(seed.cards.length + 1);
  expect(next.cards.at(-1)?.maskedNumber).toMatch(/^•••• •••• •••• \d{4}$/);
  expect(next.accounts).toEqual(seed.accounts);
  expect(applyDemoAction(next, action, 'new-card').snapshot.cards).toHaveLength(next.cards.length);
});
it('rejects new cards on non-CNY or unknown accounts', () => {
  const seed = createSeedSnapshot('v1');
  expect(() => applyDemoAction(seed, { type: 'create-card', sourceId: seed.accounts[3].id, purpose: 'daily' }, 'bad-card')).toThrow(/CNY/);
});
it('redeems a full fund with a gain without leaving negative units or cost basis', () => {
  const seed = createSeedSnapshot('v1');
  const holding = seed.holdings[1];
  const next = applyDemoAction(seed, { type: 'investment', sourceId: seed.accounts[0].id, productId: holding.productId, direction: 'redeem', amountMinor: holding.simulatedValue.amountMinor.toString() }, 'withdraw-full').snapshot;
  const remaining = next.holdings.find(h => h.id === holding.id)!;
  expect(remaining.costBasis.amountMinor).toBe(0n);
  expect(Number(remaining.units)).toBe(0);
  expect(remaining.simulatedValue.amountMinor).toBe(0n);
  expect(next.accounts[0].balance.amountMinor).toBe(seed.accounts[0].balance.amountMinor + holding.simulatedValue.amountMinor);
  expect(next.transactions.at(-1)?.direction).toBe('credit');
  expect(next.auditEvents.at(-1)?.correlationId).toBe('withdraw-full');
});
it('removes fund units and cost basis proportionally on partial withdrawal', () => {
  const seed = createSeedSnapshot('v1');
  const holding = seed.holdings[1];
  const action = { type: 'investment', sourceId: seed.accounts[0].id, productId: holding.productId, direction: 'redeem', amountMinor: '51600' } as const;
  const next = applyDemoAction(seed, action, 'withdraw-half').snapshot;
  const remaining = next.holdings.find(h => h.id === holding.id)!;
  expect(remaining.costBasis.amountMinor).toBe(50000n);
  expect(remaining.simulatedValue.amountMinor).toBe(51600n);
  expect(Number(remaining.units)).toBe(500);
  expect(() => applyDemoAction(seed, { ...action, amountMinor: '103201' }, 'too-much')).toThrow(/Insufficient/);
});
