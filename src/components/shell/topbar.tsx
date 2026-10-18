'use client';

import { Bell, Menu } from 'lucide-react';
import { GlobalSearch } from '../../features/search/global-search';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type RefObject } from 'react';
import { SimulationBadge } from '../ui/simulation-badge';

export type ShellAccountOption = Readonly<{ id: string; label: string }>;

export function Topbar({ accounts, userName, alerts, onOpenNavigation, navigationButtonRef }: Readonly<{ accounts: readonly ShellAccountOption[]; userName: string; alerts: readonly string[]; onOpenNavigation: () => void; navigationButtonRef: RefObject<HTMLButtonElement | null> }>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountFromUrl = searchParams.get('account');
  const selectedAccount = accounts.some((account) => account.id === accountFromUrl) ? accountFromUrl! : accounts[0]?.id ?? '';
  const [showNotifications, setShowNotifications] = useState(false);
  const initials = userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-18 flex-wrap items-center gap-x-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <button ref={navigationButtonRef} type="button" onClick={onOpenNavigation} aria-label="Open navigation" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"><Menu size={20} aria-hidden /></button>
        <div className="order-last w-full sm:order-none sm:min-w-0 sm:flex-1"><GlobalSearch accounts={accounts} /></div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="sr-only" htmlFor="active-account">Active account</label>
          <select id="active-account" aria-label="Active account" value={selectedAccount} onChange={(event) => {
            const accountId = event.target.value;
            const next = new URLSearchParams(searchParams.toString());
            next.set('account', accountId);
            router.push(`${pathname}?${next.toString()}`);
          }} className="max-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-52 sm:text-sm">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
          </select>
          <div className="relative">
            <button type="button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((open) => !open)} className="relative grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Bell size={19} aria-hidden />{alerts.length ? <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" /> : null}</button>
            {showNotifications ? <div role="status" className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-elevated)]"><p className="text-sm font-semibold text-slate-900">{alerts.length} financial {alerts.length === 1 ? 'alert' : 'alerts'}</p>{alerts.length ? <ul className="mt-1 space-y-2 text-xs leading-5 text-slate-600">{alerts.map((alert, index) => <li key={`${index}:${alert}`}>{alert}</li>)}</ul> : <p className="mt-1 text-xs text-slate-600">No financial alerts</p>}</div> : null}
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--color-navy)] text-xs font-bold text-white" title={userName}>{initials}</div>
        </div>
        <div className="mt-2 w-full sm:mt-0 sm:w-auto"><SimulationBadge /></div>
      </div>
    </header>
  );
}
