import {describe,it,expect} from 'vitest';
import {createSeedSnapshot} from '../../src/demo/seed';
import {safeToSpend} from '../../src/features/overview/safe-to-spend';
import {remittanceQuote,rateComparison} from '../../src/features/fx/remittance';
import {applyDemoAction} from '../../src/demo/demo-engine';
import {shanghaiGreeting} from '../../src/features/overview/shanghai-greeting';
const at='2026-10-20T00:00:00+08:00';
describe('safe to spend',()=>{
 it('reserves tuition before the next allowance without double counting subscriptions',()=>{
  const seed=createSeedSnapshot('v1'),p=safeToSpend(seed,at);
  expect(p.available.amountMinor).toBe(3866936n);expect(p.reserved.amountMinor).toBe(500000n);expect(p.total.amountMinor).toBe(3366936n);
  expect(p.days).toBe(12);expect(p.perDay.amountMinor*BigInt(p.days)).toBeLessThanOrEqual(p.total.amountMinor);
  expect(p.reservations).toHaveLength(1);
 });
 it('compares timestamp instants across UTC and Shanghai offsets',()=>{
  const seed=createSeedSnapshot('v1');const income=seed.transactions.find(t=>t.direction==='credit'&&t.recurrence)!;
  const p=safeToSpend({...seed,transactions:[{...income,recurrence:{cadence:'monthly',nextOccurrenceAt:'2026-10-19T23:00:00Z'}}]},at);
  expect(p.nextIncome?.dueAt).toBe('2026-10-19T23:00:00Z');expect(p.days).toBe(1);
 });
 it('includes due subscriptions once and excludes cancelled subscriptions and paid tuition',()=>{
  const seed=createSeedSnapshot('v1');
  const s={...seed,tuitionObligations:seed.tuitionObligations.map(t=>({...t,status:'paid' as const})),subscriptions:seed.subscriptions.map((s,i)=>({...s,status:i===0?'cancelled' as const:'active' as const,nextRenewalAt:'2026-10-25T00:00:00Z'}))};
  const p=safeToSpend(s,at);expect(p.reserved.amountMinor).toBe(8200n);expect(p.reservations).toHaveLength(3);
 });
 it('uses a labelled 30-day horizon without a future recurring income and handles shortfalls',()=>{
  const seed=createSeedSnapshot('v1');const s={...seed,transactions:seed.transactions.map(t=>({...t,recurrence:null})),accounts:seed.accounts.map(a=>({...a,availableBalance:{...a.availableBalance,amountMinor:0n}}))};
  const p=safeToSpend(s,at);expect(p.nextIncome).toBeNull();expect(p.days).toBe(30);expect(p.total.amountMinor).toBe(0n);expect(p.shortfall.amountMinor).toBe(515000n);
 });
 it('still reserves overdue unpaid tuition',()=>{const seed=createSeedSnapshot('v1');const p=safeToSpend({...seed,tuitionObligations:seed.tuitionObligations.map(t=>({...t,dueAt:'2026-10-01T00:00:00Z'}))},at);expect(p.reserved.amountMinor).toBe(500000n);});
});
describe('sandbox remittance',()=>{
 it('quotes explicit fees and updates both accounts only after an approved engine action',()=>{
 const seed=createSeedSnapshot('v1');const q=remittanceQuote(1000000n,'receive',seed.exchangeRates);expect(q.fee.amountMinor).toBe(8500n);expect(q.destination.amountMinor).toBe(45068n);
 const result=applyDemoAction(seed,{type:'remittance',direction:'receive',sourceId:seed.accounts[2].id,destinationId:seed.accounts[0].id,amountMinor:'1000000',rate:'2200',referenceAt:'2026-10-01'},'remit-test');
 expect(result.snapshot.accounts[2].balance.amountMinor).toBe(seed.accounts[2].balance.amountMinor-1000000n);expect(result.snapshot.accounts[0].balance.amountMinor).toBe(seed.accounts[0].balance.amountMinor+45068n);
 expect(result.snapshot.transactions.find(t=>t.merchant==='Sandbox remittance fee')?.amount.amountMinor).toBe(8500n);
 expect(applyDemoAction(result.snapshot,{type:'remittance',direction:'receive',sourceId:seed.accounts[2].id,destinationId:seed.accounts[0].id,amountMinor:'1000000',rate:'2200',referenceAt:'2026-10-01'},'remit-test').snapshot).toBe(result.snapshot);
 });
 it('does not invent history and reverses improvement for the opposite direction',()=>{
 expect(rateComparison(2200,[],'send')).toBeNull();
 const history=Array.from({length:30},(_,i)=>({date:new Date(Date.UTC(2026,8,i+1)).toISOString().slice(0,10),rate:2000}));
 expect(rateComparison(2200,history,'send')?.improvementPercent).toBeCloseTo(10);expect(rateComparison(2200,history,'receive')!.improvementPercent).toBeLessThan(0);
 });
 it('keeps snoozed and kept subscriptions financially active',()=>{
 const seed=createSeedSnapshot('v1'),s=seed.subscriptions[0];
 for(const mode of ['keep','snooze'] as const){const result=applyDemoAction(seed,{type:'subscription',subscriptionId:s.id,mode},mode);expect(result.snapshot.subscriptions[0].status).toBe('active');expect(result.snapshot.subscriptions[0].insightDecision).toBe(mode==='keep'?'kept':'snoozed');}
 });
});
it('uses Shanghai time for greetings at each boundary',()=>{
 expect(shanghaiGreeting(new Date('2026-10-20T03:59:00Z'))).toBe('Good morning');expect(shanghaiGreeting(new Date('2026-10-20T04:00:00Z'))).toBe('Good afternoon');expect(shanghaiGreeting(new Date('2026-10-20T10:00:00Z'))).toBe('Good evening');
});
