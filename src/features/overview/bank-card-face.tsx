import { LocalizedDiv, LocalizedP, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
import { Wifi } from 'lucide-react';
import type { Card } from '../../domain/entities';
import type { MembershipTier } from './membership';

export function BankCardFace({ card, cardholderName, tier }: { card: Card; cardholderName: string; tier: MembershipTier }) {
  return (
      <LocalizedDiv className="bank-card-face" data-tier={tier.key} data-frozen={card.freezeState === 'frozen'}>
        <LocalizedDiv className="bank-card-top"><LocalizedStrong><LocalizedSpan className="fu-logo" aria-hidden>福</LocalizedSpan>福 Bank</LocalizedStrong><LocalizedSpan>{tier.name}</LocalizedSpan></LocalizedDiv>
        <LocalizedDiv className="bank-card-chip-row"><svg className="bank-card-chip" viewBox="0 0 46 34" width="40" height="30" aria-hidden="true"><rect x="1" y="1" width="44" height="32" rx="7" fill="#ddc48b" stroke="#a58b52" /><path d="M15 1v10H1m44 0H31V1M1 23h14v10m30-10H31v10M15 11h16v12H15zM1 17h14m16 0h14" fill="none" stroke="#9b8148" strokeWidth="1.2" /></svg><Wifi size={23} className="bank-card-contactless" aria-hidden /></LocalizedDiv>
        <LocalizedP className="bank-card-number">{card.maskedNumber}</LocalizedP>
        <LocalizedDiv className="bank-card-bottom"><LocalizedDiv><LocalizedSpan>Cardholder</LocalizedSpan><LocalizedStrong>{cardholderName}</LocalizedStrong></LocalizedDiv><LocalizedDiv><LocalizedSpan>Card type</LocalizedSpan><LocalizedStrong>Virtual · CNY</LocalizedStrong></LocalizedDiv><LocalizedSpan className="bank-card-monogram" aria-hidden>FU</LocalizedSpan></LocalizedDiv>
      </LocalizedDiv>
  );
}
