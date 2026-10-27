import {planScenario} from './scenario-tools';
import {resolveAgentQuote} from './fx-tool';
import {planRead} from './read-tools';
import {planAction} from './action-tools';
import {UNSUPPORTED_MESSAGE} from './support';
import { detectRecurring } from './recurring-detection';
import { displayAmount, normalizeMerchant, type AgentContext, type AgentPlanResult, type Proposal } from './contracts';

/** A deliberately bounded interpreter. No command or tool output executes a mutation. */
export function planCommand(command:string,context:AgentContext):AgentPlanResult {
 const result=planInternal(command,context);result.resultKind??=result.actions.length?'proposal':result.choices.length?'needs-input':'answer';return result;
}
function planInternal(command:string,context:AgentContext):AgentPlanResult {
 const text=command.trim(),lower=text.toLowerCase();
 const result:AgentPlanResult={id:crypto.randomUUID(),mode:'deterministic',source:context.source,asOf:context.asOf,version:context.version,expiresAt:Date.now()+600000,coverage:context.coverage,message:UNSUPPORTED_MESSAGE,actions:[],choices:[],recurring:[],subscriptions:[]};
 const add=(description:string,payload:Proposal)=>result.actions.push({id:crypto.randomUUID(),description,payload});
 if(!text||text.length>1000||/\b(don['’]?t|do not|not|never|except|unless|if|ignore|instead)\b/i.test(text)){result.resultKind='unsupported';return result;}
 const scenario=planScenario(text,context);if(scenario)return {...result,...scenario};
 if(/\b(and|then)\b|[;\n]/i.test(text)&&! /^(?:please\s+)?(?:freeze|unfreeze)\s+.+?\s+and\s+(?:lower|set|change|raise)\s+(?:its|the)\s+monthly\s+limit\s+to\s+(?:cny\s*)?[\d,.]+(?:\s*cny)?$/i.test(text)){result.message='Please send separate requests for these actions. Nothing has changed.';return result;}
 const expanded=resolveAgentQuote(text,context)??planAction(text,context)??planRead(text,context);if(expanded)return {...result,...expanded};
 if(/^(?:please\s+)?(?:cancel|stop)\s+/i.test(text)){
  const query=normalizeMerchant(text.replace(/^(?:please\s+)?(?:cancel|stop)\s+/i,'').replace(/\b(my|subscription|please)\b/gi,''));
  const matches=context.subscriptions.filter(s=>s.active&&query&&normalizeMerchant(s.name).includes(query));
  if(matches.length!==1){result.message=matches.length?'Choose one subscription by its full name.':'No unique active subscription matches. Nothing has changed.';result.choices=matches.map(s=>`Cancel ${s.name}`);return result;}
  const s=matches[0];result.subscriptions=[s];result.recurring=detectRecurring(context).filter(r=>normalizeMerchant(r.merchant)===normalizeMerchant(s.name));
  if(s.capability!=='simulated'){result.resultKind='unsupported';result.message=UNSUPPORTED_MESSAGE;return result;}
  result.message='Review the exact simulated cancellation below. Confirmation immediately marks the simulated subscription cancelled. No merchant contract or real payment is changed. Historical charges remain; no refund is issued. Usage is '+s.usage+'.';
  add(`Cancel ${s.name} (simulated). Estimated avoided cost: ${displayAmount(s.amountMinor,s.currency)} per ${s.cadence==='yearly'?'year':'month'}, assuming future renewals stop.`,{type:'subscription',subscriptionId:s.id});return result;
 }
 if(/\b(card|freeze|unfreeze)\b/.test(lower)){
  if(!/^(?:please\s+)?(?:freeze|unfreeze|set|lower|change|raise)\b/i.test(text))return result;
  const cards=context.cards.filter(c=>normalizeMerchant(text).includes(normalizeMerchant(c.name))||normalizeMerchant(c.name).split(' ').filter(w=>w.length>3).some(w=>normalizeMerchant(text).split(' ').includes(w)));
  const matches=cards;
  if(matches.length!==1){result.message='Specify the card by its full name.';result.choices=context.cards.map(c=>`Freeze ${c.name} card`);return result;}
  const c=matches[0];
  if(/\bunfreeze\b/.test(lower))add(`Unfreeze ${c.name} (simulated)`,{type:'card',cardId:c.id,mode:'unfreeze'});
  else if(/\bfreeze\b/.test(lower))add(`Freeze ${c.name} (simulated)`,{type:'card',cardId:c.id,mode:'freeze'});
  if(/\b(limit|cap)\b/.test(lower)){
   const amount=lower.match(/(?:to|of)\s+(?:cny\s*)?([\d,]+(?:\.\d{1,2})?)(?:\s*cny)?\s*$/);
   if(!amount||/\b(usd|idr|sgd|daily)\b/.test(lower)){result.actions=[];result.message='Specify a monthly limit in CNY, for example: “Set shopping card monthly limit to CNY 1,000”.';return result;}
   const [whole,part='']=amount[1].replaceAll(',','').split('.');const minor=(BigInt(whole)*100n+BigInt(part.padEnd(2,'0'))).toString();
   if(BigInt(minor)<=0n||BigInt(minor)>9999999999n){result.actions=[];result.message='Enter a positive monthly limit within CNY 99,999,999.99.';return result;}
   add(`Set ${c.name} monthly limit from ${displayAmount(c.limitMinor,'CNY')} to ${displayAmount(minor,'CNY')}`,{type:'card',cardId:c.id,mode:'limit',limitMinor:minor});
  }
  result.message=result.actions.length?'Review each proposed change separately. Nothing has changed yet.':'Tell me whether to freeze, unfreeze, or change the monthly limit.';return result;
 }
 if(/\b(spend|spending|bill|expenses)\b/.test(lower)){
  if(/\b(last|previous|year|yesterday|week|annual|january|february|march|april|may|june|july|august|september|october|november|december)\b|\b20\d{2}\b/.test(lower)){result.resultKind='unsupported';result.message=UNSUPPORTED_MESSAGE+' Supported spending analysis covers this month.';return result;}
  const month=context.asOf.slice(0,7),totals=new Map<string,bigint>();
  const rows=context.transactions.filter(t=>t.settled&&t.direction==='debit'&&t.classification==='consumption'&&t.date.startsWith(month));
  for(const t of rows)totals.set(t.currency,(totals.get(t.currency)??0n)+BigInt(t.amountMinor));
  result.message=rows.length?`Recorded consumption for ${month}: ${[...totals].map(([c,n])=>displayAmount(n.toString(),c)).join('; ')} across ${rows.length} settled charges. Transfers and investments excluded. Comparison with other periods requires sufficient history.`:'Insufficient data: no settled consumption charges in '+month+'.';
  if(context.coverage.truncated)result.message+=' History is truncated; totals cover only retrieved records.';return result;
 }
 if(/\b(recurring|subscriptions?|renewals?|unused|evidence)\b/.test(lower)){
  result.recurring=detectRecurring(context);result.subscriptions=context.subscriptions;
  result.message=result.recurring.length?`Found ${result.recurring.length} recurring-payment candidates from dated transactions. Recurrence does not prove a subscription contract. Usage is unknown unless supplied by a separate source.`:'Insufficient transaction evidence to detect recurring payments. Registered subscriptions below are records, not proof of a recurring pattern. Usage is unknown unless separately supplied.';
  return result;
 }
 result.resultKind='unsupported';return result;
}
