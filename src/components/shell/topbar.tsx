'use client';

import { LocalizedButton, LocalizedDiv, LocalizedHeader, LocalizedLi, LocalizedP, LocalizedSpan, LocalizedUl } from '../../i18n/localized';
import { LanguageSwitcher } from '../../i18n/language-provider';
import { Bell, Menu } from 'lucide-react';
import { AccountLink } from './account-link';
import { GlobalSearch } from '../../features/search/global-search';
import { useState, type RefObject } from 'react';
import { CurrencyTicker } from './currency-ticker';
import { useInvestingPreferences } from '../../features/investing/investing-preferences';
import { useShanghaiDate } from '../../features/cards/use-shanghai-date';
import { reminderStatus } from '../../features/cards/reminder-model';

export type ShellAccountOption = Readonly<{ id: string; label: string }>;

export function Topbar({ accounts, userName, alerts, onOpenNavigation, navigationButtonRef }: Readonly<{ accounts: readonly ShellAccountOption[]; userName: string; alerts: readonly string[]; onOpenNavigation: () => void; navigationButtonRef: RefObject<HTMLButtonElement | null> }>) {
  const [showNotifications, setShowNotifications] = useState(false);
  const preferences = useInvestingPreferences()?.preferences;
  const today = useShanghaiDate();
  const reminderAlerts = today ? (preferences?.reminders ?? []).filter(b => !b.paid && reminderStatus(b, today) !== 'Upcoming').map(b => `${b.name} ending ${b.lastFour}: CNY ${Number(b.amount).toFixed(2)} due ${b.dueDate} (${reminderStatus(b, today).toLowerCase()}).`) : [];
  const allAlerts = [...alerts, ...reminderAlerts];
  const initials = userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <LocalizedHeader className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-xl">
      <LocalizedDiv className="bank-header">
        <LocalizedButton ref={navigationButtonRef} type="button" onClick={onOpenNavigation} aria-label="Open navigation" className="bank-header-menu grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"><Menu size={20} aria-hidden /></LocalizedButton>
        <LocalizedDiv className="bank-header-search"><GlobalSearch accounts={accounts} /></LocalizedDiv>
        <CurrencyTicker />
        <LocalizedDiv className="bank-header-actions flex items-center justify-end gap-2">
          <LanguageSwitcher />
          <LocalizedDiv className="relative">
            <LocalizedButton type="button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((open) => !open)} className="relative grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Bell size={19} aria-hidden />{allAlerts.length ? <LocalizedSpan className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" /> : null}</LocalizedButton>
            {showNotifications ? <LocalizedDiv role="status" className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-elevated)]"><LocalizedP className="text-sm font-semibold text-slate-900">{allAlerts.length} financial {allAlerts.length === 1 ? 'alert' : 'alerts'}</LocalizedP>{allAlerts.length ? <LocalizedUl className="mt-1 space-y-2 text-xs leading-5 text-slate-600">{allAlerts.map((alert, index) => <LocalizedLi key={`${index}:${alert}`}>{alert}</LocalizedLi>)}</LocalizedUl> : <LocalizedP className="mt-1 text-xs text-slate-600">No financial alerts</LocalizedP>}</LocalizedDiv> : null}
          </LocalizedDiv>
          <AccountLink href="/banking" aria-label="My account" className="grid size-11 place-items-center rounded-xl bg-[var(--color-navy)] text-xs font-bold text-white hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" title={userName}>{initials}</AccountLink>
        </LocalizedDiv>
      </LocalizedDiv>
    </LocalizedHeader>
  );
}

