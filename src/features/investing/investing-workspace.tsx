'use client';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Building2, ChartNoAxesCombined, Coins, Globe2, Landmark, Search, ShieldCheck, Star, WalletCards } from 'lucide-react';
import { useDemo } from '../../demo/demo-context';
import { formatMoney, money } from '../../domain/money';
import { AccountLink as Link } from '../../components/shell/account-link';
import { MARKET_CATALOG, marketOrderQuote, type AssetClass } from './market-catalog';
import { useInvestingPreferences } from './investing-preferences';

const assetIcons = { Stocks: ChartNoAxesCombined, Forex: Globe2, Crypto: Coins, 'China bonds': Landmark };
const classes: AssetClass[] = ['Stocks', 'Forex', 'Crypto', 'China bonds'];
const cny = (amount: bigint) => formatMoney(money(amount, 'CNY'));
const assetDescriptions = { Stocks: 'Explore companies at home and abroad.', Forex: 'Learn how currency exposure works.', Crypto: 'Explore digital assets in the sandbox.', 'China bonds': 'Understand government debt and coupons.' };

export function InvestingHomeSection() {
  return <section className="invest-home invest-panel" aria-labelledby="investing-home-title" data-testid="investing-home-section">
    <div className="invest-section-heading"><div><p className="invest-eyebrow">Your next chapter</p><h2 id="investing-home-title">A little curiosity. A bigger world.</h2><p className="invest-muted">Explore investing with your banking in one place.</p></div><Link href="/investing" className="invest-button">Open Investing <ArrowRight size={17} aria-hidden /></Link></div>
    <div className="invest-asset-grid">{classes.map(asset => { const Icon = assetIcons[asset]; return <Link className="invest-asset-card" key={asset} href={'/investing?asset=' + encodeURIComponent(asset)}><span className="invest-asset-icon"><Icon size={23} aria-hidden /></span><span className="invest-asset-title">{asset}<ArrowUpRight size={17} aria-hidden /></span><span className="invest-muted">{assetDescriptions[asset]}</span></Link>; })}</div>
    <p className="invest-fineprint"><ShieldCheck size={14} aria-hidden />Practice with fictional funds. Prices and bond terms are illustrative. No real assets are traded.</p>
  </section>;
}

export function InvestingWorkspace({ initialAsset, initialInstrument }: { initialAsset?: string; initialInstrument?: string }) {
  const { snapshot, request, pending } = useDemo();
  const context = useInvestingPreferences();
  const first = MARKET_CATALOG.find(i => i.id === initialInstrument) ?? MARKET_CATALOG.find(i => i.assetClass === initialAsset) ?? MARKET_CATALOG[0];
  const [tab, setTab] = useState<string>(classes.includes(initialAsset as AssetClass) ? initialAsset! : 'All assets');
  const [query, setQuery] = useState('');
  const [selectedId, setSelected] = useState(first.id);
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('1');
  const [sourceId, setSource] = useState(snapshot.accounts.find(a => a.status === 'active' && a.currency === 'CNY')?.id ?? '');
  const [risk, setRisk] = useState(false);
  const [error, setError] = useState('');
  const selected = MARKET_CATALOG.find(i => i.id === selectedId)!;
  const selectedHolding = snapshot.holdings.find(h => h.productId === 'market:' + selected.id);
  const source = snapshot.accounts.find(a => a.id === sourceId);
  const watchlist = context?.preferences.watchlist ?? [];
  const held = snapshot.holdings.filter(h => h.simulatedValue.amountMinor > 0n);
  const total = held.reduce((sum, h) => sum + h.simulatedValue.amountMinor, 0n);
  const costBasis = held.reduce((sum, h) => sum + h.costBasis.amountMinor, 0n);
  const visible = MARKET_CATALOG.filter(i => (tab === 'All assets' || tab === i.assetClass || tab === 'Watchlist' && watchlist.includes(i.id)) && `${i.name} ${i.symbol} ${i.assetClass}`.toLowerCase().includes(query.toLowerCase()));
  let quote: ReturnType<typeof marketOrderQuote> | null = null;
  let quoteError = '';
  try { quote = marketOrderQuote(selectedId, quantity); } catch (cause) { quoteError = cause instanceof Error ? cause.message : 'Check quantity.'; }
  const select = (id: string) => { setSelected(id); setRisk(false); setError(''); setQuantity(id === 'btc' ? '0.001' : '1'); };
  function toggleWatchlist(id: string) {
    if (!context) return;
    context.save({ ...context.preferences, watchlist: watchlist.includes(id) ? watchlist.filter(x => x !== id) : [...watchlist, id] });
  }
  return <div className="investing-workspace space-y-6">
    <header className="invest-section-heading"><div><p className="invest-eyebrow">福 Bank / Investing</p><h1>Your money. More possibilities.</h1><p className="invest-muted">Discover assets, build a watchlist, and practice investing.</p></div><span className="invest-tag"><ShieldCheck size={14} aria-hidden />Simulation workspace</span></header>
    <section className="invest-summary-grid" aria-label="Portfolio summary">
      <div className="invest-hero"><p>Investment portfolio · CNY</p><strong>{cny(total)}</strong><span>Across {held.length} active holdings</span><div className="invest-hero-footer"><WalletCards size={17} aria-hidden />Fictional funds, real learning.</div></div>
      <div className="invest-panel invest-stat"><span className="invest-asset-icon"><Building2 size={22} aria-hidden /></span><p className="invest-muted">Cost basis</p><strong>{cny(costBasis)}</strong><span className="invest-fineprint">Includes existing wealth holdings</span></div>
      <div className="invest-panel invest-stat"><span className="invest-asset-icon"><ChartNoAxesCombined size={22} aria-hidden /></span><p className="invest-muted">Unrealized gain / loss</p><strong>{cny(total - costBasis)}</strong><span className="invest-fineprint">Illustrative prices; no live revaluation</span></div>
    </section>
    <p className="invest-data-note"><span className="invest-dot" />Demo dataset · fixed CNY-equivalent prices, not live quotes. No fees, leverage or automatic coupon payments are modeled.</p>
    {context?.storageWarning && <p role="status" className="invest-notice">Browser storage is unavailable. Your watchlist may only last this session.</p>}
    <div className="invest-main-grid">
      <div className="space-y-5 min-w-0"><section className="invest-panel">
        <div className="invest-section-heading"><div><p className="invest-eyebrow">Explore the markets</p><h2>Find your next idea</h2></div><label className="invest-search"><Search size={17} aria-hidden /><span className="sr-only">Search investments</span><input placeholder="Search name or symbol" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
        <div className="invest-tabs" aria-label="Investment categories">{['All assets', ...classes, 'Watchlist', 'Portfolio'].map(value => <button key={value} aria-pressed={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value}</button>)}</div>
        {tab !== 'Portfolio' ? <>
          <div className="invest-market-heading"><span>Asset / market</span><span>Demo price (CNY)</span><span className="sr-only">Actions</span></div>
          <div className="invest-market-list">{visible.map(i => { const Icon = assetIcons[i.assetClass]; return <article key={i.id} className={`invest-market-row ${i.id === selectedId ? 'selected' : ''}`}>
            <button className="invest-instrument" onClick={() => select(i.id)} aria-pressed={i.id === selectedId}><span className="invest-instrument-icon"><Icon size={19} aria-hidden /></span><span><strong>{i.symbol}</strong><span>{i.name}</span><small>{i.market}</small></span></button>
            <button className="invest-price" onClick={() => select(i.id)} aria-label={'Review ' + i.name}><strong>{cny(i.priceMinor)}</strong><span>{i.coupon ? i.coupon + ' example coupon' : 'Illustrative price'}</span></button>
            <button className="invest-icon-button" onClick={() => toggleWatchlist(i.id)} aria-label={(watchlist.includes(i.id) ? 'Remove ' : 'Watch ') + i.symbol} aria-pressed={watchlist.includes(i.id)}><Star size={18} fill={watchlist.includes(i.id) ? 'currentColor' : 'none'} aria-hidden /></button>
          </article>; })}</div>
          {!visible.length && <div className="invest-empty"><Search size={24} aria-hidden /><strong>{tab === 'Watchlist' ? 'Your watchlist is empty' : 'No matching assets'}</strong><p className="invest-muted">{tab === 'Watchlist' ? 'Use the star beside an asset to follow it.' : 'Try another company, symbol or category.'}</p></div>}
        </> : <div className="invest-holdings">{held.map(h => { const instrument = MARKET_CATALOG.find(i => 'market:' + i.id === h.productId); return <article className="reminder-row" key={h.id}><div><strong>{snapshot.investmentProducts.find(p => p.id === h.productId)?.name}</strong><p className="invest-muted">{Number(h.units).toLocaleString('en-US', { maximumFractionDigits: 8 })} units · Cost {formatMoney(h.costBasis)}</p></div><strong>{formatMoney(h.simulatedValue)}</strong>{instrument ? <button className="invest-text-link" onClick={() => { select(instrument.id); setDirection('sell'); }}>Review sale</button> : <Link className="invest-text-link" href="/wealth">Manage in Wealth →</Link>}</article>; })}{!held.length && <p className="invest-empty">No holdings yet. Start with a simulated buy order.</p>}</div>}
      </section>
      <section className="invest-panel"><div className="invest-section-heading"><div><p className="invest-eyebrow">The bigger picture</p><h2>Portfolio allocation</h2></div><Link href="/wealth" className="invest-text-link">Wealth tools →</Link></div><div className="invest-allocation">{['Stocks', 'Forex', 'Crypto', 'China bonds', 'Wealth funds'].map((asset, index) => {
        const value = held.filter(h => { const i = MARKET_CATALOG.find(i => 'market:' + i.id === h.productId); return i ? i.assetClass === asset : asset === 'Wealth funds'; }).reduce((sum, h) => sum + h.simulatedValue.amountMinor, 0n);
        const percent = total > 0n ? Number(value * 10000n / total) / 100 : 0;
        return <div key={asset}><div><span>{asset}</span><strong>{percent.toFixed(1)}%</strong></div><div className="invest-allocation-track"><span style={{ width: percent + '%', background: ['#087f70','#547da1','#9c79b8','#b88732','#6b9292'][index] }} /></div></div>;
      })}</div></section>
      <section className="invest-panel"><div className="invest-section-heading"><div><p className="invest-eyebrow">Your activity</p><h2>Recent investment orders</h2></div><Link href="/audit" className="invest-text-link">Audit receipts →</Link></div>{snapshot.investmentOrders.toReversed().slice(0, 5).map(order => <div className="reminder-row" key={order.id}><div><strong>{snapshot.investmentProducts.find(p => p.id === order.productId)?.name}</strong><p className="invest-muted">{order.direction === 'redeem' ? 'Sell / redeem' : 'Buy'} · {order.createdAt.slice(0, 10)} · {order.status}</p></div><strong>{formatMoney(order.amount)}</strong></div>)}</section>
      </div>
      <aside className="invest-ticket invest-panel" aria-labelledby="order-ticket-title">
        <p className="invest-eyebrow">Make your next move</p><h2 id="order-ticket-title">Order preview</h2><div className="invest-ticket-asset"><strong>{selected.symbol}</strong><span>{selected.name}</span><p>{cny(selected.priceMinor)} <small>/ unit · demo</small></p></div>
        <form onSubmit={e => { e.preventDefault(); try { if (!risk) throw new Error('Review and acknowledge the simulation terms.'); if (!quote) throw new Error(quoteError); if (!source) throw new Error('Choose a CNY account.'); if (direction === 'buy' && source.availableBalance.amountMinor < quote.amountMinor) throw new Error('Insufficient available balance.'); if (direction === 'sell' && (!selectedHolding || Number(selectedHolding.units) < Number(quantity))) throw new Error('Insufficient simulated holdings.'); request({ type: 'market-order', instrumentId: selectedId, sourceId, direction, quantity }); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not prepare order.'); } }}>
          <div className="invest-order-directions"><button type="button" aria-pressed={direction === 'buy'} className={direction === 'buy' ? 'active' : ''} onClick={() => setDirection('buy')}>Buy</button><button type="button" aria-pressed={direction === 'sell'} className={direction === 'sell' ? 'active' : ''} onClick={() => setDirection('sell')}>Sell</button></div>
          <label>Quantity {selected.assetClass === 'China bonds' ? '(whole CNY 100 face-value units)' : '(fractional units supported)'}<input aria-label="Investment quantity" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
          <label>{direction === 'buy' ? 'Funding' : 'Settlement'} account<select aria-label="Investment funding account" value={sourceId} onChange={e => setSource(e.target.value)}>{snapshot.accounts.filter(a => a.currency === 'CNY' && a.status === 'active').map(a => <option key={a.id} value={a.id}>CNY {a.type} · {formatMoney(a.availableBalance)}</option>)}</select></label>
          <dl className="invest-order-totals"><div><dt>Order value</dt><dd>{quote ? cny(quote.amountMinor) : '—'}</dd></div><div><dt>Demo fee</dt><dd>CNY 0.00</dd></div><div><dt>Units held</dt><dd>{Number(selectedHolding?.units ?? 0).toLocaleString('en-US', { maximumFractionDigits: 8 })}</dd></div><div><dt>Risk</dt><dd>{selected.risk === 'high' ? 'High' : 'Medium'}</dd></div></dl>
          <p className="invest-fineprint">{selected.description}</p>{selected.coupon && <div className="invest-bond-terms"><span>Example coupon <strong>{selected.coupon}</strong></span><span>Example tenor <strong>{selected.tenor}</strong></span><small>Coupon is not yield to maturity. Terms are fictional.</small></div>}
          <label className="invest-checkbox"><input type="checkbox" checked={risk} onChange={e => setRisk(e.target.checked)} /><span>I understand this uses fictional funds and illustrative prices. It cannot buy real assets.</span></label>
          {(error || quoteError) && <p className="invest-notice warning" role="alert">{error || quoteError}</p>}
          <button type="submit" disabled={!quote || !source || !risk || Boolean(pending)} className="invest-button invest-full">Review simulated {direction}<ArrowRight size={17} aria-hidden /></button>
        </form>
        <a href={selected.researchUrl} target="_blank" rel="noopener noreferrer" className="invest-research-link">{selected.assetClass === 'China bonds' ? 'Learn about China bonds' : 'Research on Yahoo Finance'}<ArrowUpRight size={15} aria-hidden /></a><p className="invest-fineprint">External research is separate from demo prices. No affiliation with the linked provider.</p>
      </aside>
    </div>
    <details className="invest-panel invest-learn"><summary>Before you invest: how this demo works</summary><p>Confirmed orders use the existing simulated bank balance, create a holding, and appear in transactions and audit history. Selling returns fictional cash. Prices remain fixed; gains, taxes, spreads, exchange lot sizes and settlement delays are not modeled.</p><p>China bond examples represent tradable book-entry debt, not savings treasury bonds. Real availability, account access and investor eligibility depend on the issuer and distributor. Crypto is an educational sandbox with no wallet or exchange connection.</p><div className="flex flex-wrap gap-4"><a className="invest-text-link" href="https://www.bca.co.id/id/Individu/layanan/e-banking/investasi" target="_blank" rel="noopener noreferrer">BCA investing reference ↗</a><a className="invest-text-link" href="https://www.boc.cn/en/pbservice/pb3/" target="_blank" rel="noopener noreferrer">Bank of China bond education ↗</a></div></details>
  </div>;
}
