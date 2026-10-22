import { LocalizedA, LocalizedBr, LocalizedDiv, LocalizedFooter, LocalizedH2, LocalizedHeader, LocalizedMain, LocalizedP, LocalizedSection, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
import type { ReactNode } from 'react';
import { LocalizedLink as Link } from '../../i18n/localized';
import { ArrowLeft, ArrowUpRight, Globe2, GraduationCap, WalletCards } from 'lucide-react';

export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <LocalizedMain className="auth-page">
      <LocalizedA href="#auth-form" className="auth-skip">Skip to sign-in form</LocalizedA>
      <LocalizedDiv className="auth-layout">
        <LocalizedSection className="auth-story" aria-label="福 bank introduction">
          <Link href="/" className="auth-brand" aria-label="福 bank home">
            <LocalizedSpan className="auth-brand-mark"><LocalizedSpan className="fu-logo" aria-hidden /></LocalizedSpan>
            <LocalizedSpan><LocalizedStrong>福 bank</LocalizedStrong><LocalizedSpan className="auth-brand-caption">PERSONAL BANKING</LocalizedSpan></LocalizedSpan>
          </Link>
          <LocalizedDiv className="auth-story-content">
            <LocalizedP className="auth-eyebrow"><LocalizedSpan />A WORLD OF POSSIBILITIES</LocalizedP>
            <LocalizedH2>Your world,<LocalizedBr /><LocalizedSpan>in balance.</LocalizedSpan></LocalizedH2>
            <LocalizedP className="auth-story-description">From everyday spending to your next semester. Bring your financial life together, wherever home happens to be.</LocalizedP>
            <LocalizedDiv className="auth-currency-map" aria-label="Account currencies">
              <LocalizedDiv className="auth-orbit auth-orbit-one" /><LocalizedDiv className="auth-orbit auth-orbit-two" />
              <LocalizedSpan className="auth-world"><Globe2 size={58} strokeWidth={0.9} aria-hidden /></LocalizedSpan>
              <LocalizedSpan className="auth-currency auth-currency-cny"><LocalizedStrong>CNY</LocalizedStrong><LocalizedSpan>Chinese yuan</LocalizedSpan></LocalizedSpan>
              <LocalizedSpan className="auth-currency auth-currency-idr"><LocalizedStrong>IDR</LocalizedStrong><LocalizedSpan>Indonesian rupiah</LocalizedSpan></LocalizedSpan>
              <LocalizedSpan className="auth-currency auth-currency-usd"><LocalizedStrong>USD</LocalizedStrong><LocalizedSpan>US dollar</LocalizedSpan></LocalizedSpan>
              <LocalizedSpan className="auth-currency auth-currency-sgd"><LocalizedStrong>SGD</LocalizedStrong><LocalizedSpan>Singapore dollar</LocalizedSpan></LocalizedSpan>
            </LocalizedDiv>
            <LocalizedDiv className="auth-story-features">
              <LocalizedDiv><WalletCards size={19} aria-hidden /><LocalizedSpan>One view.<LocalizedBr /><LocalizedStrong>Multiple currencies.</LocalizedStrong></LocalizedSpan></LocalizedDiv>
              <LocalizedDiv><GraduationCap size={20} aria-hidden /><LocalizedSpan>Student life.<LocalizedBr /><LocalizedStrong>A clearer plan.</LocalizedStrong></LocalizedSpan></LocalizedDiv>
            </LocalizedDiv>
          </LocalizedDiv>
          <LocalizedP className="auth-story-footer">Your future. Your agent.</LocalizedP>
        </LocalizedSection>
        <LocalizedSection className="auth-form-panel" aria-label="Account access">
          <LocalizedHeader className="auth-panel-header"><Link href="/" className="auth-back"><ArrowLeft size={16} aria-hidden />Back to overview</Link><LocalizedSpan className="auth-environment">PERSONAL BANKING</LocalizedSpan></LocalizedHeader>
          <LocalizedDiv id="auth-form" tabIndex={-1} className="auth-form-content">{children}</LocalizedDiv>
          <LocalizedFooter className="auth-panel-footer"><LocalizedSpan>福 bank</LocalizedSpan><Link href="/" aria-label="Open your banking overview">Your overview<ArrowUpRight size={14} aria-hidden /></Link></LocalizedFooter>
        </LocalizedSection>
      </LocalizedDiv>
    </LocalizedMain>
  );
}
