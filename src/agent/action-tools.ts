import {displayAmount,normalizeMerchant,type AgentContext,type AgentPlanResult,type Proposal} from './contracts';
import {parseMajorAmount} from '../features/demo/planning-helpers';
import type {CurrencyCode} from '../domain/currency';
import {UNSUPPORTED_MESSAGE} from './support';
const ranks:Record<string,number>={low:0,medium:1,high:2};
export function planAction(command:string,c:AgentContext):Partial<AgentPlanResult>|null {
 const text=command.trim();
 if(!/^(?:transfer|send|pay|set\s+\w+\s+budget|buy|redeem)\b/i.test(text))return null;
 const need=(message:string):Partial<AgentPlanResult>=>({resultKind:'needs-input',message,actions:[]});
 const propose=(description:string,payload:Proposal):Partial<AgentPlanResult>=>({resultKind:'proposal',message:'Review the exact simulated change. Nothing has changed yet.',actions:[{id:crypto.randomUUID(),description,payload}]});
 const find=<T extends {name:string}>(rows:readonly T[],name:string):T|undefined=>{const matches=rows.filter(r=>normalizeMerchant(r.name)===normalizeMerchant(name));return matches.length===1?matches[0]:undefined;};
 const amount=(raw:string,currency:string,max=99999999999n)=>{const value=parseMajorAmount(raw.replaceAll(',',''),currency as CurrencyCode);if(BigInt(value)>max)throw new Error('Amount exceeds the supported simulation limit.');return value;};
 try{
  if(/^(transfer|send)\b/i.test(text)){
   const m=text.match(/^(?:transfer|send)\s+(CNY|USD|IDR|SGD)\s+([\d,.]+)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+on\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})))?$/i);
   if(!m)return need('Specify currency, amount, source and destination: Transfer CNY 10 from daily CNY to savings CNY. For a demo schedule append “on 2027-01-01T12:00+08:00”.');
   const source=find(c.accounts??[],m[3]),dest=find(c.accounts??[],m[4]),recipient=(()=>{const q=normalizeMerchant(m[4]),matches=(c.recipients??[]).filter(r=>[r.name,r.phone,r.remark].filter(Boolean).some(n=>normalizeMerchant(n!)===q));return matches.length===1?matches[0]:undefined;})();
   if(!source)return need('Specify one exact source account: '+(c.accounts??[]).map(a=>a.name).join(', '));
   if(!dest&&!recipient){if(!c.source.startsWith('browser-local'))return{resultKind:'unsupported',message:UNSUPPORTED_MESSAGE};return need('Specify an exact owned account or verified recipient: '+[...(c.accounts??[]),...(c.recipients??[])].map(a=>a.name).join(', '));}
   if(source.currency!==m[1].toUpperCase()||dest&&(dest.currency!==source.currency||dest.id===source.id)||recipient&&(!recipient.verified||!recipient.currencies.includes(source.currency)))return need('Choose distinct same-currency accounts or a verified recipient supporting the source currency.');
   const minor=amount(m[2],source.currency),scheduled=m[5]?new Date(m[5]):null;
   if(scheduled&&(!Number.isFinite(scheduled.getTime())||scheduled.getTime()<=Date.now()))return need('Choose a valid future schedule with an explicit timezone.');
   if(!scheduled&&BigInt(source.availableMinor)<BigInt(minor))return need('Insufficient available funds. No change has been made.');
   return propose(`Transfer ${displayAmount(minor,source.currency)} from ${source.name} to ${dest?.name??recipient!.name}${scheduled?' on '+scheduled.toISOString()+'; no funds debited until execution; daily permissions are rechecked':''}. Simulated only.`,{type:'transfer',sourceId:source.id,amountMinor:minor,...(dest?{destinationId:dest.id}:{beneficiaryId:recipient!.id}),...(scheduled?{scheduledAt:scheduled.toISOString(),...(!c.source.startsWith('browser-local')?{mode:'schedule'}:{})}:{})});
  }
  const budget=text.match(/^set\s+(rent|food|transportation|shopping|other)\s+budget\s+to\s+CNY\s+([\d,.]+)$/i);
  if(budget){if(!c.budgets?.some(b=>b.category===budget[1].toLowerCase()&&b.currency==='CNY'))return need('That CNY budget category is unavailable.');const minor=amount(budget[2],'CNY',9999999999n);return propose(`Set ${budget[1].toLowerCase()} monthly budget to ${displayAmount(minor,'CNY')}.`,{type:'budget',category:budget[1].toLowerCase(),limitMinor:minor});}
  if(/^pay\b/i.test(text)){
   const m=text.match(/^pay\s+(.+?)\s+from\s+(.+)$/i),t=m&&find(c.tuition??[],m[1]),a=m&&find(c.accounts??[],m[2]);
   if(!t||!a)return need('Name an unpaid obligation and source: Pay '+(c.tuition?.[0]?.name??'<tuition obligation>')+' from '+(c.accounts?.find(a=>a.currency==='CNY')?.name??'<account>')+'.');
   if(t.paid||BigInt(t.outstandingMinor)<=0n||t.currency!==a.currency||BigInt(a.availableMinor)<BigInt(t.outstandingMinor))return need('Tuition is paid, the currency differs, or available funds are insufficient. Nothing has changed.');
   return propose(`Pay the full outstanding ${displayAmount(t.outstandingMinor,t.currency)} for ${t.name} from ${a.name}. Simulated payment only.`,{type:'tuition',sourceId:a.id,tuitionId:t.id});
  }
  const investment=text.match(/^(buy|redeem)\s+CNY\s+([\d,.]+)\s+of\s+(.+?)\s+from\s+(.+?)(?:\s+with\s+(low|medium|high)\s+risk tolerance)?$/i);
  if(investment){const [,direction,raw,name,account,risk]=investment,p=find(c.products??[],name),a=find(c.accounts??[],account);
   if(!p||!a||a.currency!=='CNY')return need('Specify an exact fictional product and CNY account. List investment products and accounts first.');
   if(direction.toLowerCase()==='buy'&&(!risk||!(p.risk in ranks)||ranks[p.risk]>ranks[risk.toLowerCase()]))return need('State a risk tolerance (low, medium or high) sufficient for this fictional product. No order was created.');
   const minor=amount(raw,'CNY'),holding=c.holdings?.find(h=>h.productId===p.id);
   if(direction.toLowerCase()==='buy'?BigInt(a.availableMinor)<BigInt(minor):BigInt(holding?.valueMinor??'0')<BigInt(minor))return need('Insufficient available funds or holdings. No order was created.');
   return propose(`${direction.toLowerCase()==='buy'?'Buy':'Redeem'} ${displayAmount(minor,'CNY')} of ${p.name} using ${a.name}. ${p.risk} risk; fees ${p.fees}; liquidity ${p.liquidity}. Fictional order; no guaranteed returns.`,{type:'investment',productId:p.id,sourceId:a.id,direction:direction.toLowerCase(),amountMinor:minor,...(risk?{riskTolerance:risk.toLowerCase()}:{})});
  }
  return need('Specify the exact task fields. Examples: Set food budget to CNY 500; Buy CNY 100 of <product> from <account> with low risk tolerance.');
 }catch(e){return need(e instanceof Error?e.message:'Invalid amount.');}
}
