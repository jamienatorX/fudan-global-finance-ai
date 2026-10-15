import type { ComponentProps, ReactNode } from 'react';

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] ${className}`} {...props} />;
}

export function CardHeader({ title, eyebrow, action }: Readonly<{ title: string; eyebrow?: string; action?: ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</p> : null}
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
