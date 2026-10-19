'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function DashboardDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null;
    const shell = document.querySelector<HTMLElement>('[data-testid="shell-background"]');
    const previousInert = shell?.inert ?? false;
    const overflow = document.body.style.overflow;
    if (shell) shell.inert = true;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    return () => { if (shell) shell.inert = previousInert; document.body.style.overflow = overflow; if (returnFocus?.isConnected) returnFocus.focus(); };
  }, []);
  return createPortal(<div className="dashboard-dialog-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="dashboard-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}><div className="dashboard-dialog-header"><div><p>福 Bank · Simulation</p><h2 id={titleId}>{title}</h2></div><button ref={close} type="button" className="dashboard-dialog-close" aria-label="Close dialog" onClick={onClose}><X size={21} aria-hidden /></button></div>{children}</div>
  </div>, document.body);
}
