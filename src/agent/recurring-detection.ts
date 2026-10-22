import { normalizeMerchant, type AgentContext, type AgentTransaction, type RecurringCandidate } from './contracts';
const DAY=86400000;
function advance(date:Date,months:number):Date {
 const target=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+months,1));
 const end=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
 target.setUTCDate(Math.min(date.getUTCDate(),end));return target;
}
/** Heuristic recurrence from settled debits only; metadata does not establish evidence. */
export function detectRecurring(context:AgentContext):RecurringCandidate[] {
 const groups=new Map<string,AgentTransaction[]>(),seen=new Set<string>();
 for(const t of context.transactions){
  if(seen.has(t.id)||!t.settled||t.direction!=='debit'||t.classification!=='consumption'||!/^\d+$/.test(t.amountMinor)||BigInt(t.amountMinor)<=0n||!Number.isFinite(Date.parse(t.date)))continue;
  seen.add(t.id);const merchant=normalizeMerchant(t.merchant);if(!merchant)continue;
  const key=JSON.stringify([t.accountId,t.currency,merchant]);groups.set(key,[...(groups.get(key)??[]),t]);
 }
 const found:RecurringCandidate[]=[];
 for(const rows of groups.values()){
  const evidence=rows.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));if(evidence.length<2)continue;
  const dates=evidence.map(t=>new Date(t.date)),first=dates[0];
  let cadence:RecurringCandidate['cadence']|null=null,missing=false;
  for(const trial of ['weekly','monthly','yearly'] as const){
   let valid=true,gap=false;
   for(let i=1;i<dates.length;i++){
    const prev=dates[i-1],now=dates[i];
    const monthDelta=(now.getUTCFullYear()-prev.getUTCFullYear())*12+now.getUTCMonth()-prev.getUTCMonth();
    const multiple=trial==='weekly'?Math.round((+now-+prev)/DAY/7):trial==='monthly'?monthDelta:Math.round(monthDelta/12);
    const expected=trial==='weekly'?new Date(+prev+multiple*7*DAY):advance(prev,multiple*(trial==='yearly'?12:1));
    const tolerance=trial==='weekly'?1:3;
    if(multiple<1||multiple>2||Math.abs(+now-+expected)>tolerance*DAY){valid=false;break;}if(multiple>1)gap=true;
   }
   if(valid){cadence=trial;missing=gap;break;}
  }
  if(!cadence)continue;
  const amounts=evidence.map(t=>BigInt(t.amountMinor)).sort((a,b)=>a<b?-1:a>b?1:0);
  const median=amounts[Math.floor(amounts.length/2)],variable=(amounts.at(-1)!-amounts[0])*100n>median*10n;
  const high=evidence.length>=3&&!missing&&!variable&&!context.coverage.truncated;
  const last=dates.at(-1)!,next=cadence==='weekly'?new Date(+last+7*DAY):advance(last,cadence==='monthly'?1:12);
  const stale=+next+3*DAY<Date.parse(context.asOf);
  found.push({merchant:evidence[0].merchant,accountId:evidence[0].accountId,currency:evidence[0].currency,cadence,confidence:high&&!stale?'high':'possible',amountMinor:median.toString(),evidence,
   reasons:[`${evidence.length} settled charges between ${first.toISOString().slice(0,10)} and ${last.toISOString().slice(0,10)}`,`${cadence} date pattern (heuristic, not a probability)`,...(missing?['Missing expected period']:[]),...(variable?['Amounts vary by more than 10%']:[]),...(context.coverage.truncated?['History is incomplete']:[]),...(stale?['Expected renewal has passed; current status unknown']:[])],
   nextWindow:{from:new Date(+next-3*DAY).toISOString().slice(0,10),to:new Date(+next+3*DAY).toISOString().slice(0,10)}});
 }
 return found;
}
