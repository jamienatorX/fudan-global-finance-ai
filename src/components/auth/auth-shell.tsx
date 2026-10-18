import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Globe2, GraduationCap, WalletCards } from 'lucide-react';

export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="auth-page">
      <a href="#auth-form" className="auth-skip">Skip to sign-in form</a>
      <div className="auth-layout">
        <section className="auth-story" aria-label="福 bank introduction">
          <Link href="/" className="auth-brand" aria-label="福 bank home">
            <span className="auth-brand-mark"><span className="fu-logo" aria-hidden>福</span></span>
            <span><strong>福 bank</strong><span className="auth-brand-caption">PERSONAL BANKING</span></span>
          </Link>
          <div className="auth-story-content">
            <p className="auth-eyebrow"><span />A WORLD OF POSSIBILITIES</p>
            <h2>Your world,<br /><span>in balance.</span></h2>
            <p className="auth-story-description">From everyday spending to your next semester. Bring your financial life together, wherever home happens to be.</p>
            <div className="auth-currency-map" aria-label="Account currencies">
              <div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" />
              <span className="auth-world"><Globe2 size={58} strokeWidth={0.9} aria-hidden /></span>
              <span className="auth-currency auth-currency-cny"><strong>CNY</strong><span>Chinese yuan</span></span>
              <span className="auth-currency auth-currency-idr"><strong>IDR</strong><span>Indonesian rupiah</span></span>
              <span className="auth-currency auth-currency-usd"><strong>USD</strong><span>US dollar</span></span>
              <span className="auth-currency auth-currency-sgd"><strong>SGD</strong><span>Singapore dollar</span></span>
            </div>
            <div className="auth-story-features">
              <div><WalletCards size={19} aria-hidden /><span>One view.<br /><strong>Multiple currencies.</strong></span></div>
              <div><GraduationCap size={20} aria-hidden /><span>Student life.<br /><strong>A clearer plan.</strong></span></div>
            </div>
          </div>
          <p className="auth-story-footer">Demo</p>
        </section>
        <section className="auth-form-panel" aria-label="Account access">
          <header className="auth-panel-header"><Link href="/" className="auth-back"><ArrowLeft size={16} aria-hidden />Back to overview</Link><span className="auth-environment">PERSONAL BANKING</span></header>
          <div id="auth-form" tabIndex={-1} className="auth-form-content">{children}</div>
          <footer className="auth-panel-footer"><span>福 bank</span><Link href="/" aria-label="Open your banking overview">Your overview<ArrowUpRight size={14} aria-hidden /></Link></footer>
        </section>
      </div>
    </main>
  );
}
