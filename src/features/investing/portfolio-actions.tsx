'use client';
import { useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, ChartNoAxesCombined, Plus } from 'lucide-react';
import { useDemo, useOptionalDemo } from '../../demo/demo-context';
import { AccountLink as Link } from '../../components/shell/account-link';
import { DashboardDialog } from '../../components/ui/dashboard-dialog';
import { formatMoney, money } from '../../domain/money';
import { parseMajorAmount } from '../demo/planning-helpers';
import { MARKET_CATALOG, marketOrderQuote } from './market-catalog';

function WithdrawDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, request } = useDemo();
  const holdings = snapshot.holdings.filter(h => h.ownerId === snapshot.users[0].id && h.simulatedValue.amountMinor > 0n);
  const accounts = snapshot.accounts.filter(a => a.ownerId === snapshot.users[0].id && a.status === 'active' && a.currency === 'CNY');
  const [holdingId, setHolding] = useState(holdings[0]?.id ?? '');
  const [sourceId, setSource] = useState(accounts[0]?.id ?? '');
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState('');
  const holding = holdings.find(h => h.id === holdingId);
  const instrument = MARKET_CATALOG.find(i => 'market:' + i.id === holding?.productId);
  const maximum = holding ? instrument ? holding.units : (Number(holding.simulatedValue.amountMinor) / 100).toFixed(2) : '0';
  const amount = value ?? maximum;
  let quote = '—';
  try { quote = formatMoney(money(instrument ? marketOrderQuote(instrument.id, amount).amountMinor : BigInt(parseMajorAmount(amount, 'CNY')), 'CNY')); } catch { /* Validation is shown on review. */ }
  return <DashboardDialog title="Withdraw from investments" onClose={onClose}><p className="invest-muted">Sell or redeem an owned investment and return the proceeds to your simulated CNY account. Your order needs confirmation.</p>
    {!holdings.length ? <div className="invest-empty"><p>No investments available to withdraw.</p><Link href="/investing" onClick={onClose} className="invest-button">Explore investing</Link></div> : <form className="expanded-card-add-form" onSubmit={event => { event.preventDefault(); try {
      if (!holding || !sourceId) throw new Error('Choose an investment and a settlement account.');
      if (instrument) { const quoted = marketOrderQuote(instrument.id, amount); if (quoted.amountMinor > holding.simulatedValue.amountMinor) throw new Error('Amount exceeds your holding.'); request({ type: 'market-order', instrumentId: instrument.id, sourceId, direction: 'sell', quantity: amount }); }
      else { const minor = parseMajorAmount(amount, 'CNY'); if (BigInt(minor) > holding.simulatedValue.amountMinor) throw new Error('Amount exceeds your holding.'); request({ type: 'investment', productId: holding.productId, sourceId, direction: 'redeem', amountMinor: minor }); }
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check withdrawal details.'); } }}>
      <label>Investment to withdraw<select aria-label="Investment to withdraw" value={holdingId} onChange={event => { setHolding(event.target.value); setValue(null); setError(''); }}>{holdings.map(h => <option key={h.id} value={h.id}>{snapshot.investmentProducts.find(p => p.id === h.productId)?.name} · {formatMoney(h.simulatedValue)}</option>)}</select></label>
      <label>{instrument ? 'Units to sell' : 'Withdrawal amount (CNY)'}<div className="withdraw-amount"><input aria-label="Withdrawal amount" inputMode="decimal" value={amount} onChange={event => setValue(event.target.value)} /><button type="button" onClick={() => setValue(maximum)}>Max</button></div></label>
      <label>Receive into<select aria-label="Withdrawal settlement account" value={sourceId} onChange={event => setSource(event.target.value)}>{accounts.map(a => <option value={a.id} key={a.id}>CNY {a.type} · {formatMoney(a.availableBalance)}</option>)}</select></label>
      <div className="withdraw-proceeds"><span>Estimated proceeds</span><strong>{quote}</strong></div>
      {error && <p role="alert" className="invest-notice warning">{error}</p>}
      <button type="submit" className="invest-button invest-full" disabled={!accounts.length}>Review withdrawal<ArrowDownToLine size={17} aria-hidden /></button>
      <p className="invest-fineprint">Uses fixed demo valuations and zero demo fees. No real securities or funds move.</p>
    </form>}
  </DashboardDialog>;
}

export function PortfolioQuickActions() {
  const demo = useOptionalDemo();
  const [withdrawing, setWithdrawing] = useState(false);
  return <><div className="portfolio-quick-actions" aria-label="Portfolio actions"><Link href="/investing"><ChartNoAxesCombined size={19} aria-hidden /><span>Invest</span></Link><Link href="/transfers" title="Move funds between simulated bank accounts"><Plus size={19} aria-hidden /><span>Add funds</span></Link>{demo ? <button type="button" onClick={() => setWithdrawing(true)}><ArrowDownToLine size={19} aria-hidden /><span>Withdraw</span></button> : <Link href="/investing"><ArrowDownToLine size={19} aria-hidden /><span>Withdraw</span></Link>}</div>{withdrawing && <WithdrawDialog onClose={() => setWithdrawing(false)} />}</>;
}

export function PortfolioActivityPanel({ showHoldings = true }: { showHoldings?: boolean }) {
  const demo = useOptionalDemo();
  const [filter, setFilter] = useState('All');
  if (!demo) return null;
  const { snapshot } = demo;
  const owner = snapshot.users[0].id;
  const holdings = snapshot.holdings.filter(h => h.ownerId === owner && h.simulatedValue.amountMinor > 0n).toSorted((a, b) => a.simulatedValue.amountMinor === b.simulatedValue.amountMinor ? 0 : a.simulatedValue.amountMinor > b.simulatedValue.amountMinor ? -1 : 1);
  const orders = snapshot.investmentOrders.filter(o => o.ownerId === owner && o.status === 'completed');
  const withdrawn = orders.filter(o => o.direction === 'redeem').reduce((sum, o) => sum + o.amount.amountMinor, 0n);
  const invested = holdings.reduce((sum, h) => sum + h.costBasis.amountMinor, 0n);
  return <section className="portfolio-activity-panel" aria-label="Investment movements"><div className="invest-section-heading"><div><p className="invest-eyebrow">Your portfolio</p><h2>Invested & withdrawn</h2></div><Link href="/investing" className="invest-text-link">View all<ArrowUpRight size={14} aria-hidden /></Link></div>
    <div className="portfolio-movement-totals"><div><span>Currently invested</span><strong>{formatMoney(money(invested, 'CNY'))}</strong><small>Cost basis of current holdings</small></div><div><span>Total withdrawn</span><strong>{formatMoney(money(withdrawn, 'CNY'))}</strong><small>Completed sales and redemptions</small></div></div>
    {showHoldings && <div className="portfolio-top-holdings"><h3>Top holdings</h3>{holdings.slice(0, 3).map(h => <div key={h.id}><span className="portfolio-holding-avatar">{snapshot.investmentProducts.find(p => p.id === h.productId)?.name.replace(/^Demo /, '').slice(0, 2).toUpperCase()}</span><span>{snapshot.investmentProducts.find(p => p.id === h.productId)?.name}</span><strong>{formatMoney(h.simulatedValue)}</strong></div>)}</div>}
    <div className="portfolio-movement-filter" aria-label="Investment activity filters">{['All', 'Invested', 'Withdrawn'].map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
    <div className="portfolio-movements">{orders.toReversed().filter(o => filter === 'All' || (filter === 'Invested' ? o.direction === 'buy' : o.direction === 'redeem')).slice(0, 5).map(o => <article key={o.id}><span className="portfolio-movement-label" data-direction={o.direction}>{o.direction === 'buy' ? 'Invested' : 'Withdrawn'}</span><time>{new Date(o.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Shanghai', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><strong>{snapshot.investmentProducts.find(p => p.id === o.productId)?.name}</strong><span>{formatMoney(o.amount)}</span></article>)}{!orders.some(o => filter === 'All' || (filter === 'Invested' ? o.direction === 'buy' : o.direction === 'redeem')) && <p className="invest-muted">No {filter === 'All' ? '' : filter.toLowerCase() + ' '}activity yet.</p>}</div>
  </section>;
}
