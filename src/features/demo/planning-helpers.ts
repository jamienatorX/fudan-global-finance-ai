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
/** Reference converter for every pair of the four seeded account currencies.
 * An exact rational cross-rate is accumulated through the graph; rounding occurs
 * only once in target minor units, avoiding false 'rate unavailable' and drift.
 */
export function referenceConversion(value: Money, target: CurrencyCode, rates: readonly ExchangeRate[]) {
  if (value.currency === target) return { amount: value, source: 'identity', referenceAt: '' };
  const parseRate = (raw: string) => {
    if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
    const [whole,fraction=''] = raw.split('.');
    const numerator = BigInt(whole+fraction),denominator = 10n ** BigInt(fraction.length);
    return numerator > 0n ? { numerator,denominator } : null;
  };
  type Leg = { to: CurrencyCode; numerator: bigint; denominator: bigint; rate: ExchangeRate };
  const graph = new Map<CurrencyCode, Leg[]>();
  for (const rate of rates) {
    const parsed=parseRate(rate.rate);
    if (!parsed) continue;
    graph.set(rate.base,[...(graph.get(rate.base)??[]),{to:rate.quote,...parsed,rate}]);
    graph.set(rate.quote,[...(graph.get(rate.quote)??[]),{
      to:rate.base,numerator:parsed.denominator,denominator:parsed.numerator,rate
    }]);
  }
  const queue:{code: CurrencyCode; numerator: bigint; denominator: bigint; legs: readonly ExchangeRate[]}[]=[
    {code:value.currency,numerator:1n,denominator:1n,legs:[]}
  ];
  const visited=new Set<CurrencyCode>([value.currency]);
  for (let i=0;i<queue.length;i++) {
    const step=queue[i];
    for (const leg of graph.get(step.code)??[]) {
      if (visited.has(leg.to))continue;
      const next={code:leg.to,numerator:step.numerator*leg.numerator,
        denominator:step.denominator*leg.denominator,legs:[...step.legs,leg.rate]};
      if (next.code===target) {
        const sourceScale=10n**BigInt(CURRENCY_MINOR_DIGITS[value.currency]);
        const targetScale=10n**BigInt(CURRENCY_MINOR_DIGITS[target]);
        const numerator=value.amountMinor*next.numerator*targetScale;
        const denominator=next.denominator*sourceScale;
        const rounded=(numerator+denominator/2n)/denominator;
        return {amount:money(rounded,target),
          source:next.legs.length===1?next.legs[0].source+': '+next.legs[0].provider:
            'cross-rate via '+(next.legs.map(r=>r.source).every(x=>x==='fallback')?'fallback fixtures':'reference rates'),
          referenceAt:next.legs.map(r=>r.referenceAt).toSorted()[0],via:next.legs.length};
      }
      visited.add(next.code);queue.push(next);
    }
  }
  throw new Error('RATE_UNAVAILABLE: no supported reference rate');
}
export function projectedRunway(snapshot: FinancialSnapshot) {
  const toCny = (m: Money) => referenceConversion(m, 'CNY', snapshot.exchangeRates).amount.amountMinor;
  const available = snapshot.accounts.filter(a => a.status === 'active').reduce((s,a)=>s+toCny(a.availableBalance),0n);
  const budgetCaps = snapshot.budgets.filter(b=>b.month===snapshot.asOf.slice(0,7)).reduce((s,b)=>s+toCny(b.limit),0n);
  // A cancelled recurring charge no longer contributes to next month's outflow.
  // Only subtract charges actually present in the seeded transaction ledger.
  const cancelledMonthly = snapshot.subscriptions.filter(s=>s.status==='cancelled' &&
    snapshot.transactions.some(t=>t.subscriptionId===s.id && t.classification==='consumption'))
    .reduce((sum,s)=>sum+(s.cadence==='monthly'?toCny(s.amount):toCny(s.amount)/12n),0n);
  const monthly = budgetCaps > cancelledMonthly ? budgetCaps-cancelledMonthly : 0n;
  const due = snapshot.tuitionObligations.filter(t=>t.status!=='paid').reduce((s,t)=>s+toCny(t.amount)-toCny(t.paidAmount),0n);
  return { available: money(available,'CNY'), monthly: money(monthly,'CNY'), due: money(due,'CNY'),
    months: monthly > 0n ? Math.max(0, Number(((available-due)*10n + monthly/2n)/monthly)/10) : null };
}
