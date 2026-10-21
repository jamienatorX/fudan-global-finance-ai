'use client';

import { LocalizedAside, LocalizedButton, LocalizedDiv, LocalizedNav, LocalizedP, LocalizedSpan } from '../../i18n/localized';
import { AccountLink as Link } from './account-link';
import { SimulationBadge } from '../ui/simulation-badge';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ComponentType, type KeyboardEvent, type RefObject } from 'react';
import {
  ArrowLeftRight, Bell, ChartNoAxesCombined, ChevronLeft,
  CreditCard, GraduationCap, LayoutDashboard, ReceiptText, Repeat2, SendHorizontal,
  Settings2, WalletCards, X,
} from 'lucide-react';

type Icon = ComponentType<Readonly<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>>;

export const NAV_ITEMS: readonly Readonly<{ href: string; label: string; shortLabel: string; icon: Icon }>[] = [
  { href: '/overview', label: 'Overview Dashboard', shortLabel: 'Overview', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts & Balances', shortLabel: 'Accounts', icon: WalletCards },
  { href: '/transfers', label: 'Smart Transfers', shortLabel: 'Transfers', icon: SendHorizontal },
  { href: '/transactions', label: 'Transactions & Bill Analysis', shortLabel: 'Transactions', icon: ReceiptText },
  { href: '/wealth', label: 'Wealth Management', shortLabel: 'Wealth', icon: ChartNoAxesCombined },
  { href: '/investing', label: 'Investing', shortLabel: 'Investing', icon: ChartNoAxesCombined },
  { href: '/cards', label: 'Card Management', shortLabel: 'Cards', icon: CreditCard },
  { href: '/subscriptions', label: 'Subscription Management', shortLabel: 'Subscriptions', icon: Repeat2 },
  { href: '/fx', label: 'Currency Exchange & Cross-Border', shortLabel: 'FX & Cross-border', icon: ArrowLeftRight },
  { href: '/planner', label: 'Budget & Tuition Planner', shortLabel: 'Planner', icon: GraduationCap },
  { href: '/audit', label: 'Notifications & Audit Trail', shortLabel: 'Audit trail', icon: Bell },
  { href: '/settings', label: 'Settings & Security', shortLabel: 'Settings', icon: Settings2 },
] as const;

function ProductMark({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <Link href="/overview" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400">
      <LocalizedSpan className="grid size-10 shrink-0 place-items-center text-emerald-200"><LocalizedSpan className="fu-logo" aria-hidden /></LocalizedSpan>
      {!compact ? <LocalizedSpan className="min-w-0"><LocalizedSpan className="block truncate text-xl font-extrabold tracking-tight text-white">福 Bank</LocalizedSpan><LocalizedSpan className="block whitespace-normal text-[9px] font-semibold uppercase tracking-[0.08em] text-teal-200/80">PERSONAL BANKING</LocalizedSpan></LocalizedSpan> : null}
    </Link>
  );
}

function Navigation({ compact = false, onNavigate }: Readonly<{ compact?: boolean; onNavigate?: () => void }>) {
  const pathname = usePathname();
  return (
    <LocalizedNav aria-label={onNavigate ? 'Mobile product navigation' : 'Primary navigation'} className="space-y-1">
      {NAV_ITEMS.map(({ href, label, shortLabel, icon: Icon }, index) => (
        <LocalizedDiv key={href}>
          {!compact && [0, 4, 10].includes(index) ? <LocalizedP className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 ${index ? "mt-7" : "mt-2"}`}>{index === 0 ? "Everyday banking" : index === 4 ? "Plan & manage" : "Your workspace"}</LocalizedP> : null}
        <Link
          key={href}
          href={href}
          title={compact ? label : undefined}
          onClick={onNavigate}
          aria-current={pathname === href ? 'page' : undefined}
          className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${pathname === href ? 'bg-[var(--color-nav-active)] text-[var(--color-nav-active-text)] shadow-sm' : 'text-slate-300 hover:bg-white/8 hover:text-white'} ${compact ? 'justify-center' : ''}`}
        >
          <Icon size={19} strokeWidth={1.8} aria-hidden />
          {!compact ? <LocalizedSpan>{onNavigate ? label : shortLabel}</LocalizedSpan> : <LocalizedSpan className="sr-only">{label}</LocalizedSpan>}
        </Link>
        </LocalizedDiv>
      ))}
    </LocalizedNav>
  );
}

export function Sidebar({ collapsed, onToggle }: Readonly<{ collapsed: boolean; onToggle: () => void }>) {
  return (
    <LocalizedAside className={`bank-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col bg-[var(--color-navy)] px-3 py-6 transition-[width] duration-200 lg:flex ${collapsed ? 'w-20' : 'w-64'}`}>
      <LocalizedDiv className={`mb-7 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-2'}`}>
        <ProductMark compact={collapsed} />
        {!collapsed ? <LocalizedButton type="button" onClick={onToggle} aria-label="Collapse sidebar" aria-expanded="true" className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-300"><ChevronLeft size={18} aria-hidden /></LocalizedButton> : null}
      </LocalizedDiv>
      {collapsed ? <LocalizedButton type="button" onClick={onToggle} aria-label="Expand sidebar" aria-expanded="false" className="mb-3 grid min-h-11 place-items-center rounded-xl text-slate-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-300"><ChevronLeft className="rotate-180" size={18} aria-hidden /></LocalizedButton> : null}
      <LocalizedDiv className="min-h-0 flex-1 overflow-y-auto"><Navigation compact={collapsed} /></LocalizedDiv>
      {!collapsed ? <LocalizedDiv className="mt-4 rounded-2xl border border-white/10 bg-white/6 p-4"><LocalizedP className="text-xs font-semibold text-blue-200">A workspace for your world</LocalizedP><LocalizedP className="mt-1 text-xs leading-5 text-slate-300">Your world, in balance.</LocalizedP></LocalizedDiv> : null}
    </LocalizedAside>
  );
}

export function MobileNavigation({ onClose, returnFocusRef }: Readonly<{ onClose: () => void; returnFocusRef: RefObject<HTMLButtonElement | null> }>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnFocusElement = returnFocusRef.current;
    closeRef.current?.focus();
    return () => returnFocusElement?.focus();
  }, [returnFocusRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])') ?? [])];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <LocalizedDiv ref={dialogRef} className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation" onKeyDown={handleKeyDown}>
      <LocalizedButton type="button" tabIndex={-1} aria-label="Close navigation overlay" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />
      <LocalizedAside className="relative flex h-full w-[min(86vw,20rem)] flex-col bg-[var(--color-navy)] p-5 shadow-2xl">
        <LocalizedDiv className="mb-7 flex items-center justify-between"><LocalizedButton ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation" className="order-2 grid size-11 place-items-center rounded-xl text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-300"><X size={20} aria-hidden /></LocalizedButton><LocalizedDiv className="order-1"><ProductMark /></LocalizedDiv></LocalizedDiv>
        <LocalizedDiv className="mb-4"><SimulationBadge /></LocalizedDiv>
        <LocalizedDiv className="min-h-0 flex-1 overflow-y-auto"><Navigation onNavigate={onClose} /></LocalizedDiv>
      </LocalizedAside>
    </LocalizedDiv>
  );
}

