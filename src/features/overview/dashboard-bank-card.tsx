'use client';
import { useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, LockKeyhole, Plus, Snowflake } from 'lucide-react';
import type { Card } from '../../domain/entities';
import type { MembershipTier } from './membership';
import { AccountLink as Link } from '../../components/shell/account-link';
import { BankCardFace } from './bank-card-face';
import { DashboardDialog } from '../../components/ui/dashboard-dialog';
import { useOptionalDemo } from '../../demo/demo-context';
import { formatMoney } from '../../domain/money';
import { parseMajorAmount } from '../demo/planning-helpers';

const cardName = (card: Card) => card.purpose === 'daily' ? 'Daily spending' : 'Online shopping';
export function DashboardBankCard({ cards, cardholderName, tier }: { cards: readonly Card[]; cardholderName: string; tier: MembershipTier }) {
  const demo = useOptionalDemo();
  const [selectedId, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const selected = cards.find(card => card.id === selectedId);
  const accounts = demo?.snapshot.accounts.filter(a => a.currency === 'CNY' && a.status === 'active') ?? [];
  return <section className="dashboard-card-panel card-gallery-panel" aria-label="Your virtual bank card">
    <div className="dashboard-card-heading"><div><p>Your everyday companions</p><h2>Your cards</h2></div>{demo ? <button type="button" className="card-gallery-add" aria-label="Add virtual card" disabled={cards.length >= 10 || !accounts.length} onClick={() => { setError(''); setAdding(true); }}><Plus size={16} aria-hidden />Add</button> : <span className="dashboard-card-count">{cards.length} virtual cards</span>}</div>
    {cards.length ? <div className="card-gallery" aria-label="Virtual card gallery">{cards.map((card, index) => <button type="button" className="card-gallery-item" key={card.id} data-variant={index % 3} aria-label={'View ' + cardName(card).toLowerCase() + ' card ending ' + card.maskedNumber.slice(-4)} aria-haspopup="dialog" onClick={() => { setSelected(card.id); setError(''); }}>
      <div aria-hidden="true"><BankCardFace card={card} cardholderName={cardholderName} tier={tier} /></div><span className="card-gallery-caption"><strong>{cardName(card)}</strong><span>{card.freezeState === 'frozen' ? 'Frozen' : 'Active'} · Tap to expand</span></span>
    </button>)}</div> : <p className="dashboard-card-empty">No virtual cards yet. Add a card to get started.</p>}
    <div className="dashboard-card-footer"><span><LockKeyhole size={13} aria-hidden />{cards.length} masked virtual cards</span><Link href="/cards" className="dashboard-card-manage">Manage cards<ArrowUpRight size={14} aria-hidden /></Link></div>
    {selected && <DashboardDialog title={cardName(selected) + ' virtual card'} onClose={() => setSelected(null)}>
      <div className="expanded-card-stage"><BankCardFace card={selected} cardholderName={cardholderName} tier={tier} /></div>
      <div className="expanded-card-state"><span className="invest-tag">{selected.freezeState === 'frozen' ? 'Frozen' : 'Active'}</span><span>Ending {selected.maskedNumber.slice(-4)} · Virtual CNY card</span></div>
      <div className="expanded-card-actions"><Link href={'/transfers?account=' + selected.accountId} onClick={() => setSelected(null)}><ArrowLeftRight size={19} aria-hidden />Transfer</Link>{demo && <button type="button" onClick={() => { demo.request({ type: 'card', cardId: selected.id, mode: selected.freezeState === 'frozen' ? 'unfreeze' : 'freeze' }); setSelected(null); }}><Snowflake size={19} aria-hidden />{selected.freezeState === 'frozen' ? 'Review unfreeze' : 'Review freeze'}</button>}<Link href="/cards" onClick={() => setSelected(null)}><LockKeyhole size={19} aria-hidden />Manage cards</Link></div>
      <dl className="expanded-card-limits"><div><dt>Daily limit</dt><dd>{formatMoney(selected.dailyLimit)}</dd></div><div><dt>Monthly limit</dt><dd>{formatMoney(selected.monthlyLimit)}</dd></div></dl>
      {demo && <form className="expanded-card-limit-form" onSubmit={event => { event.preventDefault(); try { const value = String(new FormData(event.currentTarget).get('limit')); demo.request({ type: 'card', cardId: selected.id, mode: 'limit', limitMinor: parseMajorAmount(value, 'CNY') }); setSelected(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check limit.'); } }}><label>New monthly limit (CNY)<input required name="limit" inputMode="decimal" placeholder="5000.00" /></label><button className="invest-button" type="submit">Review limit change</button></form>}
      {error && <p className="invest-notice warning" role="alert">{error}</p>}
    </DashboardDialog>}
    {adding && demo && <DashboardDialog title="Add a virtual card" onClose={() => setAdding(false)}><p className="invest-muted">Create a simulated card for an existing CNY account. No real payment card is issued.</p><form className="expanded-card-add-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); demo.request({ type: 'create-card', sourceId: String(data.get('source')), purpose: String(data.get('purpose')) as 'daily' | 'online-shopping' }); setAdding(false); }}><label>Linked account<select name="source">{accounts.map(a => <option value={a.id} key={a.id}>CNY {a.type} · {formatMoney(a.availableBalance)}</option>)}</select></label><label>Card purpose<select name="purpose"><option value="daily">Daily spending</option><option value="online-shopping">Online shopping</option></select></label><p className="invest-fineprint">Starting limits: CNY 1,000 daily and CNY 5,000 monthly. Limits can be changed after creation.</p><button className="invest-button invest-full" type="submit">Review new card</button></form></DashboardDialog>}
  </section>;
}
