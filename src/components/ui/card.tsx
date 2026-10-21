import { LocalizedDiv, LocalizedH2, LocalizedP, LocalizedSection } from '../../i18n/localized';
import type { ComponentProps, ReactNode } from 'react';

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <LocalizedSection className={`finance-card min-w-0 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] ${className}`} {...props} />;
}

export function CardHeader({ title, eyebrow, action }: Readonly<{ title: string; eyebrow?: string; action?: ReactNode }>) {
  return (
    <LocalizedDiv className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <LocalizedDiv>
        {eyebrow ? <LocalizedP className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-primary)]">{eyebrow}</LocalizedP> : null}
        <LocalizedH2 className="text-base font-semibold tracking-[-0.025em] text-[var(--color-text)]">{title}</LocalizedH2>
      </LocalizedDiv>
      {action ? <LocalizedDiv className="finance-card-action shrink-0">{action}</LocalizedDiv> : null}
    </LocalizedDiv>
  );
}

