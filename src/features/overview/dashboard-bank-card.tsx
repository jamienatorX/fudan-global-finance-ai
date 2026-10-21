'use client';
import { LocalizedButton, LocalizedDd, LocalizedDiv, LocalizedDl, LocalizedDt, LocalizedForm, LocalizedH2, LocalizedInput, LocalizedLabel, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
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
  return <LocalizedSection className="dashboard-card-panel card-gallery-panel" aria-label="Your virtual bank card">
    <LocalizedDiv className="dashboard-card-heading"><LocalizedDiv><LocalizedP>Your everyday companions</LocalizedP><LocalizedH2>Your cards</LocalizedH2></LocalizedDiv>{demo ? <LocalizedButton type="button" className="card-gallery-add" aria-label="Add virtual card" disabled={cards.length >= 10 || !accounts.length} onClick={() => { setError(''); setAdding(true); }}><Plus size={16} aria-hidden />Add</LocalizedButton> : <LocalizedSpan className="dashboard-card-count">{cards.length} virtual cards</LocalizedSpan>}</LocalizedDiv>
    {cards.length ? <LocalizedDiv className="card-gallery" aria-label="Virtual card gallery">{cards.map((card, index) => <LocalizedButton type="button" className="card-gallery-item" key={card.id} data-variant={index % 3} aria-label={'View ' + cardName(card).toLowerCase() + ' card ending ' + card.maskedNumber.slice(-4)} aria-haspopup="dialog" onClick={() => { setSelected(card.id); setError(''); }}>
      <LocalizedDiv aria-hidden="true"><BankCardFace card={card} cardholderName={cardholderName} tier={tier} /></LocalizedDiv><LocalizedSpan className="card-gallery-caption"><LocalizedStrong>{cardName(card)}</LocalizedStrong><LocalizedSpan>{card.freezeState === 'frozen' ? 'Frozen' : 'Active'} · Tap to expand</LocalizedSpan></LocalizedSpan>
    </LocalizedButton>)}</LocalizedDiv> : <LocalizedP className="dashboard-card-empty">No virtual cards yet. Add a card to get started.</LocalizedP>}
    <LocalizedDiv className="dashboard-card-footer"><LocalizedSpan><LockKeyhole size={13} aria-hidden />{cards.length} masked virtual cards</LocalizedSpan><Link href="/cards" className="dashboard-card-manage">Manage cards<ArrowUpRight size={14} aria-hidden /></Link></LocalizedDiv>
    {selected && <DashboardDialog title={cardName(selected) + ' virtual card'} onClose={() => setSelected(null)}>
      <LocalizedDiv className="expanded-card-stage" data-variant={cards.findIndex(card => card.id === selected.id) % 3}><BankCardFace card={selected} cardholderName={cardholderName} tier={tier} /></LocalizedDiv>
      <LocalizedDiv className="expanded-card-state"><LocalizedSpan className="invest-tag">{selected.freezeState === 'frozen' ? 'Frozen' : 'Active'}</LocalizedSpan><LocalizedSpan>Ending {selected.maskedNumber.slice(-4)} · Virtual CNY card</LocalizedSpan></LocalizedDiv>
      <LocalizedDiv className="expanded-card-actions"><Link href={'/transfers?account=' + selected.accountId} onClick={() => setSelected(null)}><ArrowLeftRight size={19} aria-hidden />Transfer</Link>{demo && <LocalizedButton type="button" onClick={() => { demo.request({ type: 'card', cardId: selected.id, mode: selected.freezeState === 'frozen' ? 'unfreeze' : 'freeze' }); setSelected(null); }}><Snowflake size={19} aria-hidden />{selected.freezeState === 'frozen' ? 'Review unfreeze' : 'Review freeze'}</LocalizedButton>}<Link href="/cards" onClick={() => setSelected(null)}><LockKeyhole size={19} aria-hidden />Manage cards</Link></LocalizedDiv>
      <LocalizedDl className="expanded-card-limits"><LocalizedDiv><LocalizedDt>Daily limit</LocalizedDt><LocalizedDd>{formatMoney(selected.dailyLimit)}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Monthly limit</LocalizedDt><LocalizedDd>{formatMoney(selected.monthlyLimit)}</LocalizedDd></LocalizedDiv></LocalizedDl>
      {demo && <LocalizedForm className="expanded-card-limit-form" onSubmit={event => { event.preventDefault(); try { const value = String(new FormData(event.currentTarget).get('limit')); demo.request({ type: 'card', cardId: selected.id, mode: 'limit', limitMinor: parseMajorAmount(value, 'CNY') }); setSelected(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check limit.'); } }}><LocalizedLabel>New monthly limit (CNY)<LocalizedInput required name="limit" inputMode="decimal" placeholder="5000.00" /></LocalizedLabel><LocalizedButton className="invest-button" type="submit">Review limit change</LocalizedButton></LocalizedForm>}
      {error && <LocalizedP className="invest-notice warning" role="alert">{error}</LocalizedP>}
    </DashboardDialog>}
    {adding && demo && <DashboardDialog title="Add a virtual card" onClose={() => setAdding(false)}><LocalizedP className="invest-muted">Create a simulated card for an existing CNY account. No real payment card is issued.</LocalizedP><LocalizedForm className="expanded-card-add-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); demo.request({ type: 'create-card', sourceId: String(data.get('source')), purpose: String(data.get('purpose')) as 'daily' | 'online-shopping' }); setAdding(false); }}><LocalizedLabel>Linked account<LocalizedSelect name="source">{accounts.map(a => <LocalizedOption value={a.id} key={a.id}>CNY {a.type} · {formatMoney(a.availableBalance)}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel><LocalizedLabel>Card purpose<LocalizedSelect name="purpose"><LocalizedOption value="daily">Daily spending</LocalizedOption><LocalizedOption value="online-shopping">Online shopping</LocalizedOption></LocalizedSelect></LocalizedLabel><LocalizedP className="invest-fineprint">Starting limits: CNY 1,000 daily and CNY 5,000 monthly. Limits can be changed after creation.</LocalizedP><LocalizedButton className="invest-button invest-full" type="submit">Review new card</LocalizedButton></LocalizedForm></DashboardDialog>}
  </LocalizedSection>;
}
