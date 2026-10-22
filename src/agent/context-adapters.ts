import type {FinancialSnapshot} from '../domain/entities';
import type {BankingState,TableItem} from '../server/secure-banking';
import type {AgentContext,AgentTransaction,Proposal} from './contracts';

export function demoAgentContext(snapshot:FinancialSnapshot,version:number):AgentContext {
 const owner=snapshot.users[0].id;
 const transactions=snapshot.transactions.filter(t=>t.ownerId===owner).map(t=>({id:t.id,accountId:t.accountId,currency:t.amount.currency,amountMinor:t.amount.amountMinor.toString(),merchant:t.merchant,date:t.occurredAt,category:t.category,direction:t.direction,classification:t.classification,settled:true}));
 return {accounts:snapshot.accounts.filter(a=>a.ownerId===owner&&a.status==='active').map(a=>({id:a.id,name:a.type+' '+a.currency,currency:a.currency,balanceMinor:String(a.balance.amountMinor),availableMinor:String(a.availableBalance.amountMinor),...(a.goal?{goalMinor:String(a.goal.amountMinor)}:{})})),
 recipients:snapshot.beneficiaries.filter(b=>b.ownerId===owner).map(b=>({id:b.id,name:b.displayName,currencies:b.supportedCurrencies,verified:b.verificationState==='verified'})),
 budgets:snapshot.budgets.filter(b=>b.ownerId===owner&&b.month===snapshot.asOf.slice(0,7)).map(b=>({category:b.category,limitMinor:String(b.limit.amountMinor),currency:b.currency,spentMinor:String(b.actualSpend.amountMinor)})),
 tuition:snapshot.tuitionObligations.filter(t=>t.ownerId===owner).map(t=>({id:t.id,name:t.institution+' '+t.installment,outstandingMinor:String(t.amount.amountMinor-t.paidAmount.amountMinor),currency:t.amount.currency,paid:t.status==='paid'})),
 products:snapshot.investmentProducts.map(p=>({id:p.id,name:p.name,risk:p.simulatedRisk,fees:(p.feeBasisPoints/100).toFixed(2)+'%',liquidity:p.liquidity})),
 holdings:snapshot.holdings.filter(h=>h.ownerId===owner).map(h=>({productId:h.productId,valueMinor:String(h.simulatedValue.amountMinor)})),
 activity:snapshot.auditEvents.filter(a=>a.ownerId===owner).map(a=>({id:a.id,label:a.eventType,date:a.occurredAt})),activityCoverage:'All activity in this local demo snapshot',ledger:transactions,ledgerCoverage:'All transactions in this local demo snapshot',
 receipts:[...snapshot.transfers.filter(t=>t.ownerId===owner).map(t=>({id:t.id,type:t.tuitionObligationId?'tuition':'transfer',sourceId:t.sourceAccountId,destinationId:t.destinationAccountId??undefined,beneficiaryId:t.beneficiaryId??undefined,scheduledAt:t.scheduledAt??undefined,tuitionId:t.tuitionObligationId??undefined,amountMinor:String(t.amount.amountMinor),status:t.status})),...snapshot.investmentOrders.filter(o=>o.ownerId===owner).map(o=>({id:o.id,type:'investment',sourceId:snapshot.transactions.find(t=>t.investmentOrderId===o.id&&t.ownerId===owner)?.accountId,amountMinor:String(o.amount.amountMinor),status:o.status}))],rates:[...snapshot.exchangeRates],
 source:'browser-local fictional simulation',asOf:snapshot.asOf,version,coverage:{from:transactions.map(t=>t.date).sort()[0]??snapshot.asOf,to:snapshot.asOf,truncated:false},transactions,
  subscriptions:snapshot.subscriptions.filter(s=>s.ownerId===owner).map(s=>({id:s.id,name:s.merchant,active:s.status==='active',amountMinor:s.amount.amountMinor.toString(),currency:s.currency,cadence:s.cadence,capability:'simulated',usage:s.lastUsageAt?'fixture usage last recorded '+s.lastUsageAt:'unknown',nextRenewal:s.nextRenewalAt})),
  cards:snapshot.cards.filter(c=>c.ownerId===owner).map(c=>({id:c.id,name:c.purpose.replaceAll('-',' '),frozen:c.freezeState==='frozen',limitMinor:c.monthlyLimit.amountMinor.toString()}))};
}
export function privateAgentContext(state:BankingState,transactions:AgentTransaction[],coverage:AgentContext['coverage']):AgentContext {
 return {accounts:state.accounts.map(a=>({id:String(a.id),name:String(a.label),currency:String(a.currency),balanceMinor:String(a.balance_minor),availableMinor:String(a.balance_minor)})),recipients:[],
 budgets:state.budgets.map(b=>({category:String(b.category),limitMinor:String(b.limit_minor),currency:'CNY'})),
 tuition:state.tuition.map(t=>({id:String(t.id),name:String(t.label),outstandingMinor:t.paid===true?'0':String(t.amount_minor),currency:'CNY',paid:t.paid===true})),
 products:state.products.map(p=>({id:String(p.id),name:String(p.name),risk:String(p.risk),fees:'Not supplied by this data source',liquidity:'Not supplied by this data source'})),
 holdings:state.holdings.map(h=>({productId:String(h.product_id),valueMinor:String(h.value_minor)})),
 activity:state.audit.map(a=>({id:String(a.id),label:String(a.event),date:String(a.created_at)})),activityCoverage:'At most 100 retrieved audit records; complete history is not guaranteed',
 ledger:state.ledger.map(t=>({id:String(t.id),accountId:String(t.account_id),currency:String(t.currency),amountMinor:String(t.amount_minor),merchant:String(t.label),date:String(t.created_at),category:'other',direction:String(t.direction),classification:String(t.classification),settled:true})),ledgerCoverage:'At most 100 retrieved ledger records; complete history is not guaranteed',
 source:'authenticated fictional banking; explicit sample purchase history if loaded',asOf:new Date().toISOString(),version:state.version,coverage,transactions,
  subscriptions:state.subscriptions.map(s=>({id:String(s.id),name:String(s.merchant),active:s.active===true,amountMinor:String(s.monthly_minor),currency:'CNY',cadence:'monthly',capability:'simulated',usage:'unknown'})),
  cards:state.cards.map(c=>({id:String(c.id),name:String(c.label),frozen:c.frozen===true,limitMinor:String(c.monthly_limit_minor)}))};
}
export function purchaseRow(row:TableItem):AgentTransaction {
 return {id:String(row.id),accountId:String(row.account_id),currency:String(row.currency),amountMinor:String(row.amount_minor),merchant:String(row.merchant),date:String(row.occurred_at),category:String(row.category),direction:'debit',classification:'consumption',settled:true};
}
export function verifyProposal(payload:Proposal,context:AgentContext,actionId?:string,before?:AgentContext):boolean {
 if(payload.type==='budget')return context.budgets?.some(b=>b.category===payload.category&&b.limitMinor===payload.limitMinor)??false;
 if(payload.type==='tuition')return Boolean(context.tuition?.some(t=>t.id===payload.tuitionId&&t.paid)&&context.receipts?.some(r=>r.id===actionId&&r.type==='tuition'&&r.tuitionId===payload.tuitionId&&r.sourceId===payload.sourceId&&r.amountMinor===before?.tuition?.find(t=>t.id===payload.tuitionId)?.outstandingMinor&&r.status==='completed'));
 if(payload.type==='transfer')return context.receipts?.some(r=>r.id===actionId&&r.type==='transfer'&&r.sourceId===payload.sourceId&&r.destinationId===payload.destinationId&&r.beneficiaryId===payload.beneficiaryId&&r.scheduledAt===payload.scheduledAt&&r.amountMinor===payload.amountMinor&&r.status===(payload.scheduledAt?'scheduled':'completed'))??false;
 if(payload.type==='investment'){
  const previous=BigInt(before?.holdings?.find(h=>h.productId===payload.productId)?.valueMinor??'0'),current=BigInt(context.holdings?.find(h=>h.productId===payload.productId)?.valueMinor??'0');
  return Boolean(before&&current===previous+(payload.direction==='buy'?1n:-1n)*BigInt(payload.amountMinor)&&context.receipts?.some(r=>r.id===actionId&&r.type==='investment'&&r.sourceId===payload.sourceId&&r.amountMinor===payload.amountMinor&&r.status==='completed'));
 }
 if(payload.type==='subscription')return context.subscriptions.some(s=>s.id===payload.subscriptionId&&!s.active);
 const card=context.cards.find(c=>c.id===payload.cardId);if(!card)return false;
 return payload.mode==='freeze'?card.frozen:payload.mode==='unfreeze'?!card.frozen:payload.mode==='limit'&&card.limitMinor===payload.limitMinor;
}
/** Explicit fixture import only. Historical charges do not debit today's opening balances. */
export function withSampleHistory(snapshot:FinancialSnapshot):FinancialSnapshot {
 const extra=snapshot.transactions.filter(t=>t.subscriptionId&&t.occurredAt.startsWith('2026-10')).flatMap(t=>[8,9].map(month=>({...t,id:`${t.id.slice(0,-3)}${month}${t.id.slice(-2)}`,occurredAt:`2026-${String(month).padStart(2,'0')}-05T08:00:00.000Z`,recordedAt:snapshot.asOf,recurrence:null})));
 const existing=new Set(snapshot.transactions.map(t=>t.id));return {...snapshot,transactions:[...snapshot.transactions,...extra.filter(t=>!existing.has(t.id))]};
}
