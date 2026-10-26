import {FufuMascot} from '../../features/copilot/fufu-mascot';
import { LocalizedA, LocalizedBr, LocalizedDiv, LocalizedFooter, LocalizedH2, LocalizedHeader, LocalizedMain, LocalizedP, LocalizedSection, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
import type { ReactNode } from 'react';
import { LocalizedLink as Link } from '../../i18n/localized';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

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
            <LocalizedP className="auth-eyebrow"><LocalizedSpan />YOUR FUTURE. YOUR AGENT.</LocalizedP>
            <LocalizedH2>Welcome to <LocalizedBr /><LocalizedSpan>福 Bank.</LocalizedSpan></LocalizedH2>
            <LocalizedP className="auth-story-description">Meet Fufu, your personal banking companion. A clearer view of your money, and a little help with what comes next.</LocalizedP>
            <LocalizedDiv className="auth-fufu-art"><FufuMascot/></LocalizedDiv>

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
