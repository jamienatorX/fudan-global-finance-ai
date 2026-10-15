'use client';

import { Bell, Menu, Search, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type RefObject } from 'react';
import { Badge } from '../ui/badge';

export type ShellAccountOption = Readonly<{ id: string; label: string }>;

export function Topbar({ accounts, userName, onOpenNavigation, navigationButtonRef }: Readonly<{ accounts: readonly ShellAccountOption[]; userName: string; onOpenNavigation: () => void; navigationButtonRef: RefObject<HTMLButtonElement | null> }>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountFromUrl = searchParams.get('account');
  const [pendingAccount, setPendingAccount] = useState(accounts[0]?.id ?? '');
  const selectedAccount = accounts.some((account) => account.id === accountFromUrl) ? accountFromUrl! : pendingAccount;
  const [showNotifications, setShowNotifications] = useState(false);
  const initials = userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-18 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button ref={navigationButtonRef} type="button" onClick={onOpenNavigation} aria-label="Open navigation" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"><Menu size={20} aria-hidden /></button>
        <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          <Search size={18} className="text-slate-400" aria-hidden />
          <span className="text-sm text-slate-500">Search coming in Phase 2</span>
          <Badge tone="neutral">Coming next</Badge>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="sr-only" htmlFor="active-account">Active account</label>
          <select id="active-account" aria-label="Active account" value={selectedAccount} onChange={(event) => {
            const accountId = event.target.value;
            setPendingAccount(accountId);
            const next = new URLSearchParams(searchParams.toString());
            next.set('account', accountId);
            router.push(`${pathname}?${next.toString()}`);
          }} className="max-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-52 sm:text-sm">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
          </select>
          <div className="hidden sm:block"><Badge tone="warning"><ShieldCheck size={13} className="mr-1" aria-hidden />Simulated data</Badge></div>
          <div className="relative">
            <button type="button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((open) => !open)} className="relative grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Bell size={19} aria-hidden /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" /></button>
            {showNotifications ? <div role="status" className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-elevated)]"><p className="text-sm font-semibold text-slate-900">1 financial alert</p><p className="mt-1 text-xs leading-5 text-slate-600">Your tuition installment is due on November 1. No payment has been made.</p></div> : null}
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--color-navy)] text-xs font-bold text-white" title={userName}>{initials}</div>
        </div>
      </div>
    </header>
  );
}
