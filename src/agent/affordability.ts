import {normalizeMerchant,type AgentContext} from './contracts';
import type {AffordabilityResult,DraftTask} from './conversation-contracts';
/** Scenario arithmetic is independent of model prose and never mixes currencies. */
export function calculateAffordability(c:AgentContext,drafts:DraftTask[]):AffordabilityResult|null{
 const review=drafts.find(d=>d.kind==='affordability'&&d.status==='draft');if(!review?.amountMinor||!review.currency)return null;
 const currency=review.currency,active=drafts.filter(d=>d.status==='draft'&&(d.currency||c.accounts?.find(a=>a.id===d.source||a.name===d.source)?.currency||c.tuition?.find(t=>t.id===d.target||t.name===d.target)?.currency)===currency),limitations:string[]=[],sourceWarnings:string[]=[];
 if(drafts.some(d=>d.status==='draft'&&['transfer','investment','subscription_payment'].includes(d.kind)&&!d.currency&&!c.accounts?.some(a=>a.id===d.source||a.name===d.source)))limitations.push('A proposed outflow has unresolved currency or funding; its cost is excluded from these totals.');
 const accounts=(c.accounts??[]).filter(a=>a.currency===currency),available=accounts.reduce((n,a)=>n+BigInt(a.availableMinor),0n);
 const obligations=(c.tuition??[]).filter(t=>!t.paid&&t.currency===currency).reduce((n,t)=>n+BigInt(t.outstandingMinor),0n);
 let proposed=0n,proposedConsumption=0n;const perSource=new Map(accounts.map(a=>[a.id,BigInt(a.availableMinor)])),seen=new Set<string>();
 for(const d of active){
  if(seen.has(d.id))continue;seen.add(d.id);if(d.kind==='affordability')continue;
  let amount=BigInt(d.amountMinor||'0'),cash=0n;
  const owned=accounts.find(a=>a.id===d.target||a.name.toLowerCase()===d.target.toLowerCase());
  if(d.kind==='transfer'){cash=owned?0n:amount;if(!owned)limitations.push('External transfer purpose/category is unclassified; it reduces cash but is not automatically consumption.');}
  if(d.kind==='investment')cash=d.mode==='redeem'?-amount:amount;
  if(d.kind==='subscription_payment'){
   if(d.reservation!=='include'){limitations.push('An unsupported payment is excluded until you explicitly include its hypothetical reservation.');continue;}
   if(c.transactions.some(t=>t.currency===currency&&t.settled&&t.direction==='debit'&&t.classification==='consumption'&&t.date.startsWith(c.asOf.slice(0,7))&&normalizeMerchant(t.merchant)===normalizeMerchant(d.target)&&t.amountMinor===d.amountMinor)){limitations.push('A matching settled charge is already recorded; not reserved again. Clarify if this is a separate future charge.');continue;}
   cash=amount;limitations.push('Hypothetical payment reservation only; no merchant payment is supported.');
   if(d.category)proposedConsumption+=amount;else limitations.push('The hypothetical cost has no confirmed consumption category; budget impact is incomplete.');
  }
  if(d.kind==='tuition'){const t=c.tuition?.find(t=>t.id===d.target||t.name===d.target);amount=BigInt(t?.outstandingMinor??'0');cash=0n;}
  proposed+=cash;
  if(d.schedule)limitations.push('Scheduled outflow is a scenario reservation; it has not been debited.');
  const source=accounts.find(a=>a.id===d.source||a.name.toLowerCase()===d.source.toLowerCase());
  if(['transfer','investment','tuition'].includes(d.kind)){
   if(!source)limitations.push('A funding account is unresolved.');
   else{const delta=d.kind==='investment'&&d.mode==='redeem'?-amount:amount,remaining=(perSource.get(source.id)??0n)-delta;perSource.set(source.id,remaining);if(remaining<0n)sourceWarnings.push(source.name+' lacks funds for the proposed sequence.');if(d.kind==='transfer'&&owned)perSource.set(owned.id,(perSource.get(owned.id)??0n)+amount);}
   if(d.kind==='transfer'&&!owned&&!c.recipients?.some(r=>r.verified&&(r.id===d.target||r.name.toLowerCase()===d.target.toLowerCase())))limitations.push('Recipient is unresolved or unverified; transfer cannot execute.');
  }
 }
 if(drafts.some(d=>d.status==='draft'&&d.currency&&d.currency!==currency))limitations.push('Other currencies are excluded; no automatic exchange is assumed.');
 const budgets=(c.budgets??[]).filter(b=>b.currency===currency),cap=budgets.reduce((n,b)=>n+BigInt(b.limitMinor),0n);
 const rows=[...new Map(c.transactions.map(t=>[t.id,t])).values()].filter(t=>t.currency===currency&&t.date.startsWith(c.asOf.slice(0,7))&&t.settled&&t.direction==='debit'&&t.classification==='consumption');
 const recorded=budgets.length&&budgets.every(b=>b.spentMinor!==undefined)?budgets.reduce((n,b)=>n+BigInt(b.spentMinor!),0n):rows.reduce((n,t)=>n+BigInt(t.amountMinor),0n);
 if(!(budgets.length&&budgets.every(b=>b.spentMinor!==undefined))&&(c.coverage.from>c.asOf.slice(0,7)+'-01'||c.coverage.to<c.asOf))limitations.push('Purchase history does not cover the full month to date; budget totals are incomplete.');
 if(c.coverage.truncated||!rows.length&&!budgets.every(b=>b.spentMinor!==undefined))limitations.push('Purchase history is missing or truncated; spending totals are incomplete.');
 if(!budgets.length)limitations.push('No monthly budget is available for this currency.');
 if(!review.category)limitations.push('Additional spending has no category; category headroom is unknown.');
 if(active.some(d=>!d.amountMinor&&['transfer','investment','subscription_payment'].includes(d.kind)))limitations.push('A proposed amount is missing.');
 const extra=BigInt(review.amountMinor),remaining=available-obligations-proposed-extra,budget=budgets.length?cap-recorded-proposedConsumption-extra:null;
 const category=budgets.find(b=>b.category===review.category),categorySpent=category?.spentMinor!==undefined?BigInt(category.spentMinor):rows.filter(t=>t.category===review.category).reduce((n,t)=>n+BigInt(t.amountMinor),0n);
 const categoryRemaining=category?BigInt(category.limitMinor)-categorySpent-extra-active.filter(d=>d.kind==='subscription_payment'&&d.reservation==='include'&&d.category===review.category&&!c.transactions.some(t=>t.currency===currency&&t.settled&&t.direction==='debit'&&t.classification==='consumption'&&t.date.startsWith(c.asOf.slice(0,7))&&normalizeMerchant(t.merchant)===normalizeMerchant(d.target)&&t.amountMinor===d.amountMinor)).reduce((n,d)=>n+BigInt(d.amountMinor||'0'),0n):null;
 limitations.push('Based only on recorded balances, budgets and known tuition; unrecorded bills and future changes are excluded.');
 const limited=limitations.length>1;
 return{currency,availableMinor:String(available),obligationsMinor:String(obligations),proposedCashMinor:String(proposed),additionalMinor:String(extra),scenarioNeedsMinor:String(proposed+extra),cashRemainingMinor:String(remaining),budgetRemainingMinor:budget===null?null:String(budget),categoryRemainingMinor:categoryRemaining===null?null:String(categoryRemaining),sourceWarnings,limitations:[...new Set(limitations)],verdict:remaining<0n||budget!==null&&budget<0n||categoryRemaining!==null&&categoryRemaining<0n||sourceWarnings.length?'insufficient':limited?'limited':'within-recorded-limits',asOf:c.asOf};
}
