import type { FinancialSnapshot } from '../../domain/entities';
import { referenceConversion } from '../demo/planning-helpers';

export type CashFlowDay = Readonly<{ date: string; netMinor: bigint; inflowMinor: bigint; outflowMinor: bigint }>;
const dayMs = 86_400_000;
const localDate = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

export function buildCashFlowSeries(snapshot: FinancialSnapshot, days = 90): CashFlowDay[] {
  const owner = snapshot.users[0]?.id;
  const transactions = snapshot.transactions.filter(t => t.ownerId === owner);
  const end = Math.max(Date.parse(snapshot.asOf), ...transactions.map(t => Date.parse(t.occurredAt)));
  const date = localDate(new Date(end).toISOString());
  const last = Date.parse(date + 'T00:00:00Z');
  const length = Math.min(90, Math.max(1, Math.floor(days)));
  const byDate = new Map<string, { inflowMinor: bigint; outflowMinor: bigint }>();
  for (const t of transactions) {
    if (t.classification === 'internal-transfer') continue;
    const key = localDate(t.occurredAt);
    const value = referenceConversion(t.amount, 'CNY', snapshot.exchangeRates).amount.amountMinor;
    const row = byDate.get(key) ?? { inflowMinor: 0n, outflowMinor: 0n };
    if (t.direction === 'credit') row.inflowMinor += value; else row.outflowMinor += value;
    byDate.set(key, row);
  }
  return Array.from({ length }, (_, index) => {
    const date = new Date(last - (length - 1 - index) * dayMs).toISOString().slice(0, 10);
    const row = byDate.get(date) ?? { inflowMinor: 0n, outflowMinor: 0n };
    return { date, ...row, netMinor: row.inflowMinor - row.outflowMinor };
  });
}
export function cumulativeFlow(days: readonly CashFlowDay[]) {
  let total = 0n;
  return days.map(day => { total += day.netMinor; return { date: day.date, amountMinor: total }; });
}
export function stepCurve(points: readonly { x: number; y: number }[]) {
  if (!points.length) return '';
  return `M${points[0].x},${points[0].y}` + points.slice(1).map(point => ` H${point.x} V${point.y}`).join('');
}
