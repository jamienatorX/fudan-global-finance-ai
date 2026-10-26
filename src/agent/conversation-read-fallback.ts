import {isSubscriptionPlanningRequest} from './subscription-planning';
import {normalisePlanDate} from './conversation-normalisation';
import {normalizeMerchant,type AgentContext} from './contracts';
import {blankTask,type ConversationState,type ConversationUpdate,type DraftTask,type DraftUpdate} from './conversation-contracts';
import {canonicalReadQuery} from './conversation-normalisation';
import {preserveScenarioCosts} from './scenario-language';
/** Only explicit information requests and hypothetical calculations bypass the model. */
export function readOnlyConversationUpdate(message:string,state:ConversationState,c?:AgentContext):ConversationUpdate|undefined{
 const empty={tasks:[],removeIds:[]};
 // A narrow local parser must not accept a supported clause while silently losing another change.
 const requested=message.replace(/\b(?:do not|don't)\s+(?:pay|cancel|transfer|make (?:any )?changes)(?:\s+anything)?(?:\s+yet)?\b|不要转账|不需要转账|不转账/gi,'');
 if(/\b(send|transfer|increase|decrease|raise|lower|adjust|withdraw|redeem|sell|delete|close|apply|order|remind|purchase)\b|转账|支付|调高|提高|降低|减少|赎回|卖出|删除|销户|申请|提醒|冻结|设置|修改/i.test(requested))return;
 const planning=explicitPlanUpdate(message,state,c);if(planning)return planning;
 if(/\b(do not|don't|no longer)\s+cancel\b|不要取消/i.test(message)){
  if(/\band\b|\bthen\b|\bor\b|[,;，；]|并|然后/i.test(message)||/\b(freeze|unfreeze|buy|set|change|pay|purchase)\b|冻结|购买|设置|修改/i.test(requested))return;
  const candidates=state.drafts.filter(d=>d.status==='draft'&&d.kind==='cancel_subscription');
  const named=candidates.filter(d=>{const name=c?.subscriptions.find(s=>s.id===d.target)?.name||d.target;const first=normalizeMerchant(name).split(' ')[0];return first.length>=3&&normalizeMerchant(message).includes(first);});
  const selected=named.length===1?named[0]:candidates.length===1?candidates[0]:undefined;
  if(selected)return{...empty,removeIds:[selected.id],reply:/[\u3400-\u9fff]/.test(message)?'已从计划中移除取消操作，会员订阅没有被取消。':'Removed that cancellation from your plan. Your membership has not been cancelled.'};
 }

 if(/(?:explain|what).*(?:freezing|freeze)|冻结.*(?:意思|作用)/i.test(message)&&/just|do not change|不.*操作|解释/i.test(message))return{...empty,reply:/[\u3400-\u9fff]/.test(message)?'冻结会更改所选卡片的冻结状态，不会关闭账户或取消订阅。真实定期扣款如何处理取决于发卡机构。尚未更改任何内容。':'Freezing changes the selected card’s frozen status. It does not close the account or cancel subscriptions. Real recurring-payment rules depend on the card issuer. Nothing has changed.',removeIds:/do not change|不要.*操作/i.test(message)?state.drafts.filter(d=>d.status==='draft'&&!['read','affordability'].includes(d.kind)).map(d=>d.id):[]};
 try{const multiple=preserveScenarioCosts(message,state,empty);if(multiple.tasks.length)return multiple;}catch{return;}
 const actionText=message.replace(/不要转账|不需要转账|不转账|do not transfer|don't transfer|no transfers/gi,'');
 if(/\b(send|transfer|buy|cancel|freeze|unfreeze|set|change|plan|pay|withdraw|increase|decrease|raise|lower|adjust|redeem|sell|subscribe|delete|close|apply|order)\b|转账|支付|购买|取消|冻结|修改|计划|设置|调高|提高|降低|减少|赎回|卖出|删除|销户|申请/i.test(actionText))return;
 if(/\b(recurring|subscriptions?|renewals?)\b|订阅|续费|定期扣款/i.test(message)&&/\b(find|show|list|what|which|check|view|detect|evidence|confidence)\b|查看|查找|有哪些|证据|置信|订阅/i.test(message)){
  const remainder=message.replace(/\b(?:please|find|show|list|what|which|are|is|do|i|have|can|you|check|view|detect|my|me|recurring|payments?|charges?|subscriptions?|renewals?|and|with|the|their|confidence|supporting|settled|transactions?|evidence|reasons|cancellation|capability|capabilities|renewal|dates?)\b/gi,'').replace(/请|帮我|查看|查找|显示|列出|检测|我的|订阅|续费|定期扣款|置信度|证据|交易|支持|和|及|有哪些/g,'').replace(/[\s.,!?，。？！、:：]/g,'');
  if(remainder)return; // Unaccounted-for words may be another task: leave the whole request to the interpreter.
  return{tasks:[{...blankTask('read'),query:'Find recurring payments'}],removeIds:[]};
 }
 const spend=message.match(/\b(?:can|could).*?\b(?:spend|afford)\b.*?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:yuan|rmb|cny)\b/i)||message.match(/(?:还能|可以).*?(\d[\d,]*(?:\.\d{1,2})?)\s*元/);
 if(spend&&!/\b(IDR|SGD|USD)\b/i.test(message)){
  const raw=spend[1];if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw))return;
  const [n,f='']=raw.replaceAll(',','').split('.'),amount=BigInt(n)*100n+BigInt(f.padEnd(2,'0'));if(amount<=0n||amount>99999999999n)return;
  const existing=state.drafts.filter(d=>d.status==='draft'&&d.kind==='affordability'&&d.currency==='CNY');if(existing.length>1)return;
  return{tasks:[{...blankTask('affordability'),id:existing[0]?.id??'',currency:'CNY',amountMinor:String(amount),query:message}],removeIds:[]};
 }
 if(!/\b(show|list|what|where|how|check|view|explain)\b|余额|预算|汇率|学费/i.test(message))return;
 const canonical=canonicalReadQuery(message);if(canonical===message&&!['Show my balances','Show my budgets','Show investment products','Show my tuition','Open fx'].includes(canonical))return;
 const remainder=message.replace(/\b(?:please|show|list|what|where|how|check|view|explain|are|is|do|i|have|can|you|my|me|the|this|current|available|recorded|total|daily|savings|bank|balances?|accounts?|much|money|budgets?|investment|products?|investments?|portfolio|holdings|tuition|fx|forex|exchange|rates?|currency|conversion|cny|rmb|yuan|sgd|usd|idr|and|for|in)\b/gi,'').replace(/请|帮我|查看|显示|列出|我的|账户|余额|预算|汇率|换汇|外汇|学费|投资产品|有哪些|多少|和|及/g,'').replace(/[\s.,!?，。？！、:：]/g,'');
 if(remainder)return;
 const families=[/\b(balances?|accounts?|how much money)\b|余额/i,/\bbudgets?\b|预算/i,/\b(products?|investments?|portfolio|holdings)\b|投资产品/i,/\btuition\b|学费/i,/\b(fx|forex|exchange|currency)\b|汇率|换汇|外汇/i].filter(pattern=>pattern.test(message));if(families.length!==1)return;
 return{tasks:[{...blankTask('read'),query:canonical}],removeIds:[]};
}

function minor(value:string,currency:string):string|undefined{
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value))return;
 const [whole,fraction='']=value.replaceAll(',','').split('.');if(currency==='IDR'&&Number(fraction)!==0)return;
 const n=currency==='IDR'?BigInt(whole):BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return n>0n&&n<=99999999999n?String(n):undefined;
}
function editable(d:DraftTask):DraftUpdate{const{id,kind,source,target,amountMinor,currency,category,mode,schedule,risk,query}=d;return{id,kind,source,target,amountMinor,currency,category,mode,schedule,risk,query};}
function explicitPlanUpdate(message:string,state:ConversationState,c?:AgentContext):ConversationUpdate|undefined{
 if(/\bpay\b/i.test(message.replace(/\b(?:do not|don't)\s+pay\b/gi,'')))return;
 if(/\bthen\b/i.test(message))return;
 if(/\b(send|transfer|freeze|unfreeze|shares?|stocks?|bonds?|invest|equity|loan|tuition)\b/i.test(message))return;
 const clauses=message.split(/\band\b|[,，;；]/i),active=state.drafts.filter(d=>d.status==='draft'&&d.mode==='plan');
 if(isSubscriptionPlanningRequest(message)){
  const tasks:DraftUpdate[]=[];
  for(const clause of clauses){
   const cancel=/\bcancel\b/i.test(clause),m=clause.match(cancel?/\bcancel\s+(?:my\s+)?(.+?)(?=\s+(?:membership|subscription|nextweek|next\s+week|tomorrow|tmrw|tmr)\b|[.!?]|$)/i:/\b(?:buy|subscribe\s+to|get)\s+(.+?)(?=\s+(?:account|subscription|membership|tomorrow|tmrw|tmr|nextweek|next\s+week)\b|[.!?]|$)/i);
   const planned=m||(!cancel?clause.match(/\bplan\s+(.+?)\s+(?:for\s+)?(?=tomorrow\b|tmrw\b|tmr\b|nextweek\b|next\s+week\b)/i):null);if(!planned){if(!clause.trim()||/^\s*(?:(?:please|can you|could you|help me)\s+)?(?:plan (?:this|a new plan)|do not (?:pay|cancel|make (?:any )?changes)|no changes)(?:\s+yet)?[.!?]*\s*$/i.test(clause))continue;return;}const target=planned[1].trim();if(!target||target.length>80)return;
   const known=['Spotify','Netflix',...(c?.subscriptions.map(s=>s.name)??[]),...active.map(d=>d.target)];
   if(!/subscription|membership|account|subscribe/i.test(clause)&&!known.some(name=>normalizeMerchant(name).replaceAll(' ','').startsWith(normalizeMerchant(target).replaceAll(' ',''))))return;
   const kind=cancel?'cancel_subscription':'subscription_payment',old=active.filter(d=>d.kind===kind&&normalizeMerchant(d.target)===normalizeMerchant(target));
   const schedule=clause.match(/\b(tomorrow|tmrw|tmr|nextweek|next\s+week)\b/i)?.[0]??'';
   tasks.push({...blankTask(kind),id:old.length===1?old[0].id:'',target,mode:'plan',schedule,query:clause.trim()});
  }
  if(tasks.length&&tasks.length<=6)return{tasks,removeIds:[]};
 }
 const updates:DraftUpdate[]=[];
 for(const clause of clauses){
  const matched=active.filter(d=>{const key=normalizeMerchant(d.target).replaceAll(' ','');return key&&normalizeMerchant(clause).replaceAll(' ','').includes(key);});if(matched.length!==1)continue;
  const date=clause.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b|\b\d{4}-\d{2}-\d{2}\b/i)?.[0];
  const cost=clause.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*(CNY|IDR|SGD|USD|yuan)\b/i);
  if(!date&&!cost)continue;const d=editable(matched[0]);if(date)d.schedule=normalisePlanDate(date);
  if(cost){const currency=cost[2].toUpperCase().replace('YUAN','CNY'),amount=minor(cost[1],currency);if(!amount)return;d.currency=currency;d.amountMinor=amount;}
  d.query=clause.trim();updates.push(d);
 }
 return updates.length?{tasks:updates,removeIds:[]}:undefined;
}
