import {blankTask,type ConversationState,type ConversationUpdate} from './conversation-contracts';
/** Recover explicit multi-currency costs when the language service omits a leg.
 * Narrowly limited to read-only conditional questions; never creates authority. */
export function preserveScenarioCosts(message:string,state:ConversationState,update:ConversationUpdate):ConversationUpdate{
 if(!(/\bif\s+i\s+(spend|pay)\b|\b(can|could|would)\s+i\s+(still\s+)?(afford|pay|spend)\b|如果/.test(message.toLowerCase()))||/\b(transfer|send|freeze|unfreeze|cancel|buy|sell|redeem|set|change)\b/i.test(message))return update;
 const costs=[...message.matchAll(/\b(?:(CNY|RMB|IDR|SGD|USD)\s*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(CNY|RMB|IDR|SGD|USD))\b/gi)].map(m=>({currency:(m[1]??m[4]).toUpperCase().replace('RMB','CNY'),amount:m[2]??m[3]}));
 if(new Set(costs.map(c=>c.currency)).size<2||costs.length>6)return update;
 const used=new Set<string>();
 const tasks=costs.map(c=>{
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(c.amount))throw new Error('INVALID_DRAFT');
  const [whole,fraction='']=c.amount.replaceAll(',','').split('.');
  if(c.currency==='IDR'&&Number(fraction)!==0&&fraction)throw new Error('INVALID_DRAFT');
  const minor=c.currency==='IDR'?BigInt(whole):BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
  if(minor<=0n||minor>99999999999n)throw new Error('INVALID_DRAFT');
  const candidates=state.drafts.filter(d=>d.kind==='affordability'&&d.status==='draft'&&d.currency===c.currency&&!used.has(d.id));const old=candidates.find(d=>d.amountMinor===String(minor))??candidates[0];if(old)used.add(old.id);
  return{...blankTask('affordability'),id:old?.id??'',currency:c.currency,amountMinor:String(minor),query:message};
 });
 return{tasks,removeIds:[],reply:update.reply};
}
