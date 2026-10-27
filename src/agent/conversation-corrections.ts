import {normalizeMerchant,type AgentContext} from './contracts';
import type {ConversationState,ConversationUpdate,DraftUpdate} from './conversation-contracts';
/** Edits one unambiguous existing draft only; never creates authority or guesses a recipient. */
export function correctionUpdate(message:string,state:ConversationState,c?:AgentContext):ConversationUpdate|undefined{
 const clauses=message.trim().replace(/[.!。！]+$/,'').split(/\s+and\s+|，|,(?!\d)|并且/i);
 const amounts=clauses.map(s=>s.match(/^(?:please\s+)?(?:make\s+(?:that|it)|change\s+(?:that|it)(?:\s+amount)?\s+to)\s+(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(CNY|RMB|yuan|USD|SGD|IDR))?$/i));
 const sources=clauses.map(s=>s.match(/^(?:please\s+)?use\s+(?:(?:my|the)\s+)?(.+?)(?:\s+account)?$/i));
 if(sources.some(s=>s&&/\b(to|then|send|transfer|pay|buy|sell|freeze|unfreeze|set|change|cancel|purchase|order)\b/i.test(s[1])))return;
 if(!clauses.length||clauses.length>2||clauses.some((_,i)=>!amounts[i]&&!sources[i])||amounts.filter(Boolean).length>1||sources.filter(Boolean).length>1)return;
 const active=state.drafts.filter(d=>d.status==='draft'&&d.kind!=='read'),ask=(reply:string):ConversationUpdate=>({reply,tasks:[],removeIds:[]});
 if(active.length!==1)return ask(active.length?'Which draft should I update? Choose the task below or name it explicitly. Nothing has changed.':'There isn’t an unfinished task to update yet. Choose a task or tell me what you’d like to do.');
 const d=active[0],{id,kind,source,target,amountMinor,currency,category,mode,schedule,risk,query}=d;
 const update:DraftUpdate={id,kind,source,target,amountMinor,currency,category,mode,schedule,risk,query};
 const amount=amounts.find(Boolean);
 if(amount){
  if(!['transfer','budget','investment','affordability','subscription_payment'].includes(d.kind)&&!(d.kind==='card'&&d.mode==='limit'))return ask('This task does not have an editable payment amount. Use its task details to choose what to change.');
  const unit=amount[2]?.toUpperCase().replace(/YUAN|RMB/,'CNY')||d.currency;
  if(!['CNY','USD','IDR','SGD'].includes(unit))return ask('Which currency should I use for that amount? Nothing has changed.');
  if(['budget','investment','card'].includes(d.kind)&&unit!=='CNY')return ask('This task uses CNY. What amount in CNY would you like? The current draft has not changed.');
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(amount[1]))return ask('Please enter a valid positive amount, for example 300 or 1,000. Nothing has changed.');
  const [n,f='']=amount[1].replaceAll(',','').split('.');if(unit==='IDR'&&/[1-9]/.test(f))return ask('Use a whole-rupiah amount for IDR. Nothing has changed.');
  const minor=BigInt(n)*(unit==='IDR'?1n:100n)+(unit==='IDR'?0n:BigInt(f.padEnd(2,'0')));
  if(minor<=0n||minor>99999999999n)return ask('Enter a positive amount within the supported range. Nothing has changed.');
  update.currency=unit;update.amountMinor=String(minor);
 }
 const funding=sources.find(Boolean);
 if(funding){
  if(!['transfer','tuition','investment'].includes(d.kind))return ask('This task does not use a funding account. Use the task details to change it.');
  const name=normalizeMerchant(funding[1]),rows=(c?.accounts??[]).filter(a=>(!update.currency||a.currency===update.currency)&&(a.id===funding[1]||normalizeMerchant(a.name)===name||normalizeMerchant(a.name).split(' ').includes(name)));
  if(rows.length!==1)return ask('Which existing funding account should I use? Choose its full name in the task details. Nothing has changed.');
  update.source=rows[0].id;
 }
 return{tasks:[update],removeIds:[]};
}
