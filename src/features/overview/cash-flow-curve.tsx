'use client';
import { LocalizedButton, LocalizedDiv, LocalizedH2, LocalizedInput, LocalizedLabel, LocalizedP, LocalizedSection, LocalizedSmall, LocalizedSpan, LocalizedStrong, LocalizedText } from '../../i18n/localized';
import { useId, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { cumulativeFlow, stepCurve, type CashFlowDay } from './cash-flow-series';
import { formatMoney, money } from '../../domain/money';

export function CashFlowCurve({ history }: { history: readonly CashFlowDay[] }) {
  const [period, setPeriod] = useState(30);
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId().replaceAll(':', '');
  const days = history.slice(-period);
  const series = cumulativeFlow(days);
  const points = useMemo(() => {
    const values = cumulativeFlow(history.slice(-period)).map(day => day.amountMinor);
    const min = values.reduce((a, b) => a < b ? a : b, 0n);
    const max = values.reduce((a, b) => a > b ? a : b, 0n);
    const range = max - min || 1n;
    return values.map((value, index) => ({ x: 24 + index * 592 / Math.max(1, values.length - 1), y: 188 - Number((value - min) * 14800n / range) / 100 }));
  }, [history, period]);
  if (!series.length) return null;
  const index = Math.min(selected ?? series.length - 1, series.length - 1);
  const active = series[index];
  const path = stepCurve(points);
  const last = points.at(-1)!;
  const net = series.at(-1)!.amountMinor;
  return <LocalizedSection className="cash-curve-panel" aria-label="Recorded cash flow graph">
    <LocalizedDiv className="cash-curve-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">Your money in motion</LocalizedP><LocalizedH2>Cash flow history</LocalizedH2></LocalizedDiv><CalendarDays size={20} aria-hidden /></LocalizedDiv>
    <LocalizedDiv className="cash-curve-summary"><LocalizedDiv><LocalizedSpan>Cumulative net movement · CNY</LocalizedSpan><LocalizedStrong>{formatMoney(money(active.amountMinor, 'CNY'))}</LocalizedStrong><LocalizedSmall>{active.date} · Shanghai</LocalizedSmall></LocalizedDiv><LocalizedDiv className="cash-curve-periods">{[[7, 'Week'], [30, 'Month'], [90, 'Quarter']].map(([value, label]) => <LocalizedButton type="button" key={value} aria-pressed={period === value} onClick={() => { setPeriod(Number(value)); setSelected(null); }}>{label}</LocalizedButton>)}</LocalizedDiv></LocalizedDiv>
    <svg className="cash-curve-svg" viewBox="0 0 640 220" role="img" aria-label={'Cumulative recorded cash flow over ' + days.length + ' days; period total ' + formatMoney(money(net, 'CNY'))} onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); if (rect.width > 0) setSelected(Math.round(Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * 640 - 24) / 592)) * (series.length - 1))); }}>
      <defs><linearGradient id={id + 'line'} x1="0" x2="1"><stop stopColor="#c6d75b" /><stop offset=".45" stopColor="#66c8ad" /><stop offset="1" stopColor="#4c96ee" /></linearGradient><linearGradient id={id + 'area'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#70c3bc" stopOpacity=".2" /><stop offset="1" stopColor="#70c3bc" stopOpacity="0" /></linearGradient></defs>
      {[40, 90, 140, 188].map(y => <line key={y} x1="24" x2="616" y1={y} y2={y} className="cash-curve-grid" />)}
      <path d={path + ` L${last.x},200 L${points[0].x},200 Z`} fill={'url(#' + id + 'area)'} />
      <path d={path} fill="none" stroke={'url(#' + id + 'line)'} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={points[index].x} x2={points[index].x} y1="25" y2="200" className="cash-curve-marker" />
      <circle cx={points[index].x} cy={points[index].y} r="10" fill="#5caec5" stroke="var(--color-surface)" strokeWidth="4" />
      <LocalizedText x="24" y="218" className="cash-curve-date">{series[0].date.slice(5)}</LocalizedText><LocalizedText x="616" y="218" textAnchor="end" className="cash-curve-date">{series.at(-1)!.date.slice(5)}</LocalizedText>
    </svg>
    <LocalizedLabel className="cash-curve-inspect">Inspect a date<LocalizedInput aria-label="Inspect cash flow date" type="range" min="0" max={series.length - 1} value={index} onChange={event => setSelected(Number(event.target.value))} aria-valuetext={active.date + ': ' + formatMoney(money(active.amountMinor, 'CNY'))} /></LocalizedLabel>
    <LocalizedDiv className="cash-curve-note"><ArrowUpRight size={14} aria-hidden /><LocalizedSpan>Recorded cash movements, not investment returns. Internal transfers excluded. Step line shows recorded end-of-day totals; no values are interpolated.</LocalizedSpan></LocalizedDiv>
  </LocalizedSection>;
}
