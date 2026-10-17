import type { FinancialSnapshot } from '../domain/entities';
import type { DemoAction } from '../demo/demo-engine';
import { parseMajorAmount, projectedRunway } from '../features/demo/planning-helpers';
import { formatMoney } from '../domain/money';
export type SuggestedStep = Readonly<{ label: string; action: DemoAction }>;
export type DemoInterpretation = Readonly<{ steps: readonly SuggestedStep[]; messages: readonly string[]; recognized: boolean }>;

export const FLAGSHIP_COMMAND = 'Pay my CNY 5,000 tuition installment, reduce my shopping budget by 20%, cancel my unused video subscription, and show my remaining cash runway.';

/** Deterministic intent parsing only. No generative model or third-party call. */
export function interpretDemoCommand(command: string, state: FinancialSnapshot): DemoInterpretation {
  const text = command.toLocaleLowerCase().slice(0,2000);
  const messages: string[] = [];
  const steps: SuggestedStep[] = [];
  const firstCny = state.accounts.find(a=>a.currency==='CNY'&&a.type==='daily'&&a.status==='active');
  let recognized=false;
  if (/tuition|学费/.test(text)) {
    recognized=true;
    const due=state.tuitionObligations.find(t=>t.status!=='paid');
    if (due&&firstCny) steps.push({label:'Pay fictional tuition ('+formatMoney(due.amount)+')',action:{type:'tuition',sourceId:firstCny.id,tuitionId:due.id}});
    else messages.push('No unpaid tuition is available.');
  }
  const budgetText=/\b(budget|spending cap|reduce|lower|cut)\b/.test(text);
  if (budgetText) {
    recognized=true;
    const category=(['shopping','food','rent','transportation','other'] as const).find(c=>text.includes(c)) ?? null;
    const pct=/\b(\d{1,2})\s*%/.exec(text);
    if (category&&pct) {
      const budget=state.budgets.find(b=>b.category===category&&b.month===state.asOf.slice(0,7));
      if (budget) {
        const percent=Number(pct[1]);const newLimit=budget.limit.amountMinor*(100n-BigInt(percent))/100n;
        if (newLimit>0n)steps.push({label:'Reduce '+category+' cap by '+percent+'% to '+formatMoney({...budget.limit,amountMinor:newLimit}),
          action:{type:'budget',category,limitMinor:newLimit.toString()}});
      }
    } else messages.push('For a budget change, specify a category and percentage such as reduce shopping by 20%.');
  }
  if (/subscription|cancel|unused video/.test(text)) {
    recognized=true;
    const subscription=state.subscriptions.find(s=>s.status==='active' && (text.includes('video')?s.merchant.toLowerCase().includes('video'):!s.lastUsageAt));
    if (subscription && /cancel|unused|stop/.test(text)) steps.push({label:'Cancel fictional '+subscription.merchant+' ('+formatMoney(subscription.amount)+' per month)',action:{type:'subscription',subscriptionId:subscription.id}});
    else messages.push('Review active subscriptions before choosing one to cancel.');
  }
  if (/transfer|send\s+(cny|¥|rmb)|pay\s+zhang/i.test(text) && !text.includes('tuition')) {
    recognized=true;
    const amount=/\b(?:cny|rmb)\s*([\d,]+(?:\.\d{1,2})?)/i.exec(text);
    const recipient=state.beneficiaries.find(b=>text.includes(b.displayName.toLowerCase()));
    if (recipient && firstCny && amount) {
      try {steps.push({label:'Transfer CNY '+amount[1]+' to '+recipient.displayName,action:{type:'transfer',sourceId:firstCny.id,beneficiaryId:recipient.id,amountMinor:parseMajorAmount(amount[1].replaceAll(',',''),'CNY')}});}
      catch {messages.push('Transfer amount could not be parsed.');}
    } else messages.push('CLARIFICATION_REQUIRED: include a unique saved beneficiary and CNY amount, for example: transfer CNY 800 to Zhang Wei.');
  }
  if (/card|freeze|unfreeze/.test(text)) {
    recognized=true;
    const c=state.cards.find(c=>c.freezeState==='active');
    if (c && /freeze/.test(text)) steps.push({label:'Freeze '+c.purpose+' fictional virtual card',action:{type:'card',cardId:c.id,mode:'freeze'}});
    else messages.push('To change a card limit or unfreeze a specific card, use Card Management.');
  }
  if (/invest|wealth|risk|fund|portfolio/.test(text)) {
    recognized=true;
    messages.push('Fictional wealth products: '+state.investmentProducts.map(p=>p.name+' ('+p.simulatedRisk+' risk)').join(', ')+'. Review suitability and approve any order in Wealth Management.');
  }
  if (/spending|expense|bill|income|analyz/.test(text)) {
    recognized=true;
    const rows=state.transactions.filter(t=>t.classification==='consumption'&&t.direction==='debit'&&t.amount.currency==='CNY'&&t.occurredAt.startsWith(state.asOf.slice(0,7)));
    const total=rows.reduce((n,t)=>n+t.amount.amountMinor,0n);
    messages.push('Observed simulated CNY consumption this month: '+formatMoney({amountMinor:total,currency:'CNY'})+'. Internal transfers and investments are excluded.');
  }
  if (/fx|exchange|remittance|currency|cross.border/.test(text)) {
    recognized=true;
    messages.push('Available reference rates: '+state.exchangeRates.map(r=>r.base+'/'+r.quote+' '+r.rate+' ('+r.source+')').join('; ')+'. These rates are fictional demo fixtures, not executable offers.');
  }
  if (/runway|cash|forecast|tuition|budget/.test(text)) {
    recognized=true;
    const projection=projectedRunway(state);
    messages.push('Current illustrative runway: '+(projection.months===null?'no finite number':projection.months+' months')+
      '. Formula: (available CNY '+formatMoney(projection.available)+' minus outstanding tuition '+formatMoney(projection.due)+') / monthly caps '+formatMoney(projection.monthly)+'.');
  }
  if (!recognized) messages.push('Try: analyze my spending; transfer CNY 800 to Zhang Wei; freeze my card; compare low-risk funds; or run the flagship tuition, budget and subscription plan.');
  return {steps,messages,recognized};
}
