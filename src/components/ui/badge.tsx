import { LocalizedSpan } from '../../i18n/localized';
import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'info' | 'positive' | 'warning' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

export function Badge({ children, tone = 'neutral' }: Readonly<{ children: ReactNode; tone?: BadgeTone }>) {
  return <LocalizedSpan className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</LocalizedSpan>;
}
