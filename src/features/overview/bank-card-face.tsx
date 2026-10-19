import { Wifi } from 'lucide-react';
import type { Card } from '../../domain/entities';
import type { MembershipTier } from './membership';

export function BankCardFace({ card, cardholderName, tier }: { card: Card; cardholderName: string; tier: MembershipTier }) {
  return (
      <div className="bank-card-face" data-tier={tier.key} data-frozen={card.freezeState === 'frozen'}>
        <div className="bank-card-top"><strong><span className="fu-logo" aria-hidden>福</span>福 Bank</strong><span>{tier.name}</span></div>
        <div className="bank-card-chip-row"><svg className="bank-card-chip" viewBox="0 0 46 34" width="40" height="30" aria-hidden="true"><rect x="1" y="1" width="44" height="32" rx="7" fill="#ddc48b" stroke="#a58b52" /><path d="M15 1v10H1m44 0H31V1M1 23h14v10m30-10H31v10M15 11h16v12H15zM1 17h14m16 0h14" fill="none" stroke="#9b8148" strokeWidth="1.2" /></svg><Wifi size={23} className="bank-card-contactless" aria-hidden /></div>
        <p className="bank-card-number">{card.maskedNumber}</p>
        <div className="bank-card-bottom"><div><span>Cardholder</span><strong>{cardholderName}</strong></div><div><span>Card type</span><strong>Virtual · CNY</strong></div><span className="bank-card-monogram" aria-hidden>FU</span></div>
      </div>
  );
}
