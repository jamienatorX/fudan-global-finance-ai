'use client';

import { LocalizedA, LocalizedDiv, LocalizedMain } from '../../i18n/localized';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { MobileTabs } from './mobile-tabs';
import { MobileNavigation, Sidebar } from './sidebar';
import { Topbar, type ShellAccountOption } from './topbar';

export function AppShellClient({ accounts, userName, alerts, children }: Readonly<{ accounts: readonly ShellAccountOption[]; userName: string; alerts: readonly string[]; children: ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const navigationReturnRef = useRef<HTMLButtonElement|null>(null);

  useEffect(() => {
    // Match Tailwind's default lg breakpoint, including browser font scaling.
    const desktop = window.matchMedia('(min-width: 64rem)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <LocalizedDiv className="min-h-screen bg-[var(--color-background)]">
      <LocalizedDiv data-testid="shell-background" inert={mobileOpen ? true : undefined} aria-hidden={mobileOpen ? true : undefined}>
        <LocalizedA href="#main-content" className="fixed left-4 top-3 z-[60] -translate-y-20 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg focus:translate-y-0 focus:outline-2 focus:outline-blue-600">Skip to content</LocalizedA>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <LocalizedDiv className={`bank-content ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          <Suspense fallback={<LocalizedDiv className="min-h-18 border-b border-[var(--color-border)] bg-white" aria-label="Loading account controls" />}>
            <Topbar accounts={accounts} userName={userName} alerts={alerts} onOpenNavigation={() => {
              if (!window.matchMedia('(min-width: 64rem)').matches) {navigationReturnRef.current=navigationButtonRef.current;setMobileOpen(true);}
            }} navigationButtonRef={navigationButtonRef} />
          </Suspense>
          <LocalizedMain id="main-content" tabIndex={-1} className="mx-auto min-h-[calc(100vh-4.5rem)] w-full max-w-[1600px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-9 xl:px-10">{children}</LocalizedMain>
        </LocalizedDiv>
      </LocalizedDiv>
      <LocalizedDiv inert={mobileOpen?true:undefined} aria-hidden={mobileOpen?true:undefined}><MobileTabs buttonRef={moreButtonRef} onMore={() => {navigationReturnRef.current=moreButtonRef.current;setMobileOpen(true);}} expanded={mobileOpen} /></LocalizedDiv>
      {mobileOpen ? <MobileNavigation onClose={() => setMobileOpen(false)} returnFocusRef={navigationReturnRef} /> : null}
    </LocalizedDiv>
  );
}

