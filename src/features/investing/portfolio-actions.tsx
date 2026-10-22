'use client';
import { LocalizedArticle, LocalizedButton, LocalizedDiv, LocalizedForm, LocalizedH2, LocalizedH3, LocalizedInput, LocalizedLabel, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedSmall, LocalizedSpan, LocalizedStrong, LocalizedTime } from '../../i18n/localized';
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
  return <DashboardDialog title="Sell an investment" onClose={onClose}><LocalizedP className="invest-muted">Sell or redeem an owned investment and return the proceeds to your simulated CNY account. Your order needs confirmation.</LocalizedP>
    {!holdings.length ? <LocalizedDiv className="invest-empty"><LocalizedP>No investments available to sell.</LocalizedP><Link href="/investing" onClick={onClose} className="invest-button">Explore investing</Link></LocalizedDiv> : <LocalizedForm className="expanded-card-add-form" onSubmit={event => { event.preventDefault(); try {
      if (!holding || !sourceId) throw new Error('Choose an investment and a settlement account.');
      if (instrument) { const quoted = marketOrderQuote(instrument.id, amount); if (quoted.amountMinor > holding.simulatedValue.amountMinor) throw new Error('Amount exceeds your holding.'); request({ type: 'market-order', instrumentId: instrument.id, sourceId, direction: 'sell', quantity: amount }); }
      else { const minor = parseMajorAmount(amount, 'CNY'); if (BigInt(minor) > holding.simulatedValue.amountMinor) throw new Error('Amount exceeds your holding.'); request({ type: 'investment', productId: holding.productId, sourceId, direction: 'redeem', amountMinor: minor }); }
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check withdrawal details.'); } }}>
      <LocalizedLabel>Investment to sell<LocalizedSelect aria-label="Investment to sell" value={holdingId} onChange={event => { setHolding(event.target.value); setValue(null); setError(''); }}>{holdings.map(h => <LocalizedOption key={h.id} value={h.id}>{snapshot.investmentProducts.find(p => p.id === h.productId)?.name} · {formatMoney(h.simulatedValue)}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
      <LocalizedLabel>{instrument ? 'Units to sell' : 'Amount to redeem (CNY)'}<LocalizedDiv className="withdraw-amount"><LocalizedInput aria-label="Sale or redemption amount" inputMode="decimal" value={amount} onChange={event => setValue(event.target.value)} /><LocalizedButton type="button" onClick={() => setValue(maximum)}>Max</LocalizedButton></LocalizedDiv></LocalizedLabel>
      <LocalizedLabel>Receive into<LocalizedSelect aria-label="Sale proceeds account" value={sourceId} onChange={event => setSource(event.target.value)}>{accounts.map(a => <LocalizedOption value={a.id} key={a.id}>CNY {a.type} · {formatMoney(a.availableBalance)}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
      <LocalizedDiv className="withdraw-proceeds"><LocalizedSpan>Estimated proceeds</LocalizedSpan><LocalizedStrong>{quote}</LocalizedStrong></LocalizedDiv>
      {error && <LocalizedP role="alert" className="invest-notice warning">{error}</LocalizedP>}
      <LocalizedButton type="submit" className="invest-button invest-full" disabled={!accounts.length}>Review sale or redemption<ArrowDownToLine size={17} aria-hidden /></LocalizedButton>
      <LocalizedP className="invest-fineprint">Uses fixed demo valuations and zero demo fees. No real securities or funds move.</LocalizedP>
    </LocalizedForm>}
  </DashboardDialog>;
}

export function PortfolioQuickActions({ showInvest = true }: { showInvest?: boolean }) {
  const demo = useOptionalDemo();
  const [withdrawing, setWithdrawing] = useState(false);
  const accounts = demo?.snapshot.accounts.filter(a => a.ownerId === demo.snapshot.users[0].id && a.status === 'active' && a.currency === 'CNY') ?? [];
  const destination = accounts.find(a => a.type === 'daily');
  const source = accounts.find(a => a.id !== destination?.id);
  const transferQuery = new URLSearchParams({ mode: 'internal', ...(source ? { source: source.id } : {}), ...(destination ? { destination: destination.id } : {}) });
  return <><LocalizedDiv className="portfolio-quick-actions" data-actions={showInvest ? 3 : 2} aria-label="Portfolio actions">{showInvest && <Link href="/investing"><ChartNoAxesCombined size={19} aria-hidden /><LocalizedSpan>Invest</LocalizedSpan></Link>}<Link href={'/transfers?'+transferQuery+'#between-accounts'} title="Move money between your own accounts; this does not add new funds"><Plus size={19} aria-hidden /><LocalizedSpan>Transfer between accounts</LocalizedSpan></Link>{demo ? <LocalizedButton type="button" onClick={() => setWithdrawing(true)}><ArrowDownToLine size={19} aria-hidden /><LocalizedSpan>Sell investment</LocalizedSpan></LocalizedButton> : <Link href="/investing"><ArrowDownToLine size={19} aria-hidden /><LocalizedSpan>Sell investment</LocalizedSpan></Link>}</LocalizedDiv>{withdrawing && <WithdrawDialog onClose={() => setWithdrawing(false)} />}</>;
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
  return <LocalizedSection className="portfolio-activity-panel" aria-label="Investment movements"><LocalizedDiv className="invest-section-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">Your portfolio</LocalizedP><LocalizedH2>Invested & withdrawn</LocalizedH2></LocalizedDiv><Link href="/investing" className="invest-text-link">View all<ArrowUpRight size={14} aria-hidden /></Link></LocalizedDiv>
    <LocalizedDiv className="portfolio-movement-totals"><LocalizedDiv><LocalizedSpan>Currently invested</LocalizedSpan><LocalizedStrong>{formatMoney(money(invested, 'CNY'))}</LocalizedStrong><LocalizedSmall>Cost basis of current holdings</LocalizedSmall></LocalizedDiv><LocalizedDiv><LocalizedSpan>Total withdrawn</LocalizedSpan><LocalizedStrong>{formatMoney(money(withdrawn, 'CNY'))}</LocalizedStrong><LocalizedSmall>Completed sales and redemptions</LocalizedSmall></LocalizedDiv></LocalizedDiv>
    {showHoldings && <LocalizedDiv className="portfolio-top-holdings"><LocalizedH3>Top holdings</LocalizedH3>{holdings.slice(0, 3).map(h => <LocalizedDiv key={h.id}><LocalizedSpan className="portfolio-holding-avatar">{snapshot.investmentProducts.find(p => p.id === h.productId)?.name.replace(/^Demo /, '').slice(0, 2).toUpperCase()}</LocalizedSpan><LocalizedSpan>{snapshot.investmentProducts.find(p => p.id === h.productId)?.name}</LocalizedSpan><LocalizedStrong>{formatMoney(h.simulatedValue)}</LocalizedStrong></LocalizedDiv>)}</LocalizedDiv>}
    <LocalizedDiv className="portfolio-movement-filter" aria-label="Investment activity filters">{['All', 'Invested', 'Withdrawn'].map(value => <LocalizedButton type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</LocalizedButton>)}</LocalizedDiv>
    <LocalizedDiv className="portfolio-movements">{orders.toReversed().filter(o => filter === 'All' || (filter === 'Invested' ? o.direction === 'buy' : o.direction === 'redeem')).slice(0, 5).map(o => <LocalizedArticle key={o.id}><LocalizedSpan className="portfolio-movement-label" data-direction={o.direction}>{o.direction === 'buy' ? 'Invested' : 'Withdrawn'}</LocalizedSpan><LocalizedTime>{new Date(o.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Shanghai', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</LocalizedTime><LocalizedStrong>{snapshot.investmentProducts.find(p => p.id === o.productId)?.name}</LocalizedStrong><LocalizedSpan>{formatMoney(o.amount)}</LocalizedSpan></LocalizedArticle>)}{!orders.some(o => filter === 'All' || (filter === 'Invested' ? o.direction === 'buy' : o.direction === 'redeem')) && <LocalizedP className="invest-muted">No {filter === 'All' ? '' : filter.toLowerCase() + ' '}activity yet.</LocalizedP>}</LocalizedDiv>
  </LocalizedSection>;
}
