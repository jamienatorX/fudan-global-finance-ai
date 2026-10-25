import {normalisePlanDate} from './conversation-normalisation';
import {normalizeMerchant,displayAmount,type AgentContext} from './contracts';
import {planCommand} from './planner';
import type {ConversationTask,DraftTask,DraftUpdate} from './conversation-contracts';
export const isSubscriptionPlanningRequest=(message:string)=>/\b(can\s+(?:you|u)?\s*plan|help\s+(?:me|us)\s+plan|plan\s+(?:this|it|a|my)|make\s+(?:a\s+)?plan|planning)\b|^\s*(?:please\s+)?plan\b|计划|规划/i.test(message);
export function subscriptionPlanningTask(d:DraftTask,c:AgentContext):ConversationTask|null{
 if(d.mode!=='plan'||!['subscription_payment','cancel_subscription'].includes(d.kind))return null;
 const key=normalizeMerchant(d.target),matches=c.subscriptions.filter(s=>s.id===d.target||key&&(normalizeMerchant(s.name)===key||normalizeMerchant(s.name).split(' ').includes(key)||normalizeMerchant(s.name).replaceAll(' ','').startsWith(key.replaceAll(' ',''))));const record=matches.length===1?matches[0]:undefined;
 const name=record?.name||d.target||'Your subscription',when=d.schedule||'date to be chosen';let message='',needs=false;
 if(d.kind==='subscription_payment'){
  needs=!d.amountMinor||!d.currency||!d.schedule;
  message=name+' — '+when+': plan the signup with the provider. '+(d.amountMinor&&d.currency?'Proposed cost: '+displayAmount(d.amountMinor,d.currency)+'. ':'What is the plan price, currency, and billing cycle? ')+(!d.schedule?'Which signup date would you like? ':'')+'I can help review the cost; the purchase itself must be completed with the provider.';
 }else{
  const exact=/^\d{4}-\d{2}-\d{2}$/.test(d.schedule);needs=!record||!exact;
  message=name+' — '+when+': plan to cancel before the next renewal. '+(record?'The website records '+displayAmount(record.amountMinor,record.currency)+' / '+(record.cadence==='monthly'?'month':'year')+(record.nextRenewal?' and a renewal on '+record.nextRenewal.slice(0,10):'')+'. ':'I could not match one recorded membership; please confirm the subscription name. ')+(!exact?'What exact cancellation date would you like? Please choose a valid calendar day. ':'')+'This is a plan only; it does not schedule or perform cancellation.';
 }
 const plan=planCommand('Open subscriptions',c);plan.actions=[];plan.subscriptions=record?[record]:[];plan.message=message;plan.links=[{href:'/subscriptions',label:'Review subscriptions'}];
 return{draft:d,status:needs?'needs-input':'ready',message,plan};
}

/** Recover explicitly named merchants/dates without guessing a price or action. */
export function prepareSubscriptionPlan(task:DraftUpdate,message:string,c:AgentContext,previous?:DraftTask):DraftUpdate{
 const clauses=message.split(/\band\b|[,，;；]/i),cancel=task.kind==='cancel_subscription';
 const candidates=clauses.filter(s=>cancel?/\bcancel\b|取消/i.test(s):/\b(buy|subscribe|get)\b|购买|订阅/i.test(s));
 const hint=normaliseName(task.target||previous?.target||'');const clause=candidates.find(part=>hint&&normaliseName(part).includes(hint))||(candidates.length===1?candidates[0]:undefined);
 const match=clause?.match(cancel?/\bcancel\s+(?:my\s+)?(.+?)(?=\s+(?:membership|subscription|nextweek|next\s+week|tomorrow|tmrw|tmr)\b|$)/i:/\b(?:buy|subscribe\s+to|get)\s+(.+?)(?=\s+(?:account|subscription|membership|tomorrow|tmrw|tmr|nextweek|next\s+week)\b|$)/i);
 let target=match?.[1]?.trim()||task.target||previous?.target||'';
 if(target.length>80)target=task.target||previous?.target||'';
 const key=normalizeMerchant(target).replaceAll(' ','');const matches=key?c.subscriptions.filter(s=>s.id===target||normalizeMerchant(s.name).replaceAll(' ','').startsWith(key)):[];
 if(matches.length===1)target=matches[0].name;else if(/^spotify$/i.test(target))target='Spotify';
 const relative=clause?.match(/\b(tomorrow|tmrw|tmr|nextweek|next\s+week)\b/i)?.[0];
 const schedule=relative?(/^(tomorrow|tmrw|tmr)$/i.test(relative)?'tomorrow':'next week'):task.schedule||previous?.schedule||'';
 return{...task,target,schedule:normalisePlanDate(schedule),mode:'plan'};
}

const normaliseName=(s:string)=>normalizeMerchant(s).replaceAll(' ','');
