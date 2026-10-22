import {FEATURES} from './capabilities';
import {displayAmount,normalizeMerchant,type AgentContext,type AgentPlanResult} from './contracts';
export function planRead(command:string,c:AgentContext):Partial<AgentPlanResult>|null {
 const text=command.trim(),s=text.toLowerCase();
 const answer=(message:string):Partial<AgentPlanResult>=>({resultKind:'answer',message});
 if(/^(open|go to|show me the)\s+/i.test(text)){
  const q=normalizeMerchant(text.replace(/^(open|go to|show me the)\s+/i,''));
  const aliases:Record<string,string>={security:'/security',csv:'/transactions','csv preview':'/transactions',investments:'/wealth',budget:'/planner',tuition:'/planner','banking agent':'/copilot'};
  const feature=FEATURES.find(f=>normalizeMerchant(f.name)===q||f.path.slice(1)===q);
  const path=feature?.path??aliases[q];if(path)return{resultKind:'handoff',message:'Open the existing '+(feature?.name??q)+' workflow. No banking change has been made.',links:[{href:path,label:'Open '+(feature?.name??q)}]};
 }
 if(/\b(password|mfa|authenticator|sign out|log out|reset|revoke|csv|upload)\b/.test(s))return{resultKind:'handoff',message:'Use the dedicated workflow below for this request. Its existing checks and confirmations still apply. No data has been changed or uploaded.',links:[{href:/csv|upload/.test(s)?'/transactions':/reset/.test(s)&&c.source.startsWith('browser-local')?'/settings':'/security',label:/csv|upload/.test(s)?'Open CSV preview':/reset/.test(s)&&c.source.startsWith('browser-local')?'Open Settings':'Open Security'}]};
 if(!/^(show|list|what|how|explain|find|search|summari[sz]e|check|view)\b/.test(s))return null;
 if(/\b(accounts?|balances?|overview)\b/.test(s)&&!s.includes('transfer'))return answer((c.accounts??[]).map(a=>`${a.name}: balance ${displayAmount(a.balanceMinor,a.currency)}, available ${displayAmount(a.availableMinor,a.currency)}${a.goalMinor?', goal '+displayAmount(a.goalMinor,a.currency):''}`).join('\n')||'No account data is available.');
 if(/\b(budget|budgets|runway)\b/.test(s)){
  let message=(c.budgets??[]).map(b=>`${b.category}: monthly cap ${displayAmount(b.limitMinor,b.currency)}${b.spentMinor?', recorded spending '+displayAmount(b.spentMinor,b.currency):'; spending not supplied'}`).join('\n')||'No budget data is available.';
  if(s.includes('runway')){const a=(c.accounts??[]).filter(a=>a.currency==='CNY').reduce((n,a)=>n+BigInt(a.availableMinor),0n),due=(c.tuition??[]).filter(t=>t.currency==='CNY'&&!t.paid).reduce((n,t)=>n+BigInt(t.outstandingMinor),0n),cap=(c.budgets??[]).filter(b=>b.currency==='CNY').reduce((n,b)=>n+BigInt(b.limitMinor),0n);message+=`\nCNY-only runway estimate after recorded tuition: ${cap>0n?Math.max(0,Number((a-due)*10n/cap)/10)+' months':'not calculable'}. Assumes monthly caps are spent; other currencies and unrecorded costs excluded.`;}return answer(message);
 }
 if(/\btuition\b/.test(s))return answer((c.tuition??[]).map(t=>`${t.name}: ${t.paid?'paid':'outstanding '+displayAmount(t.outstandingMinor,t.currency)}`).join('\n')||'No tuition data is available.');
 if(/\b(products?|investments?|holdings|portfolio|wealth)\b/.test(s))return answer((c.products??[]).map(p=>`${p.name}: fictional, ${p.risk} risk, fee ${p.fees}, liquidity ${p.liquidity}; holding ${displayAmount(c.holdings?.find(h=>h.productId===p.id)?.valueMinor??'0','CNY')}`).join('\n')||'No investment data is available.');
 if(/\b(audit|activity|notifications?|receipts?|transfer history)\b/.test(s))return answer((c.activityCoverage??'Available activity only')+'\n'+((c.activity??[]).toSorted((a,b)=>b.date.localeCompare(a.date)).slice(0,20).map(a=>`${a.date}: ${a.label} (${a.id})`).join('\n')||'No recorded activity.'));
 if(/\btransactions?\b/.test(s)){
  const range=s.match(/\bfrom\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})\b/);
  if(range&&(![range[1],range[2]].every(d=>Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d)||range[1]>range[2]))return{resultKind:'needs-input',message:'Choose valid ordered dates: from YYYY-MM-DD to YYYY-MM-DD.'};
  const stripped=s.replace(/\s+from\s+\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}/,'').replace(/\s+(this|last) month\b/,'');
  const q=stripped.match(/(?:for|matching)\s+(.+)$/)?.[1],month=s.includes('last month')?new Date(Date.UTC(Number(c.asOf.slice(0,4)),Number(c.asOf.slice(5,7))-2,1)).toISOString().slice(0,7):s.includes('this month')?c.asOf.slice(0,7):null;
  const all=[...new Map([...c.transactions,...(c.ledger??[])].map(t=>[t.id,t])).values()];
  const rows=all.filter(t=>(!q||normalizeMerchant(t.merchant).includes(normalizeMerchant(q)))&&(!range||(t.date.slice(0,10)>=range[1]&&t.date.slice(0,10)<=range[2]))&&(!month||t.date.startsWith(month))).toSorted((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  return answer((c.ledgerCoverage??'Available records only')+'; purchase-history window '+c.coverage.from.slice(0,10)+'–'+c.coverage.to.slice(0,10)+(c.coverage.truncated?' (truncated)':'')+'\n'+(rows.map(t=>t.date.slice(0,10)+': '+t.merchant+', '+t.direction+' '+displayAmount(t.amountMinor,t.currency)+' ('+t.classification+')').join('\n')||'No matching records.'));
 }
 if(/\bcards?\b/.test(s))return answer(c.cards.map(a=>`${a.name}: ${a.frozen?'frozen':'active'}, monthly limit ${displayAmount(a.limitMinor,'CNY')}`).join('\n')||'No cards available.');
 if(/\b(settings|profile|security)\b/.test(s))return{resultKind:'handoff',message:'Manage your profile and session security in the dedicated screen. Authentication secrets are never shown to Fufu.',links:[{href:c.source.startsWith('browser-local')&&!s.includes('security')?'/settings':'/security',label:c.source.startsWith('browser-local')&&!s.includes('security')?'Open Settings':'Open Security'}]};
 return null;
}
