'use client';
import { LocalizedA, LocalizedArticle, LocalizedAside, LocalizedButton, LocalizedDd, LocalizedDetails, LocalizedDiv, LocalizedDl, LocalizedDt, LocalizedForm, LocalizedH1, LocalizedH2, LocalizedHeader, LocalizedInput, LocalizedLabel, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedSmall, LocalizedSpan, LocalizedStrong, LocalizedSummary } from '../../i18n/localized';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Building2, ChartNoAxesCombined, Coins, Globe2, Landmark, Search, ShieldCheck, Star, WalletCards } from 'lucide-react';
import { useDemo } from '../../demo/demo-context';
import { formatMoney, money } from '../../domain/money';
import { AccountLink as Link } from '../../components/shell/account-link';
import { MARKET_CATALOG, marketOrderQuote, type AssetClass } from './market-catalog';
import { PortfolioQuickActions, PortfolioActivityPanel } from './portfolio-actions';
import { useInvestingPreferences } from './investing-preferences';

const assetIcons = { Stocks: ChartNoAxesCombined, Forex: Globe2, Crypto: Coins, 'China bonds': Landmark };
const classes: AssetClass[] = ['Stocks', 'Forex', 'Crypto', 'China bonds'];
const cny = (amount: bigint) => formatMoney(money(amount, 'CNY'));
const assetDescriptions = { Stocks: 'Explore companies at home and abroad.', Forex: 'Learn how currency exposure works.', Crypto: 'Explore digital assets and their risks.', 'China bonds': 'Understand government debt and coupons.' };

export function InvestingHomeSection() {
  return <LocalizedSection className="invest-home invest-panel" aria-labelledby="investing-home-title" data-testid="investing-home-section">
    <LocalizedDiv className="invest-section-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">Your next chapter</LocalizedP><LocalizedH2 id="investing-home-title">A little curiosity. A bigger world.</LocalizedH2><LocalizedP className="invest-muted">Explore investing with your banking in one place.</LocalizedP></LocalizedDiv><Link href="/investing" className="invest-button">Open Investing <ArrowRight size={17} aria-hidden /></Link></LocalizedDiv>
    <LocalizedDiv className="invest-asset-grid">{classes.map(asset => { const Icon = assetIcons[asset]; return <Link className="invest-asset-card" key={asset} href={'/investing?asset=' + encodeURIComponent(asset)}><LocalizedSpan className="invest-asset-icon"><Icon size={23} aria-hidden /></LocalizedSpan><LocalizedSpan className="invest-asset-title">{asset}<ArrowUpRight size={17} aria-hidden /></LocalizedSpan><LocalizedSpan className="invest-muted">{assetDescriptions[asset]}</LocalizedSpan></Link>; })}</LocalizedDiv>
    <LocalizedP className="invest-fineprint"><ShieldCheck size={14} aria-hidden />Practice with fictional funds. Prices and bond terms are illustrative. No real assets are traded.</LocalizedP>
  </LocalizedSection>;
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
  return <LocalizedDiv className="investing-workspace space-y-6">
    <LocalizedHeader className="invest-section-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">福 Bank / Investing</LocalizedP><LocalizedH1>Your money. More possibilities.</LocalizedH1><LocalizedP className="invest-muted">Discover assets, build a watchlist, and practice investing.</LocalizedP></LocalizedDiv><LocalizedSpan className="invest-tag"><ShieldCheck size={14} aria-hidden />Your portfolio</LocalizedSpan></LocalizedHeader>
    <LocalizedSection className="invest-summary-grid" aria-label="Portfolio summary">
      <LocalizedDiv className="invest-hero"><LocalizedP>Investment portfolio · CNY</LocalizedP><LocalizedStrong>{cny(total)}</LocalizedStrong><LocalizedSpan>Across {held.length} active holdings</LocalizedSpan><LocalizedDiv className="invest-hero-footer"><WalletCards size={17} aria-hidden />A clearer view of your investments.</LocalizedDiv></LocalizedDiv>
      <LocalizedDiv className="invest-panel invest-stat"><LocalizedSpan className="invest-asset-icon"><Building2 size={22} aria-hidden /></LocalizedSpan><LocalizedP className="invest-muted">Cost basis</LocalizedP><LocalizedStrong>{cny(costBasis)}</LocalizedStrong><LocalizedSpan className="invest-fineprint">Includes existing wealth holdings</LocalizedSpan></LocalizedDiv>
      <LocalizedDiv className="invest-panel invest-stat"><LocalizedSpan className="invest-asset-icon"><ChartNoAxesCombined size={22} aria-hidden /></LocalizedSpan><LocalizedP className="invest-muted">Unrealized gain / loss</LocalizedP><LocalizedStrong>{cny(total - costBasis)}</LocalizedStrong><LocalizedSpan className="invest-fineprint">Illustrative prices; no live revaluation</LocalizedSpan></LocalizedDiv>
    </LocalizedSection>
    <PortfolioQuickActions showInvest={false} />
    <LocalizedP className="invest-data-note"><LocalizedSpan className="invest-dot" />Demo dataset · fixed CNY-equivalent prices, not live quotes. No fees, leverage or automatic coupon payments are modeled.</LocalizedP>
    {context?.storageWarning && <LocalizedP role="status" className="invest-notice">Browser storage is unavailable. Your watchlist may only last this session.</LocalizedP>}
    <LocalizedDiv className="invest-main-grid">
      <LocalizedDiv className="space-y-5 min-w-0"><LocalizedSection className="invest-panel">
        <LocalizedDiv className="invest-section-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">Explore the markets</LocalizedP><LocalizedH2>Find your next idea</LocalizedH2></LocalizedDiv><LocalizedLabel className="invest-search"><Search size={17} aria-hidden /><LocalizedSpan className="sr-only">Search investments</LocalizedSpan><LocalizedInput placeholder="Search name or symbol" value={query} onChange={e => setQuery(e.target.value)} /></LocalizedLabel></LocalizedDiv>
        <LocalizedDiv className="invest-tabs" aria-label="Investment categories">{['All assets', ...classes, 'Watchlist', 'Portfolio'].map(value => <LocalizedButton key={value} aria-pressed={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value}</LocalizedButton>)}</LocalizedDiv>
        {tab !== 'Portfolio' ? <>
          <LocalizedDiv className="invest-market-heading"><LocalizedSpan>Asset / market</LocalizedSpan><LocalizedSpan>Demo price (CNY)</LocalizedSpan><LocalizedSpan className="sr-only">Actions</LocalizedSpan></LocalizedDiv>
          <LocalizedDiv className="invest-market-list">{visible.map(i => { const Icon = assetIcons[i.assetClass]; return <LocalizedArticle key={i.id} className={`invest-market-row ${i.id === selectedId ? 'selected' : ''}`}>
            <LocalizedButton className="invest-instrument" onClick={() => select(i.id)} aria-pressed={i.id === selectedId}><LocalizedSpan className="invest-instrument-icon"><Icon size={19} aria-hidden /></LocalizedSpan><LocalizedSpan><LocalizedStrong>{i.symbol}</LocalizedStrong><LocalizedSpan>{i.name}</LocalizedSpan><LocalizedSmall>{i.market}</LocalizedSmall></LocalizedSpan></LocalizedButton>
            <LocalizedButton className="invest-price" onClick={() => select(i.id)} aria-label={'Review ' + i.name}><LocalizedStrong>{cny(i.priceMinor)}</LocalizedStrong><LocalizedSpan>{i.coupon ? i.coupon + ' example coupon' : 'Illustrative price'}</LocalizedSpan></LocalizedButton>
            <LocalizedButton className="invest-icon-button" onClick={() => toggleWatchlist(i.id)} aria-label={(watchlist.includes(i.id) ? 'Remove ' : 'Watch ') + i.symbol} aria-pressed={watchlist.includes(i.id)}><Star size={18} fill={watchlist.includes(i.id) ? 'currentColor' : 'none'} aria-hidden /></LocalizedButton>
          </LocalizedArticle>; })}</LocalizedDiv>
          {!visible.length && <LocalizedDiv className="invest-empty"><Search size={24} aria-hidden /><LocalizedStrong>{tab === 'Watchlist' ? 'Your watchlist is empty' : 'No matching assets'}</LocalizedStrong><LocalizedP className="invest-muted">{tab === 'Watchlist' ? 'Use the star beside an asset to follow it.' : 'Try another company, symbol or category.'}</LocalizedP></LocalizedDiv>}
        </> : <LocalizedDiv className="invest-holdings">{held.map(h => { const instrument = MARKET_CATALOG.find(i => 'market:' + i.id === h.productId); return <LocalizedArticle className="reminder-row" key={h.id}><LocalizedDiv><LocalizedStrong>{snapshot.investmentProducts.find(p => p.id === h.productId)?.name}</LocalizedStrong><LocalizedP className="invest-muted">{Number(h.units).toLocaleString('en-US', { maximumFractionDigits: 8 })} units · Cost {formatMoney(h.costBasis)}</LocalizedP></LocalizedDiv><LocalizedStrong>{formatMoney(h.simulatedValue)}</LocalizedStrong>{instrument ? <LocalizedButton className="invest-text-link" onClick={() => { select(instrument.id); setDirection('sell'); }}>Review sale</LocalizedButton> : <Link className="invest-text-link" href="/wealth">Manage in Wealth →</Link>}</LocalizedArticle>; })}{!held.length && <LocalizedP className="invest-empty">No holdings yet. Start with a simulated buy order.</LocalizedP>}</LocalizedDiv>}
      </LocalizedSection>
      <LocalizedSection className="invest-panel"><LocalizedDiv className="invest-section-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">The bigger picture</LocalizedP><LocalizedH2>Portfolio allocation</LocalizedH2></LocalizedDiv><Link href="/wealth" className="invest-text-link">Wealth tools →</Link></LocalizedDiv><LocalizedDiv className="invest-allocation">{['Stocks', 'Forex', 'Crypto', 'China bonds', 'Wealth funds'].map((asset, index) => {
        const value = held.filter(h => { const i = MARKET_CATALOG.find(i => 'market:' + i.id === h.productId); return i ? i.assetClass === asset : asset === 'Wealth funds'; }).reduce((sum, h) => sum + h.simulatedValue.amountMinor, 0n);
        const percent = total > 0n ? Number(value * 10000n / total) / 100 : 0;
        return <LocalizedDiv key={asset}><LocalizedDiv><LocalizedSpan>{asset}</LocalizedSpan><LocalizedStrong>{percent.toFixed(1)}%</LocalizedStrong></LocalizedDiv><LocalizedDiv className="invest-allocation-track"><LocalizedSpan style={{ width: percent + '%', background: ['#087f70','#547da1','#9c79b8','#b88732','#6b9292'][index] }} /></LocalizedDiv></LocalizedDiv>;
      })}</LocalizedDiv></LocalizedSection>
      <PortfolioActivityPanel />
      </LocalizedDiv>
      <LocalizedAside className="invest-ticket invest-panel" aria-labelledby="order-ticket-title">
        <LocalizedP className="invest-eyebrow">Make your next move</LocalizedP><LocalizedH2 id="order-ticket-title">Order preview</LocalizedH2><LocalizedDiv className="invest-ticket-asset"><LocalizedStrong>{selected.symbol}</LocalizedStrong><LocalizedSpan>{selected.name}</LocalizedSpan><LocalizedP>{cny(selected.priceMinor)} <LocalizedSmall>/ unit</LocalizedSmall></LocalizedP></LocalizedDiv>
        <LocalizedForm onSubmit={e => { e.preventDefault(); try { if (!risk) throw new Error('Review and acknowledge the simulation terms.'); if (!quote) throw new Error(quoteError); if (!source) throw new Error('Choose a CNY account.'); if (direction === 'buy' && source.availableBalance.amountMinor < quote.amountMinor) throw new Error('Insufficient available balance.'); if (direction === 'sell' && (!selectedHolding || Number(selectedHolding.units) < Number(quantity))) throw new Error('Insufficient simulated holdings.'); request({ type: 'market-order', instrumentId: selectedId, sourceId, direction, quantity }); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not prepare order.'); } }}>
          <LocalizedDiv className="invest-order-directions"><LocalizedButton type="button" aria-pressed={direction === 'buy'} className={direction === 'buy' ? 'active' : ''} onClick={() => setDirection('buy')}>Buy</LocalizedButton><LocalizedButton type="button" aria-pressed={direction === 'sell'} className={direction === 'sell' ? 'active' : ''} onClick={() => setDirection('sell')}>Sell</LocalizedButton></LocalizedDiv>
          <LocalizedLabel>Quantity {selected.assetClass === 'China bonds' ? '(whole CNY 100 face-value units)' : '(fractional units supported)'}<LocalizedInput aria-label="Investment quantity" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} /></LocalizedLabel>
          <LocalizedLabel>{direction === 'buy' ? 'Funding' : 'Settlement'} account<LocalizedSelect aria-label="Investment funding account" value={sourceId} onChange={e => setSource(e.target.value)}>{snapshot.accounts.filter(a => a.currency === 'CNY' && a.status === 'active').map(a => <LocalizedOption key={a.id} value={a.id}>CNY {a.type} · {formatMoney(a.availableBalance)}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
          <LocalizedDl className="invest-order-totals"><LocalizedDiv><LocalizedDt>Order value</LocalizedDt><LocalizedDd>{quote ? cny(quote.amountMinor) : '—'}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Demo fee</LocalizedDt><LocalizedDd>CNY 0.00</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Units held</LocalizedDt><LocalizedDd>{Number(selectedHolding?.units ?? 0).toLocaleString('en-US', { maximumFractionDigits: 8 })}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Risk</LocalizedDt><LocalizedDd>{selected.risk === 'high' ? 'High' : 'Medium'}</LocalizedDd></LocalizedDiv></LocalizedDl>
          <LocalizedP className="invest-fineprint">{selected.description}</LocalizedP>{selected.coupon && <LocalizedDiv className="invest-bond-terms"><LocalizedSpan>Example coupon <LocalizedStrong>{selected.coupon}</LocalizedStrong></LocalizedSpan><LocalizedSpan>Example tenor <LocalizedStrong>{selected.tenor}</LocalizedStrong></LocalizedSpan><LocalizedSmall>Coupon is not yield to maturity. Terms are fictional.</LocalizedSmall></LocalizedDiv>}
          <LocalizedLabel className="invest-checkbox"><LocalizedInput type="checkbox" checked={risk} onChange={e => setRisk(e.target.checked)} /><LocalizedSpan>I understand this uses fictional funds and illustrative prices. It cannot buy real assets.</LocalizedSpan></LocalizedLabel>
          {(error || quoteError) && <LocalizedP className="invest-notice warning" role="alert">{error || quoteError}</LocalizedP>}
          <LocalizedButton type="submit" disabled={!quote || !source || !risk || Boolean(pending)} className="invest-button invest-full">Review simulated {direction}<ArrowRight size={17} aria-hidden /></LocalizedButton>
        </LocalizedForm>
        <LocalizedA href={selected.researchUrl} target="_blank" rel="noopener noreferrer" className="invest-research-link">{selected.assetClass === 'China bonds' ? 'Learn about China bonds' : 'Research on Yahoo Finance'}<ArrowUpRight size={15} aria-hidden /></LocalizedA><LocalizedP className="invest-fineprint">External research uses different pricing sources. No affiliation with the linked provider.</LocalizedP>
      </LocalizedAside>
    </LocalizedDiv>
    <LocalizedDetails className="invest-panel invest-learn"><LocalizedSummary>Pricing and execution details</LocalizedSummary><LocalizedP>Confirmed orders use the existing simulated bank balance, create a holding, and appear in transactions and audit history. Selling returns fictional cash. Prices remain fixed; gains, taxes, spreads, exchange lot sizes and settlement delays are not modeled.</LocalizedP><LocalizedP>China bond examples represent tradable book-entry debt, not savings treasury bonds. Real availability, account access and investor eligibility depend on the issuer and distributor. Crypto is an educational sandbox with no wallet or exchange connection.</LocalizedP><LocalizedDiv className="flex flex-wrap gap-4"><LocalizedA className="invest-text-link" href="https://www.bca.co.id/id/Individu/layanan/e-banking/investasi" target="_blank" rel="noopener noreferrer">BCA investing reference ↗</LocalizedA><LocalizedA className="invest-text-link" href="https://www.boc.cn/en/pbservice/pb3/" target="_blank" rel="noopener noreferrer">Bank of China bond education ↗</LocalizedA></LocalizedDiv></LocalizedDetails>
  </LocalizedDiv>;
}
