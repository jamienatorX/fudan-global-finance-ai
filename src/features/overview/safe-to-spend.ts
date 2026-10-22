import type { FinancialSnapshot } from '../../domain/entities';
import { money } from '../../domain/money';
import { referenceConversion } from '../demo/planning-helpers';

export function shanghaiDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
/** Reserves obligations due before the next observed recurring income schedule.
 * Overdue unpaid obligations remain reserved. Unknown future income uses an explicit 30-day horizon.
 */
export function safeToSpend(snapshot: FinancialSnapshot, at: string) {
  const today=shanghaiDate(at);
  const owner=snapshot.users[0].id;
  const toCny=(value: Parameters<typeof referenceConversion>[0])=>referenceConversion(value,'CNY',snapshot.exchangeRates).amount.amountMinor;
  const eligible=snapshot.transactions.filter(t=>t.ownerId===owner && t.direction==='credit' && t.classification==='income' && t.recurrence && Date.parse(t.recurrence.nextOccurrenceAt)>Date.parse(at));
  // The latest recorded occurrence wins for each observed stream; don't replay old schedules.
  const streams=new Map<string,typeof eligible[number]>();
  for(const t of eligible.toSorted((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)))streams.set(`${t.accountId}:${t.merchant}:${t.recurrence!.cadence}`,t);
  const nextIncome=[...streams.values()].toSorted((a,b)=>Date.parse(a.recurrence!.nextOccurrenceAt)-Date.parse(b.recurrence!.nextOccurrenceAt))[0];
  const horizon=nextIncome?.recurrence?.nextOccurrenceAt ?? new Date(Date.parse(at)+30*86400000).toISOString();
  const days=Math.max(1,Math.ceil((Date.parse(shanghaiDate(horizon)+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000));
  const available=snapshot.accounts.filter(a=>a.ownerId===owner&&a.status==='active').reduce((sum,a)=>sum+toCny(a.availableBalance),0n);
  const reservations:{id:string;label:string;dueAt:string;amountMinor:bigint}[]=[];
  for(const tuition of snapshot.tuitionObligations.filter(t=>t.ownerId===owner&&t.status!=='paid'&&Date.parse(t.dueAt)<=Date.parse(horizon))) {
    const outstanding=toCny(tuition.amount)-toCny(tuition.paidAmount);
    if(outstanding>0n)reservations.push({id:tuition.id,label:tuition.institution+' tuition',dueAt:tuition.dueAt,amountMinor:outstanding});
  }
  for(const subscription of snapshot.subscriptions.filter(s=>s.ownerId===owner&&s.status==='active'&&Date.parse(s.nextRenewalAt)<=Date.parse(horizon))) {
    reservations.push({id:subscription.id,label:subscription.merchant,dueAt:subscription.nextRenewalAt,amountMinor:toCny(subscription.amount)});
  }
  const bills=new Map<string,typeof snapshot.transactions[number]>();
  for(const t of snapshot.transactions.toSorted((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt))) {
    if(t.ownerId===owner&&t.classification==='consumption'&&t.direction==='debit'&&t.recurrence&&!t.subscriptionId) bills.set(t.accountId+':'+t.merchant,t);
  }
  for(const bill of bills.values())if(Date.parse(bill.recurrence!.nextOccurrenceAt)<=Date.parse(horizon))reservations.push({id:bill.id,label:bill.merchant,dueAt:bill.recurrence!.nextOccurrenceAt,amountMinor:toCny(bill.amount)});
  for(const transfer of snapshot.transfers.filter(t=>t.ownerId===owner&&t.status==='scheduled'&&t.scheduledAt&&Date.parse(t.scheduledAt)<=Date.parse(horizon)&&!t.destinationAccountId&&!t.tuitionObligationId))reservations.push({id:transfer.id,label:'Scheduled bill / transfer',dueAt:transfer.scheduledAt!,amountMinor:toCny(transfer.amount)});
  const reserved=reservations.reduce((sum,r)=>sum+r.amountMinor,0n);
  const remaining=available-reserved;
  const total=remaining>0n?remaining:0n;
  return {total:money(total,'CNY'),perDay:money(total/BigInt(days),'CNY'),available:money(available,'CNY'),reserved:money(reserved,'CNY'),shortfall:money(remaining<0n?-remaining:0n,'CNY'),days,horizon,
    nextIncome:nextIncome?{merchant:nextIncome.merchant,dueAt:nextIncome.recurrence!.nextOccurrenceAt}:null,
    reservations:reservations.toSorted((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt))};
}
