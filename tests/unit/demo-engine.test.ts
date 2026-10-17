import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { applyDemoAction, runApprovedDemoBatch } from '../../src/demo/demo-engine';

const seed=()=>createSeedSnapshot('v1');
describe('approved simulation ledger',()=>{
 it('moves same-currency own funds exactly once without inflating income or consumption',()=>{
   const s=seed();const before=s.accounts.slice(0,2);
   const action={type:'transfer' as const,sourceId:before[0].id,destinationId:before[1].id,amountMinor:'80000'};
   const first=applyDemoAction(s,action,'retry-key-1');
   const again=applyDemoAction(first.snapshot,action,'retry-key-1');
   expect(first.snapshot.accounts[0].balance.amountMinor).toBe(before[0].balance.amountMinor-80000n);
   expect(first.snapshot.accounts[1].balance.amountMinor).toBe(before[1].balance.amountMinor+80000n);
   expect(again.snapshot).toBe(first.snapshot);
   expect(first.snapshot.transactions.filter(t=>t.transferId==='retry-key-1').map(t=>t.classification)).toEqual(['internal-transfer','internal-transfer']);
 });
 it('rejects insufficient cash and ambiguous/missing targets without a mutation',()=>{
   const s=seed();
   expect(()=>applyDemoAction(s,{type:'transfer',sourceId:s.accounts[0].id,beneficiaryId:s.beneficiaries[0].id,amountMinor:'9999999999'},'x')).toThrow(/insufficient/i);
   expect(()=>applyDemoAction(s,{type:'transfer',sourceId:s.accounts[0].id,amountMinor:'100'},'x')).toThrow(/recipient/i);
   expect(s.auditEvents).toHaveLength(3);
 });
 it('runs approved flagship changes and records receipts while keeping rejections independent',()=>{
   const s=seed();const tuition=s.tuitionObligations[0];const shopping=s.budgets.find(b=>b.category==='shopping')!;const video=s.subscriptions[0];
   const steps=[
     {id:'tuition-step',approved:true,action:{type:'tuition' as const,sourceId:s.accounts[0].id,tuitionId:tuition.id}},
     {id:'budget-step',approved:true,action:{type:'budget' as const,category:'shopping' as const,limitMinor:'46400'}},
     {id:'video-step',approved:false,action:{type:'subscription' as const,subscriptionId:video.id}}
   ];
   const result=runApprovedDemoBatch(s,steps);
   expect(result.results.map(x=>x.status)).toEqual(['executed','executed','rejected']);
   expect(result.snapshot.accounts[0].availableBalance.amountMinor).toBe(s.accounts[0].availableBalance.amountMinor-500000n);
   expect(result.snapshot.tuitionObligations[0].status).toBe('paid');
   expect(result.snapshot.budgets.find(b=>b.id===shopping.id)!.limit.amountMinor).toBe(46400n);
   expect(result.snapshot.subscriptions[0].status).toBe('active');
   expect(result.snapshot.auditEvents).toHaveLength(s.auditEvents.length+2);
 });
 it('isolates a tuition failure and still completes an independently approved budget',()=>{
   const s=seed();const low={...s,accounts:s.accounts.map((a,i)=>i===0?{...a,availableBalance:{...a.availableBalance,amountMinor:0n}}:a)};
   const outcome=runApprovedDemoBatch(low,[
     {id:'tuition-fail',approved:true,action:{type:'tuition',sourceId:s.accounts[0].id,tuitionId:s.tuitionObligations[0].id}},
     {id:'budget-pass',approved:true,action:{type:'budget',category:'shopping',limitMinor:'46400'}}
   ]);
   expect(outcome.results.map(r=>r.status)).toEqual(['failed','executed']);
   expect(outcome.snapshot.tuitionObligations[0].status).toBe('unpaid');
   expect(outcome.snapshot.budgets.find(b=>b.category==='shopping')!.limit.amountMinor).toBe(46400n);
 });
 it('cancelled subscriptions preserve historic charges; buys never count as consumption',()=>{
   const s=seed();
   const cancel=applyDemoAction(s,{type:'subscription',subscriptionId:s.subscriptions[0].id},'cancel-1');
   expect(cancel.snapshot.transactions.length).toBe(s.transactions.length);
   const buy=applyDemoAction(cancel.snapshot,{type:'investment',sourceId:s.accounts[0].id,productId:s.investmentProducts[0].id,direction:'buy',amountMinor:'50000'},'invest-1');
   expect(buy.snapshot.transactions.at(-1)?.classification).toBe('asset-movement');
   expect(buy.snapshot.investmentOrders.at(-1)?.status).toBe('completed');
 });
 it('creates scheduled receipts without immediately debiting the account',()=>{
   const s=seed();
   const result=applyDemoAction(s,{type:'transfer',sourceId:s.accounts[0].id,beneficiaryId:s.beneficiaries[0].id,amountMinor:'10000',scheduledAt:'2030-11-01T01:00:00.000Z'},'schedule-1');
   expect(result.snapshot.accounts[0]).toEqual(s.accounts[0]);
   expect(result.snapshot.transfers.at(-1)?.status).toBe('scheduled');
 });
});
