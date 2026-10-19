'use client';
import { useState } from 'react';
import { ArrowUpRight, LockKeyhole, Wifi } from 'lucide-react';
import type { Card } from '../../domain/entities';
import type { MembershipTier } from './membership';
import { AccountLink as Link } from '../../components/shell/account-link';

export function DashboardBankCard({ cards, cardholderName, tier }: { cards: readonly Card[]; cardholderName: string; tier: MembershipTier }) {
  const [selectedId, setSelected] = useState(cards[0]?.id ?? '');
  const selected = cards.find(card => card.id === selectedId) ?? cards[0];
  return <section className="dashboard-card-panel" aria-label="Your virtual bank card">
    <div className="dashboard-card-heading"><div><p>Your everyday companion</p><h2>Your bank card</h2></div><span className="dashboard-card-count">{cards.length} virtual {cards.length === 1 ? 'card' : 'cards'}</span></div>
    {selected ? <>
      <div className="bank-card-stage"><div className="bank-card-face" data-tier={tier.key} data-frozen={selected.freezeState === 'frozen'}>
        <div className="bank-card-top"><strong><span className="fu-logo" aria-hidden>福</span>福 Bank</strong><span>{tier.name}</span></div>
        <div className="bank-card-chip-row"><svg className="bank-card-chip" viewBox="0 0 46 34" width="40" height="30" aria-hidden="true"><rect x="1" y="1" width="44" height="32" rx="7" fill="#ddc48b" stroke="#a58b52" /><path d="M15 1v10H1m44 0H31V1M1 23h14v10m30-10H31v10M15 11h16v12H15zM1 17h14m16 0h14" fill="none" stroke="#9b8148" strokeWidth="1.2" /></svg><Wifi size={23} className="bank-card-contactless" aria-hidden /></div>
        <p className="bank-card-number">{selected.maskedNumber}</p>
        <div className="bank-card-bottom"><div><span>Cardholder</span><strong>{cardholderName}</strong></div><div><span>Card type</span><strong>Virtual · CNY</strong></div><span className="bank-card-monogram" aria-hidden>FU</span></div>
      </div></div>
      <div className="dashboard-card-controls"><label><span className="sr-only">Choose virtual card</span><select aria-label="Choose virtual card" value={selected.id} onChange={event => setSelected(event.target.value)}>{cards.map(card => <option key={card.id} value={card.id}>{card.purpose === 'daily' ? 'Daily spending' : 'Online shopping'} · {card.maskedNumber.slice(-4)}</option>)}</select></label><span className="dashboard-card-status" data-frozen={selected.freezeState === 'frozen'}><span />{selected.freezeState === 'frozen' ? 'Frozen' : 'Active'}</span></div>
    </> : <p className="dashboard-card-empty">No virtual cards to display.</p>}
    <div className="dashboard-card-footer"><span><LockKeyhole size={13} aria-hidden />Masked for your privacy</span><Link href="/cards" className="dashboard-card-manage">Manage cards<ArrowUpRight size={14} aria-hidden /></Link></div>
  </section>;
}
