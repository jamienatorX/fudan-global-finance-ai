export type AssetClass = 'Stocks' | 'Forex' | 'Crypto' | 'China bonds';
export type MarketInstrument = Readonly<{
  id: string; symbol: string; name: string; assetClass: AssetClass; market: string;
  priceMinor: bigint; risk: 'medium' | 'high'; description: string; researchUrl: string;
  coupon?: string; tenor?: string;
}>;

// Deterministic competition fixtures, NOT market quotes or current bond offerings.
// All prices are CNY equivalents, with no implicit currency conversion at settlement.
export const MARKET_CATALOG: readonly MarketInstrument[] = [
  { id: 'aapl', symbol: 'AAPL', name: 'Apple', assetClass: 'Stocks', market: 'US · Technology', priceMinor: 156000n, risk: 'high', description: 'Explore fractional stock ownership with a fictional CNY-equivalent price.', researchUrl: 'https://finance.yahoo.com/quote/AAPL/' },
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', assetClass: 'Stocks', market: 'US · Semiconductors', priceMinor: 95000n, risk: 'high', description: 'A semiconductor stock example. Concentrated equity exposure can be volatile.', researchUrl: 'https://finance.yahoo.com/quote/NVDA/' },
  { id: '600519', symbol: '600519.SS', name: 'Kweichow Moutai', assetClass: 'Stocks', market: 'Shanghai · Consumer', priceMinor: 140000n, risk: 'high', description: 'A mainland equity example. Fractional units are a simulation convenience; exchange lot rules are not modeled.', researchUrl: 'https://finance.yahoo.com/quote/600519.SS/' },
  { id: 'usd-cny', symbol: 'USD/CNY', name: 'US dollar', assetClass: 'Forex', market: 'Currency · Unleveraged', priceMinor: 710n, risk: 'high', description: 'One unit represents one fictional USD exposure. No leverage, margin or actual FX delivery.', researchUrl: 'https://finance.yahoo.com/quote/CNY=X/' },
  { id: 'eur-cny', symbol: 'EUR/CNY', name: 'Euro', assetClass: 'Forex', market: 'Currency · Unleveraged', priceMinor: 780n, risk: 'high', description: 'One unit represents one fictional EUR exposure. For actual reference conversions use FX & Cross-border.', researchUrl: 'https://finance.yahoo.com/quote/EURCNY=X/' },
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', assetClass: 'Crypto', market: 'Digital assets · Sandbox', priceMinor: 48000000n, risk: 'high', description: 'Educational simulation only. No wallets, deposits or crypto exchange connectivity. Not a mainland crypto trading service.', researchUrl: 'https://finance.yahoo.com/quote/BTC-USD/' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', assetClass: 'Crypto', market: 'Digital assets · Sandbox', priceMinor: 1800000n, risk: 'high', description: 'Educational simulation only. Prices and ownership are fictional, with no on-chain assets.', researchUrl: 'https://finance.yahoo.com/quote/ETH-USD/' },
  { id: 'cgb-3y', symbol: 'CN GOV 3Y', name: 'China Treasury · 3 year example', assetClass: 'China bonds', market: 'Government · CNY 100 face value', priceMinor: 10000n, risk: 'medium', coupon: '1.50%', tenor: '3 years', description: 'Illustrative book-entry treasury bond. One whole unit = CNY 100 face value. Price can fall if yields rise. This is not an actual issue; no coupon accrual or maturity settlement is automated.', researchUrl: 'https://www.boc.cn/en/pbservice/pb3/' },
  { id: 'cgb-5y', symbol: 'CN GOV 5Y', name: 'China Treasury · 5 year example', assetClass: 'China bonds', market: 'Government · CNY 100 face value', priceMinor: 10000n, risk: 'medium', coupon: '1.80%', tenor: '5 years', description: 'Illustrative book-entry treasury bond with longer duration. Availability, investor eligibility and actual issuance terms require verification with an authorized distributor.', researchUrl: 'https://www.boc.cn/en/pbservice/pb3/' },
];
export const UNIT_SCALE = 100_000_000n;
export function parseUnits(value: string): bigint {
  if (!/^\d+(\.\d{1,8})?$/.test(value)) throw new Error('Enter a positive quantity with up to 8 decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const units = BigInt(whole) * UNIT_SCALE + BigInt(fraction.padEnd(8, '0'));
  if (units <= 0n || units > 1_000_000_000n * UNIT_SCALE) throw new Error('Quantity must be positive and within the demo limit.');
  return units;
}
export function formatUnits(units: bigint): string {
  return `${units / UNIT_SCALE}.${(units % UNIT_SCALE).toString().padStart(8, '0')}`;
}
export function marketOrderQuote(instrumentId: string, quantity: string) {
  const instrument = MARKET_CATALOG.find(i => i.id === instrumentId);
  if (!instrument) throw new Error('Instrument unavailable.');
  const units = parseUnits(quantity);
  if (instrument.assetClass === 'China bonds' && units % UNIT_SCALE !== 0n) throw new Error('Bond orders require whole CNY 100 face-value units.');
  const raw = units * instrument.priceMinor;
  if (raw % UNIT_SCALE !== 0n) throw new Error('This quantity creates a fraction of a CNY cent. Increase or round the quantity.');
  const amountMinor = raw / UNIT_SCALE;
  if (amountMinor <= 0n || amountMinor > 1_000_000_000_000n) throw new Error('Order value is outside the demo limit.');
  return { instrument, units, amountMinor };
}
