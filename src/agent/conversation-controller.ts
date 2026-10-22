import {normalizeMerchant,displayAmount,type AgentContext} from './contracts';
import {planCommand} from './planner';
import {calculateAffordability} from './affordability';
import {UNSUPPORTED_MESSAGE} from './support';
import type {ConversationState,ConversationTask,ConversationTurn,ConversationUpdate,DraftTask} from './conversation-contracts';
function resolve<T extends {id:string;name:string}>(rows:readonly T[],query:string):T|undefined{
 if(!query)return;const exact=rows.filter(r=>r.id===query||normalizeMerchant(r.name)===normalizeMerchant(query));if(exact.length===1)return exact[0];
 const partial=rows.filter(r=>normalizeMerchant(r.name).split(' ').includes(normalizeMerchant(query)));return partial.length===1?partial[0]:undefined;
}
function compile(d:DraftTask,c:AgentContext):ConversationTask{
 const need=(question:string):ConversationTask=>({draft:d,status:'needs-input',message:'Nothing has changed.',question});
 if(d.status!=='draft')return{draft:d,status:d.status,message:d.receipt?'Original receipt: '+d.receipt.status+(d.receipt.verified?' · verified':''):'Task '+d.status+'.'};
 if(d.kind==='subscription_payment'||d.kind==='unsupported')return{draft:d,status:'unsupported',message:UNSUPPORTED_MESSAGE+(d.kind==='subscription_payment'?' Subscription payment is unavailable; you can explicitly include this cost as a hypothetical reservation.':'')};
 if(d.kind==='affordability')return !d.amountMinor||!d.currency?need('How much extra would you like to spend, and in which currency?'):{draft:d,status:'ready',message:'Read-only scenario calculation. No additional spending will be executed.'};
 let command='';const accounts=(c.accounts??[]).filter(a=>!d.currency||a.currency===d.currency),source=resolve(accounts,d.source);
 const target=resolve([...(c.accounts??[]),...(c.recipients??[]).filter(r=>r.verified)],d.target);
 if(d.kind==='read'){command=d.query||'Show my balances';const p=planCommand(command,c);if(p.actions.length)return need('Choose a read-only information task. Changes require a separate action draft.');return{draft:d,status:p.resultKind==='unsupported'?'unsupported':'ready',message:p.message,plan:p};}
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
 if(d.kind==='card'){const card=resolve(c.cards,d.target);if(!card)return need('Which card should I change?');if(!['freeze','unfreeze','limit'].includes(d.mode))return need('Should I freeze, unfreeze or change its monthly limit?');if(d.mode==='limit'&&!d.amountMinor)return need('What new monthly limit in CNY should I use?');command=d.mode==='limit'?`Set ${card.name} card monthly limit to ${displayAmount(d.amountMinor,'CNY')}`:`${d.mode==='freeze'?'Freeze':'Unfreeze'} ${card.name} card`;}
 if(d.kind==='cancel_subscription'){const s=resolve(c.subscriptions,d.target);if(!s)return need('Which registered subscription would you like to cancel?');command='Cancel '+s.name;}
 const plan=planCommand(command,c);return{draft:d,status:plan.resultKind==='unsupported'?'unsupported':plan.actions.length?'ready':'needs-input',message:plan.message,...(!plan.actions.length&&plan.resultKind!=='unsupported'?{question:plan.message}:{}),plan};
}
export function describeConversation(state:ConversationState,c:AgentContext,mode:ConversationTurn['mode']='deterministic'):ConversationTurn{
 const tasks=state.drafts.map(d=>compile(d,c));return{state,tasks,question:tasks.find(t=>t.question)?.question,impact:calculateAffordability(c,state.drafts),mode,entities:{accounts:(c.accounts??[]).map(({id,name,currency})=>({id,name,currency})),recipients:(c.recipients??[]).filter(r=>r.verified).map(({id,name})=>({id,name})),products:(c.products??[]).map(({id,name})=>({id,name})),tuition:(c.tuition??[]).map(({id,name})=>({id,name})),cards:c.cards.map(({id,name})=>({id,name})),subscriptions:c.subscriptions.map(({id,name})=>({id,name}))}};
}
export function advanceConversation(state:ConversationState,update:ConversationUpdate,c:AgentContext,message:string,mode:ConversationTurn['mode']='deterministic'):ConversationTurn{
 if(state.expiresAt<Date.now())throw new Error('CONVERSATION_EXPIRED');if(state.messages.length>=40)throw new Error('CONVERSATION_LIMIT');
 if(update.removeIds.length&&!/\b(skip|remove|forget|drop|cancel request)\b|跳过|取消|不要/.test(message.toLowerCase()))throw new Error('EXPLICIT_REMOVAL_REQUIRED');
 const drafts=structuredClone(state.drafts);
 for(const id of update.removeIds){const d=drafts.find(d=>d.id===id);if(!d||d.status!=='draft')throw new Error('INVALID_DRAFT');d.status='skipped';}
 for(const u of update.tasks){
  const index=u.id?drafts.findIndex(d=>d.id===u.id):-1;if(u.id&&index===-1)throw new Error('UNKNOWN_DRAFT');
  if(index>=0){const old=drafts[index];if(old.status!=='draft')throw new Error('TASK_ALREADY_DECIDED');if(old.kind!==u.kind)throw new Error('INVALID_DRAFT');drafts[index]={...old,...u,reservation:old.amountMinor===u.amountMinor&&old.currency===u.currency&&old.target===u.target&&old.category===u.category?old.reservation:'ask'};}
  else drafts.push({...u,id:crypto.randomUUID(),status:'draft',reservation:'ask'});
 }
 if(drafts.filter(d=>d.status==='draft').length>6||drafts.length>20)throw new Error('TASK_LIMIT');
 const next:ConversationState={...state,revision:state.revision+1,drafts,messages:[...state.messages,{role:'user',content:message.slice(0,1000)}],expiresAt:Date.now()+1800000};
 const turn=describeConversation(next,c,mode);const text=turn.question??((!drafts.length?update.reply?.trim():undefined)||(drafts.length?'Here’s what I found. Review the details below, and I’ll guide you through the next step.':'What would you like help with? Ask a question or choose a task to get started.'));
 next.messages.push({role:'assistant',content:text});return turn;
}
