import type { CurrencyCode } from '../../domain/currency';
import type { FinancialSnapshot } from '../../domain/entities';
import { money, type Money } from '../../domain/money';
import { referenceConversion } from '../demo/planning-helpers';
import type { OverviewModel } from '../overview/overview-queries';

export type ParentSummary = Readonly<{
  version: 1; month: string; asOf: string; currency: CurrencyCode;
  spendingMinor: string; categories: readonly Readonly<{ category: string; amountMinor: string }>[];
  availableCashMinor: string; postTuitionCashMinor: string;
  cashRunwayMonths: number | null; netBurnRunwayMonths: number | null;
  tuition: Readonly<{ dueDate: string; outstandingMinor: string }> | null;
}>;
const monthPattern = /^(?:20\d{2})-(?:0[1-9]|1[0-2])$/;
export function reportMonthAt(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid report date');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).format(date);
}
export function buildParentSummary(snapshot: FinancialSnapshot, overview: OverviewModel, month: string, currency: CurrencyCode = 'IDR'): ParentSummary {
  if (!monthPattern.test(month)) throw new Error('Invalid reporting month');
  const convert = (value: Money) => referenceConversion(value, currency, snapshot.exchangeRates).amount.amountMinor;
  const totals = new Map<string, bigint>();
  for (const row of snapshot.transactions) {
    if (row.ownerId !== snapshot.users[0]?.id || row.direction !== 'debit' || row.classification !== 'consumption' || reportMonthAt(row.occurredAt) !== month) continue;
    totals.set(row.category, (totals.get(row.category) ?? 0n) + convert(row.amount));
  }
  const categories = [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([category, amount]) => ({ category, amountMinor: amount.toString() }));
  const next = overview.tuition.next;
  return { version: 1, month, asOf: snapshot.asOf, currency,
    spendingMinor: [...totals.values()].reduce((a,b) => a+b, 0n).toString(), categories,
    availableCashMinor: convert(overview.availableCash).toString(), postTuitionCashMinor: convert(overview.postTuitionCash).toString(),
    cashRunwayMonths: overview.monthlyExpenses.amountMinor>0n ? overview.cashRunwayMonths : null, netBurnRunwayMonths: overview.netBurnRunwayMonths,
    tuition: next ? { dueDate: next.dueAt.slice(0,10), outstandingMinor: convert(overview.tuition.outstanding).toString() } : null };
}
const keys = (v: Record<string, unknown>, expected: string[]) => Object.keys(v).sort().join(',') === expected.sort().join(',');
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const minor = (v: unknown): v is string => typeof v === 'string' && /^(?:0|[1-9]\d{0,23})$/.test(v);
const dateOnly = (v: unknown): v is string => typeof v === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
const months = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e9;
function validate(value: unknown): asserts value is ParentSummary {
  if (!record(value) || !keys(value,['version','month','asOf','currency','spendingMinor','categories','availableCashMinor','postTuitionCashMinor','cashRunwayMonths','netBurnRunwayMonths','tuition']) || value.version !== 1 || typeof value.month !== 'string' || !monthPattern.test(value.month) || typeof value.asOf !== 'string' || !/^20\d{2}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/.test(value.asOf) || !dateOnly(value.asOf.slice(0,10)) || !Number.isFinite(Date.parse(value.asOf)) || !['CNY','IDR','USD','SGD'].includes(String(value.currency)) || !minor(value.spendingMinor) || !minor(value.availableCashMinor) || !minor(value.postTuitionCashMinor) || !(value.cashRunwayMonths===null || months(value.cashRunwayMonths)) || !(value.netBurnRunwayMonths === null || months(value.netBurnRunwayMonths)) || !Array.isArray(value.categories) || value.categories.length > 32) throw new Error('Invalid shared report');
  const seen = new Set<string>(); let total = 0n;
  for (const row of value.categories) {
    if (!record(row) || !keys(row,['category','amountMinor']) || typeof row.category !== 'string' || !['rent','food','transportation','shopping','subscriptions','other'].includes(row.category) || seen.has(row.category) || !minor(row.amountMinor)) throw new Error('Invalid shared categories');
    seen.add(row.category); total += BigInt(row.amountMinor);
  }
  if (total !== BigInt(value.spendingMinor)) throw new Error('Invalid shared total');
  if (value.tuition !== null && (!record(value.tuition) || !keys(value.tuition,['dueDate','outstandingMinor']) || !dateOnly(value.tuition.dueDate) || !minor(value.tuition.outstandingMinor))) throw new Error('Invalid shared tuition');
}
export function encodeParentSummary(report: ParentSummary): string {
  validate(report);
  const bytes = new TextEncoder().encode(JSON.stringify(report));
  if (bytes.length > 16384) throw new Error('Report is too large');
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeParentSummary(fragment: string): ParentSummary {
  const encoded = fragment.replace(/^#report=/,'');
  if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length > 21846) throw new Error('Invalid report link');
  const binary = atob(encoded.replaceAll('-','+').replaceAll('_','/'));
  if (binary.length > 16384) throw new Error('Report is too large');
  const parsed: unknown = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
  validate(parsed); return parsed;
}
export function formatSummaryMoney(amountMinor: string, currency: CurrencyCode): Money { return money(amountMinor,currency); }
