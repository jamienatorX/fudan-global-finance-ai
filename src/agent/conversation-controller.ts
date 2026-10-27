import {canonicalReadQuery,explicitWithdrawal} from './conversation-normalisation';
import {normalizeMerchant,displayAmount,type AgentContext} from './contracts';
import {planCommand} from './planner';
import {calculateAffordabilities} from './affordability';
import {isSubscriptionPlanningRequest,subscriptionPlanningTask,prepareSubscriptionPlan} from './subscription-planning';
import {UNSUPPORTED_MESSAGE} from './support';
import type {ConversationState,ConversationTask,ConversationTurn,ConversationUpdate,DraftTask} from './conversation-contracts';
import {assertConversationCapacity} from './conversation-contracts';
function resolve<T extends {id:string;name:string}>(rows:readonly T[],query:string):T|undefined{
 if(!query)return;const exact=rows.filter(r=>r.id===query||normalizeMerchant(r.name)===normalizeMerchant(query));if(exact.length===1)return exact[0];
 const partial=rows.filter(r=>normalizeMerchant(r.name).split(' ').includes(normalizeMerchant(query)));return partial.length===1?partial[0]:undefined;
}
function compile(d:DraftTask,c:AgentContext):ConversationTask{
 const need=(question:string):ConversationTask=>({draft:d,status:'needs-input',message:'Nothing has changed.',question});
 if(d.status!=='draft')return{draft:d,status:d.status,message:d.receipt?'Original receipt: '+d.receipt.status+(d.receipt.verified?' · verified':''):'Task '+d.status+'.'};
 const planning=subscriptionPlanningTask(d,c);if(planning)return planning;
 if(d.kind==='subscription_payment'||d.kind==='unsupported')return{draft:d,status:'unsupported',message:UNSUPPORTED_MESSAGE+(d.kind==='subscription_payment'?' Subscription payment is unavailable; you can explicitly include this cost as a hypothetical reservation.':'')};
 if(d.kind==='affordability')return !d.amountMinor||!d.currency?need('How much extra would you like to spend, and in which currency?'):{draft:d,status:'ready',message:'Read-only scenario calculation. No additional spending will be executed.'};
 let command='';const accounts=(c.accounts??[]).filter(a=>!d.currency||a.currency===d.currency),source=resolve(accounts,d.source);
 const target=resolve([...(c.accounts??[]),...(c.recipients??[]).filter(r=>r.verified)],d.target);
 if(d.kind==='read'){command=canonicalReadQuery(d.query||'Show my balances');const p=planCommand(command,c);if(p.actions.length)return need('Choose a read-only information task. Changes require a separate action draft.');return{draft:d,status:p.resultKind==='unsupported'?'unsupported':'ready',message:p.message,plan:p};}
 if(d.kind==='transfer'){
  if(d.target&&!target)return need(`I could not find one verified recipient or owned account matching “${d.target}”. Which existing recipient should I use?`);
  if(!d.amountMinor||!d.currency)return need('What amount and currency should I transfer?');
  if(!source)return need('Which funding account should I use? Choose an existing account below.');
  if(!target)return need('Who should receive the transfer? Choose an existing verified recipient or owned account.');
  command=`Transfer ${displayAmount(d.amountMinor,d.currency)} from ${source.name} to ${target.name}${d.schedule?' on '+d.schedule:''}`;
 }
 if(d.kind==='budget'){if(!d.category||!d.amountMinor||d.currency!=='CNY')return need('Which monthly budget category and CNY limit should I use?');command=`Set ${d.category} budget to ${displayAmount(d.amountMinor,'CNY')}`;}
 if(d.kind==='tuition'){const t=resolve(c.tuition??[],d.target);if(!t)return need('Which recorded tuition obligation should I pay?');if(!source)return need('Which CNY funding account should I use for tuition?');command=`Pay ${t.name} from ${source.name}`;}
 if(d.kind==='investment'){const p=resolve(c.products??[],d.target);if(!p)return need('Which existing fictional investment product should I use?');if(!source)return need('Which CNY account should fund or receive this order?');if(!d.amountMinor||d.currency!=='CNY')return need('What CNY amount should I use?');if(!['buy','redeem'].includes(d.mode))return need('Would you like to buy or redeem?');if(d.mode==='buy'&&!d.risk)return need('What is your risk tolerance: low, medium or high?');command=`${d.mode==='buy'?'Buy':'Redeem'} ${displayAmount(d.amountMinor,'CNY')} of ${p.name} from ${source.name}${d.risk?' with '+d.risk+' risk tolerance':''}`;}
 if(d.kind==='card'){const card=resolve(c.cards,d.target);if(!card)return need('Which card should I change?');if(!['freeze','unfreeze','limit'].includes(d.mode))return need('Should I freeze, unfreeze or change its monthly limit?');if(d.mode==='limit'&&!d.amountMinor)return need('What new monthly limit in CNY should I use?');if(d.mode==='limit'&&d.currency&&d.currency!=='CNY')return need('Card limits use CNY. What CNY amount should I use?');command=d.mode==='limit'?`Set ${card.name} card monthly limit to ${displayAmount(d.amountMinor,'CNY')}`:`${d.mode==='freeze'?'Freeze':'Unfreeze'} ${card.name} card`;}
 if(d.kind==='cancel_subscription'){const s=resolve(c.subscriptions,d.target);if(!s)return need('Which registered subscription would you like to cancel?');command='Cancel '+s.name;}
 const plan=planCommand(command,c);return{draft:d,status:plan.resultKind==='unsupported'?'unsupported':plan.actions.length?'ready':'needs-input',message:plan.message,...(!plan.actions.length&&plan.resultKind!=='unsupported'?{question:plan.message}:{}),plan};
}
export function describeConversation(state:ConversationState,c:AgentContext,mode:ConversationTurn['mode']='deterministic'):ConversationTurn{
 const tasks=state.drafts.map(d=>compile(d,c)),impacts=calculateAffordabilities(c,state.drafts);return{state,tasks,impacts,question:tasks.find(t=>t.question)?.question,impact:impacts[0]??null,mode,entities:{accounts:(c.accounts??[]).map(({id,name,currency})=>({id,name,currency})),recipients:(c.recipients??[]).filter(r=>r.verified).map(({id,name})=>({id,name})),products:(c.products??[]).map(({id,name})=>({id,name})),tuition:(c.tuition??[]).map(({id,name})=>({id,name})),cards:c.cards.map(({id,name})=>({id,name})),subscriptions:c.subscriptions.map(({id,name})=>({id,name}))}};
}
export function advanceConversation(state:ConversationState,update:ConversationUpdate,c:AgentContext,message:string,mode:ConversationTurn['mode']='deterministic'):ConversationTurn{
 if(state.expiresAt<Date.now())throw new Error('CONVERSATION_EXPIRED');if(state.messages.length>=40)throw new Error('CONVERSATION_LIMIT');
 if(update.removeIds.length&&!explicitWithdrawal(message))throw new Error('EXPLICIT_REMOVAL_REQUIRED');
 const drafts=structuredClone(state.drafts),touched=new Set<string>();
 for(const id of update.removeIds){const d=drafts.find(d=>d.id===id);if(!d||d.status!=='draft')throw new Error('INVALID_DRAFT');d.status='skipped';}
 for(const incoming of update.tasks){
  const matches=!incoming.id&&incoming.kind==='read'?state.drafts.filter(d=>d.status==='draft'&&d.kind==='read'&&canonicalReadQuery(d.query)===canonicalReadQuery(incoming.query)):!incoming.id&&incoming.mode==='plan'?state.drafts.filter(d=>d.status==='draft'&&d.mode==='plan'&&d.kind===incoming.kind&&normalizeMerchant(d.target)===normalizeMerchant(incoming.target)):[];
  const previous=incoming.id?drafts.find(d=>d.id===incoming.id):matches.length===1?drafts.find(d=>d.id===matches[0].id):undefined;
  const planning=['subscription_payment','cancel_subscription'].includes(incoming.kind)&&(incoming.mode==='plan'||isSubscriptionPlanningRequest(message)||previous?.mode==='plan');
  const u=planning?prepareSubscriptionPlan({...incoming,id:previous?.id??incoming.id},message,c,previous):{...incoming,id:previous?.id??incoming.id};
  if(u.kind==='read'&&/\b(fx|forex)\b/i.test(u.query)&&!/(\b(fx|forex|convert|exchange|currency)\b|汇率|外汇|换汇|兑换)/i.test(message))continue;
  const index=u.id?drafts.findIndex(d=>d.id===u.id):-1;if(u.id&&index===-1)throw new Error('UNKNOWN_DRAFT');
  if(index>=0){const old=drafts[index];if(old.status!=='draft')throw new Error('TASK_ALREADY_DECIDED');if(old.kind!==u.kind)throw new Error('INVALID_DRAFT');drafts[index]={...old,...u,reservation:old.amountMinor===u.amountMinor&&old.currency===u.currency&&old.target===u.target&&old.category===u.category?old.reservation:'ask'};}
  else drafts.push({...u,id:crypto.randomUUID(),status:'draft',reservation:'ask'});
  touched.add(drafts[index>=0?index:drafts.length-1].id);
 }
 // Answered reads live in their original messages, not in the unfinished financial-action queue.
 const currentDrafts=drafts.filter(d=>d.kind!=='read'||touched.has(d.id));
 if(currentDrafts.filter(d=>d.status==='draft'&&d.kind!=='read').length>6||currentDrafts.length>20)throw new Error('TASK_LIMIT');
 const next:ConversationState={...state,revision:state.revision+1,drafts:currentDrafts,messages:[...state.messages,{role:'user',content:message.slice(0,1000)}],expiresAt:Date.now()+1800000};
 const turn=describeConversation(next,c,mode);const currentTasks=turn.tasks.filter(t=>touched.has(t.draft.id)),question=currentTasks.find(t=>t.question)?.question;const answer=financialReply({...turn,tasks:currentTasks,impacts:update.tasks.some(t=>['affordability','transfer','investment','tuition','subscription_payment'].includes(t.kind))?turn.impacts:[]},/[\u3400-\u9fff]/.test(message),c);const text=answer?(answer+(question?'\n\n'+question:'')):question??((!currentTasks.length?update.reply?.trim():undefined)||(drafts.length?'Here’s what I found. Review the details below, and I’ll guide you through the next step.':'What would you like help with? Ask a question or choose a task to get started.'));
 const links=[...new Map(currentTasks.flatMap(t=>t.plan?.links??[]).map(l=>[l.href,l])).values()];
 // Store a bounded tool-result snapshot on this reply, so later turns cannot move or replace its evidence.
 const subscriptionPlan=currentTasks.find(t=>t.draft.kind==='read'&&/recurring|subscription|renewal|evidence/i.test(t.draft.query))?.plan;
 const subscriptionEvidence=subscriptionPlan?{asOf:subscriptionPlan.asOf,coverage:subscriptionPlan.coverage,candidateCount:subscriptionPlan.recurring.length,subscriptionCount:subscriptionPlan.subscriptions.length,candidates:subscriptionPlan.recurring.slice(0,3).map(r=>({merchant:r.merchant.slice(0,160),currency:r.currency,cadence:r.cadence,confidence:r.confidence,amountMinor:r.amountMinor,nextWindow:r.nextWindow,reasons:r.reasons.slice(0,3).map(s=>s.slice(0,160)),evidence:r.evidence.slice(-3).map(({id,date,amountMinor,currency})=>({id:id.slice(0,80),date,amountMinor,currency}))})),subscriptions:subscriptionPlan.subscriptions.slice(0,5).map(s=>({...s,name:s.name.slice(0,160),usage:s.usage.slice(0,160)}))}:undefined;
 const reply={role:'assistant' as const,content:text,...(links.length?{links}:{}),...(subscriptionEvidence?{subscriptionEvidence}:{})};
 // Preserve existing attachments rather than pruning history to fit the database limit.
 if(subscriptionEvidence&&new TextEncoder().encode(JSON.stringify({...next,messages:[...next.messages,reply]})).length>90000){delete reply.subscriptionEvidence;reply.content+='\nStart a new conversation to view fresh subscription evidence; this conversation is near its storage limit.';}
 next.messages.push(reply);
 // Pretty-printing overestimates JSONB's added separators; leave room below its 100KB check.
 assertConversationCapacity(next);
 return turn;
}

/** Money in assistant replies is formatted from validated tool results, never model prose. */
function financialReply(turn:ConversationTurn,chinese=false,c?:AgentContext):string|undefined{
 const planned=turn.tasks.filter(t=>t.draft.mode==='plan'&&['subscription_payment','cancel_subscription'].includes(t.draft.kind));
 if(planned.length){
  const planReply=chinese?['可以，我来帮你整理计划。',...planned.map(t=>{const d=t.draft,record=t.plan?.subscriptions[0];return d.target+'：'+(d.schedule||'日期待定')+'，'+(d.kind==='cancel_subscription'?'计划取消订阅。'+(record?'已记录费用 '+displayAmount(record.amountMinor,record.currency)+'；下次续费 '+(record.nextRenewal?.slice(0,10)||'未知')+'。':'请确认订阅名称。')+(!/^\d{4}-\d{2}-\d{2}$/.test(d.schedule)?'请提供具体取消日期。':''):'计划开通订阅。'+(d.amountMinor&&d.currency?'拟定费用 '+displayAmount(d.amountMinor,d.currency)+'。':'请提供套餐价格、币种和计费周期。'));}),'这只是计划，没有购买、取消或安排自动操作。'].join('\n\n'):['Yes, I can help you plan this.',...planned.map(t=>t.message),'No purchase or cancellation has been made, and no automatic future action has been scheduled.'].join('\n\n');
  const financial=financialReply({...turn,tasks:turn.tasks.filter(t=>!planned.includes(t))},chinese,c);
  return [planReply,financial].filter(Boolean).join('\n\n');
 }
 const impacts=turn.impacts??[];
 if(impacts.length){
  const budgetLines=impacts.filter(r=>r.budgetRemainingMinor!==null).map(r=>chinese?'方案后的月度预算余额：'+displayAmount(r.budgetRemainingMinor!,r.currency)+'。':'Recorded monthly budget remaining after this scenario: '+displayAmount(r.budgetRemainingMinor!,r.currency)+'.');
  const paymentExcluded=impacts.some(r=>r.limitations.some(l=>l.includes('unsupported payment is excluded')));
  const exclusionNotes=paymentExcluded?[chinese?'未明确纳入假设预留的商户付款未计入这些金额。':'Provider payments without an explicit hypothetical reservation are excluded.']:[];
  const short=impacts.some(r=>BigInt(r.cashRemainingMinor)<0n),overBudget=impacts.some(r=>r.budgetRemainingMinor!==null&&BigInt(r.budgetRemainingMinor)<0n);
  if(chinese){const intro=short?'这个方案存在现金不足。':overBudget?'现有现金够用，但会超出本月已记录的预算。':'已记录的现金可以覆盖这些金额。';return [intro,...impacts.map(r=>r.currency+'：可用 '+displayAmount(r.availableMinor,r.currency)+' − 计划支出 '+displayAmount(r.scenarioNeedsMinor,r.currency)+(BigInt(r.obligationsMinor)>0n?' − 待付学费 '+displayAmount(r.obligationsMinor,r.currency):'')+'，剩余 '+displayAmount(r.cashRemainingMinor,r.currency)+'。'),...budgetLines,...exclusionNotes,impacts.some(r=>r.budgetRemainingMinor===null)?'部分币种没有月度预算，只能确认现金是否足够。':'现金余额与预算是两回事：预算还需扣除本月已记录的消费。','按各币种分别计算，不自动换汇。数据日期：'+impacts[0].asOf.slice(0,10)+'。未记录的账单不在估算内，没有执行任何支付。'].join('\n\n');}
  const intro=short?'There is a cash shortfall in this scenario.':overBudget?'Your recorded cash covers this scenario, but it exceeds a recorded monthly budget.':'Your recorded cash covers these amounts.';
  const lines=impacts.map(r=>r.currency+': '+displayAmount(r.availableMinor,r.currency)+' available − '+displayAmount(r.scenarioNeedsMinor,r.currency)+' planned spending'+(BigInt(r.obligationsMinor)>0n?' − '+displayAmount(r.obligationsMinor,r.currency)+' outstanding tuition':'')+' leaves '+displayAmount(r.cashRemainingMinor,r.currency)+'.');
  return [intro,...lines,...budgetLines,...exclusionNotes,impacts.length>1?'Each currency is checked separately; no currency exchange is assumed.':'',impacts.some(r=>r.budgetRemainingMinor===null)?'A monthly budget is not recorded for every currency, so this confirms cash coverage only.':'', 'This uses the website’s recorded balances as of '+impacts[0].asOf.slice(0,10)+'. Unrecorded bills or future changes may affect the result. No money has moved.'].filter(Boolean).join('\n\n');
 }
 const actions=turn.tasks.flatMap(t=>t.plan?.actions??[]);if(actions.length)return (chinese?'请核对以下操作：':'Ready for your review:')+'\n'+actions.map(a=>a.description).join('\n')+(chinese?'\n尚未更改任何内容，需要明确确认。':'\nNothing has changed. Review and explicitly confirm the exact change before it can execute.');
 const reads=turn.tasks.filter(t=>t.draft.kind==='read'&&t.status==='ready'||t.status==='unsupported').map(t=>{
  if(chinese&&c&&t.draft.kind==='read'){
   const query=canonicalReadQuery(t.draft.query);
   if(query==='Show my balances')return '已记录的账户余额：\n'+(c.accounts??[]).map(a=>a.name+'：余额 '+displayAmount(a.balanceMinor,a.currency)+'，可用 '+displayAmount(a.availableMinor,a.currency)).join('\n');
   if(query==='Show my budgets')return '本月预算：\n'+(c.budgets??[]).map(b=>b.category+'：预算 '+displayAmount(b.limitMinor,b.currency)+'，已花费 '+(b.spentMinor?displayAmount(b.spentMinor,b.currency):'未知')).join('\n');
   if(t.draft.query==='Explain spending this month')return t.message.replace('Recorded consumption for ','已记录的消费月份：').replace(' across ','，共 ').replace(' settled charges. Transfers and investments excluded. Comparison with other periods requires sufficient history.',' 笔已结算消费。已排除转账和投资；比较其他期间需要足够历史记录。').replace('Insufficient data: no settled consumption charges in ','数据不足：该月没有已结算的消费记录，月份 ').replace(' History is truncated; totals cover only retrieved records.',' 历史记录不完整；总额仅涵盖已检索到的记录。');
  }
  return t.message;
 });return reads.length?reads.join('\n\n').slice(0,6000):undefined;
}
