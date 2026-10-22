import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { applyDemoAction } from '../../src/demo/demo-engine';
import { marketOrderQuote } from '../../src/features/investing/market-catalog';

describe('simulated market orders', () => {
  const sourceId = createSeedSnapshot('v1').accounts[0].id;
  it('quotes fractional units using integer money and rejects invalid quantities', () => {
    expect(marketOrderQuote('aapl', '0.5').amountMinor).toBe(78000n);
    for (const quantity of ['0', '-1', 'NaN', '0.000000001', '1e4']) {
      expect(() => marketOrderQuote('aapl', quantity)).toThrow();
    }
  });
  it('settles only once with cash, holdings, order, ledger and audit agreeing', () => {
    const seed = createSeedSnapshot('v1');
    const action = { type: 'market-order', instrumentId: 'aapl', sourceId, direction: 'buy', quantity: '0.5' } as const;
    const { snapshot } = applyDemoAction(seed, action, 'market-buy');
    expect(snapshot.accounts[0].balance.amountMinor).toBe(seed.accounts[0].balance.amountMinor - 78000n);
    expect(snapshot.holdings.at(-1)?.units).toBe('0.50000000');
    expect(snapshot.investmentOrders.at(-1)?.amount.amountMinor).toBe(78000n);
    expect(snapshot.transactions.at(-1)?.amount.amountMinor).toBe(78000n);
    expect(snapshot.auditEvents.at(-1)?.correlationId).toBe('market-buy');
    expect(applyDemoAction(snapshot, action, 'market-buy').snapshot).toBe(snapshot);
    const sold = applyDemoAction(snapshot, { ...action, direction: 'sell' }, 'market-sell').snapshot;
    expect(sold.accounts[0].balance.amountMinor).toBe(seed.accounts[0].balance.amountMinor);
    expect(sold.holdings.at(-1)?.simulatedValue.amountMinor).toBe(0n);
  });
  it('rejects overselling, insufficient cash and currency mismatch without changing the seed', () => {
    const seed = createSeedSnapshot('v1');
    const action = { type: 'market-order', instrumentId: 'aapl', sourceId, direction: 'buy', quantity: '9999' } as const;
    expect(() => applyDemoAction(seed, action, 'poor')).toThrow(/Insufficient/);
    expect(() => applyDemoAction(seed, { ...action, direction: 'sell', quantity: '1' }, 'short')).toThrow(/holdings/);
    expect(() => applyDemoAction(seed, { ...action, sourceId: seed.accounts[3].id, quantity: '1' }, 'usd')).toThrow(/CNY/);
  });
  it('enforces Chinese bond lots and supports all four asset classes', () => {
    expect(() => marketOrderQuote('cgb-3y', '0.5')).toThrow(/whole/);
    for (const instrumentId of ['600519', 'usd-cny', 'btc', 'cgb-3y']) {
      const snapshot = applyDemoAction(createSeedSnapshot('v1'), { type: 'market-order', instrumentId, sourceId, direction: 'buy', quantity: instrumentId === 'btc' ? '0.001' : '1' }, instrumentId).snapshot;
      expect(snapshot.investmentProducts.at(-1)?.id).toBe('market:' + instrumentId);
    }
  });
});
