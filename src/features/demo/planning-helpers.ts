import type { CurrencyCode } from '../../domain/currency';
import { CURRENCY_MINOR_DIGITS } from '../../domain/currency';
import type { ExchangeRate, FinancialSnapshot } from '../../domain/entities';
import { money, type Money } from '../../domain/money';

export function parseMajorAmount(text: string, currency: CurrencyCode): string {
  const digits = CURRENCY_MINOR_DIGITS[currency];
  if (!/^\d+(?:\.\d+)?$/.test(text.trim())) throw new Error('Enter a positive decimal amount');
  const [whole, fraction = ''] = text.trim().split('.');
  if (fraction.length > digits) throw new Error('Too many decimals for ' + currency);
  const amount = BigInt(whole) * 10n ** BigInt(digits) + BigInt(fraction.padEnd(digits, '0') || '0');
  if (amount <= 0n) throw new Error('Amount must be positive');
  return amount.toString();
}
export function referenceConversion(value: Money, target: CurrencyCode, rates: readonly ExchangeRate[]) {
  if (value.currency === target) return { amount: value, source: 'identity', referenceAt: '' };
  const direct = rates.find(r => r.base === value.currency && r.quote === target);
  const inverse = rates.find(r => r.quote === value.currency && r.base === target);
  const r = direct ?? inverse;
  if (!r || !/^\d+(?:\.\d+)?$/.test(r.rate)) throw new Error('RATE_UNAVAILABLE: no supported reference rate');
  const [whole, fraction = ''] = r.rate.split('.');
  const n = BigInt(whole + fraction), scale = 10n ** BigInt(fraction.length);
  if (n === 0n) throw new Error('Invalid zero FX rate');
  const sourceScale = 10n ** BigInt(CURRENCY_MINOR_DIGITS[value.currency]);
  const targetScale = 10n ** BigInt(CURRENCY_MINOR_DIGITS[target]);
  const numerator = direct ? value.amountMinor * n * targetScale : value.amountMinor * scale * targetScale;
  const denominator = direct ? sourceScale * scale : sourceScale * n;
  return { amount: money((numerator + denominator / 2n) / denominator, target), source: r.source + ': ' + r.provider, referenceAt: r.referenceAt };
}
export function projectedRunway(snapshot: FinancialSnapshot) {
  const toCny = (m: Money) => referenceConversion(m, 'CNY', snapshot.exchangeRates).amount.amountMinor;
  const available = snapshot.accounts.filter(a => a.status === 'active').reduce((s,a)=>s+toCny(a.availableBalance),0n);
  const monthly = snapshot.budgets.filter(b=>b.month===snapshot.asOf.slice(0,7)).reduce((s,b)=>s+toCny(b.limit),0n);
  const due = snapshot.tuitionObligations.filter(t=>t.status!=='paid').reduce((s,t)=>s+toCny(t.amount)-toCny(t.paidAmount),0n);
  return { available: money(available,'CNY'), monthly: money(monthly,'CNY'), due: money(due,'CNY'),
    months: monthly > 0n ? Math.max(0, Number((available-due)*10n/monthly)/10) : null };
}
