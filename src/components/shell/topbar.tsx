'use client';

import { Bell, Menu, Moon, Sun, Monitor } from 'lucide-react';
import { GlobalSearch } from '../../features/search/global-search';
import { useEffect, useState, type RefObject } from 'react';
import { CurrencyTicker } from './currency-ticker';

export type ShellAccountOption = Readonly<{ id: string; label: string }>;

export function Topbar({ accounts, userName, alerts, onOpenNavigation, navigationButtonRef }: Readonly<{ accounts: readonly ShellAccountOption[]; userName: string; alerts: readonly string[]; onOpenNavigation: () => void; navigationButtonRef: RefObject<HTMLButtonElement | null> }>) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  useEffect(() => {
    const saved = localStorage.getItem('fu-bank-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') setTheme(saved);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme; };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  const initials = userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-xl">
      <div className="bank-header">
        <button ref={navigationButtonRef} type="button" onClick={onOpenNavigation} aria-label="Open navigation" className="bank-header-menu grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"><Menu size={20} aria-hidden /></button>
        <div className="bank-header-search"><GlobalSearch accounts={accounts} /></div>
        <CurrencyTicker />
        <div className="bank-header-actions flex items-center justify-end gap-2">
          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1" role="group" aria-label="Appearance">
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
              return <button key={mode} type="button" title={mode === 'system' ? 'System appearance' : mode === 'light' ? 'Light mode' : 'Dark mode'} aria-label={mode + ' mode'} aria-pressed={theme === mode} onClick={() => { setTheme(mode); localStorage.setItem('fu-bank-theme', mode); }} className={`grid size-9 place-items-center rounded-lg transition-colors ${theme === mode ? 'bg-[var(--color-info-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-info-soft)]'}`}><Icon size={17} aria-hidden /></button>;
            })}
          </div>
          <div className="relative">
            <button type="button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((open) => !open)} className="relative grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Bell size={19} aria-hidden />{alerts.length ? <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" /> : null}</button>
            {showNotifications ? <div role="status" className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-elevated)]"><p className="text-sm font-semibold text-slate-900">{alerts.length} financial {alerts.length === 1 ? 'alert' : 'alerts'}</p>{alerts.length ? <ul className="mt-1 space-y-2 text-xs leading-5 text-slate-600">{alerts.map((alert, index) => <li key={`${index}:${alert}`}>{alert}</li>)}</ul> : <p className="mt-1 text-xs text-slate-600">No financial alerts</p>}</div> : null}
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-[var(--color-navy)] text-xs font-bold text-white" title={userName}>{initials}</div>
        </div>
      </div>
    </header>
  );
}

