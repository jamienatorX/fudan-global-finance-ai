import type { CurrencyCode } from '../../domain/currency';
import type { ExchangeRate } from '../../domain/entities';
import type { Money } from '../../domain/money';
import type { OverviewModel } from './overview-queries';
import { referenceConversion } from '../demo/planning-helpers';

/** Translates display-only financial summaries. Original bank balances and
 * stored transactions stay in their own currency and are never rewritten.
 */
export function displayOverviewCurrency(overview: OverviewModel, target: CurrencyCode,
  rates: readonly ExchangeRate[]): OverviewModel {
  if (target === 'CNY') return overview;
  const convert=(value:Money)=>referenceConversion(value,target,rates).amount;
  const balance=(a:OverviewModel['accountBalances'][number])=>({...a,reportingAmount:convert(a.reportingAmount)});
  return {
    ...overview,
    totalNetWorth:convert(overview.totalNetWorth), availableCash:convert(overview.availableCash),
    investedValue:convert(overview.investedValue),
    monthlyIncome:convert(overview.monthlyIncome),monthlyExpenses:convert(overview.monthlyExpenses),
    monthlyCashFlow:convert(overview.monthlyCashFlow),
    accountBalances:overview.accountBalances.map(balance),
    selectedAccount:overview.selectedAccount ? balance(overview.selectedAccount) : null,
    spending:overview.spending.map(x=>({...x,amount:convert(x.amount)})),
    budget:{...overview.budget,limit:convert(overview.budget.limit),actual:convert(overview.budget.actual)},
    subscriptions:{...overview.subscriptions,monthly:convert(overview.subscriptions.monthly),
      annual:convert(overview.subscriptions.annual)},
    tuition:{...overview.tuition,outstanding:convert(overview.tuition.outstanding)},
    // Emergency fund and individual transactions retain original currency,
    // preserving their actual monetary meaning.
    forecast:overview.forecast.map(x=>({...x,opening:convert(x.opening),inflow:convert(x.inflow),
      recurringOutflow:convert(x.recurringOutflow),obligations:convert(x.obligations),closing:convert(x.closing)})),
  };
}
