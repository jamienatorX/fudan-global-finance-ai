import {displayAmount,normalizeMerchant,type AgentContext,type AgentPlanResult,type Proposal} from './contracts';
import {parseMajorAmount} from '../features/demo/planning-helpers';
import {buildAgentReport,describeAgentReport} from './period-report';
const exact=<T extends {name:string}>(rows:readonly T[],name:string)=>{const m=rows.filter(r=>normalizeMerchant(r.name)===normalizeMerchant(name));return m.length===1?m[0]:undefined;};
/** Bounded new scenario grammar. These tools produce proposals, never approvals. */
export function planScenario(command:string,c:AgentContext):Partial<AgentPlanResult>|null{
 const text=command.trim();
 const need=(message:string):Partial<AgentPlanResult>=>({resultKind:'needs-input',message,actions:[]});
 const propose=(description:string,payload:Proposal):Partial<AgentPlanResult>=>({resultKind:'proposal',message:'Review this exact fictional operation. No account data has changed. '+description,actions:[{id:crypto.randomUUID(),description,payload}]});
 const report=text.match(/^(?:show|explain|summarize) (?:my )?(?:spending|bill|annual|monthly) report (\d{4}(?:-\d{2})?)[.!?]?$/i)||text.match(/^(?:查看|生成)(\d{4}(?:-\d{2})?)(?:年度|月度)?账单报告$/);
 if(report){try{return{resultKind:'answer',message:describeAgentReport(buildAgentReport(c,report[1]))};}catch{return need('Use a valid report period: YYYY or YYYY-MM.');}}
 const privateOnly=/^(?:apply virtual card|report .+ lost|restore .+ lost status|set .+ restrictions|split CNY|plan birthday)\b/i.test(text);
 if(!privateOnly)return null;
 if(c.source.startsWith('browser-local'))return{resultKind:'handoff',message:'This persisted scenario requires the authenticated banking sandbox. No change has been made.',links:[{href:'/banking?tab=automations',label:'Open authenticated banking'}]};
 const amount=(s:string)=>{const n=parseMajorAmount(s.replaceAll(',',''),'CNY');if(BigInt(n)>99999999999n)throw new Error('Amount exceeds the simulation limit.');return n;};
 try{
  const card=text.match(/^apply virtual card (.{1,80}?) with CNY ([\d,.]+) monthly limit$/i);
  if(card)return propose('Create a masked fictional virtual card named '+card[1]+' with monthly limit '+displayAmount(amount(card[2]),'CNY')+'.',{type:'card',mode:'create',label:card[1],limitMinor:amount(card[2])});
  const lost=text.match(/^(?:report (.+?) lost|restore (.+?) lost status)$/i);
  if(lost){const card=exact(c.cards,lost[1]??lost[2]);if(!card)return need('Specify one exact recorded card name.');return propose((lost[1]?'Report lost and freeze ':'Clear lost status, keeping frozen: ')+card.name+'. Strong verification is required.',{type:'card',mode:lost[1]?'lost':'restore',cardId:card.id});}
  const restrictions=text.match(/^set (.+?) restrictions online (true|false) international (true|false) daily CNY ([\d,.]+)$/i);
  if(restrictions){const card=exact(c.cards,restrictions[1]);if(!card)return need('Specify one exact recorded card name.');return propose('Set '+card.name+' online '+restrictions[2]+', international '+restrictions[3]+', daily limit '+displayAmount(amount(restrictions[4]),'CNY')+'.',{type:'card',mode:'restrictions',cardId:card.id,onlineEnabled:restrictions[2].toLowerCase(),internationalEnabled:restrictions[3].toLowerCase(),dailyLimitMinor:amount(restrictions[4])});}
  const split=text.match(/^split CNY ([\d,.]+) from (.+?) between (.+?) for (.{1,100})$/i);
  if(split){const source=exact(c.accounts??[],split[2]),names=split[3].split(',').map(n=>n.trim());if(!source||source.currency!=='CNY'||names.length<2||names.length>10||names.some(n=>!n||n.length>80||n.includes('|'))||new Set(names.map(n=>n.toLowerCase())).size!==names.length)return need('Choose a CNY account and 2–10 distinct participant names separated by commas.');return propose('Create collection requests for '+displayAmount(amount(split[1]),'CNY')+' split among '+names.join(', ')+'. No messages are sent, and no funds are collected.',{type:'transfer',mode:'split',sourceId:source.id,amountMinor:amount(split[1]),participants:names.join('|'),label:split[4]});}
  const birthday=text.match(/^plan birthday (\d{4}-\d{2}-\d{2}) from (.+?) with CNY ([\d,.]+) flowers and CNY ([\d,.]+) cake$/i);
  if(birthday){
   const source=exact(c.accounts??[],birthday[2]),date=new Date(birthday[1]+'T00:00:00+08:00');
   if(!source||source.currency!=='CNY')return need('Choose an exact CNY account.');
   if(!Number.isFinite(date.getTime())||new Date(birthday[1]+'T00:00:00Z').toISOString().slice(0,10)!==birthday[1]||date.getTime()-172800000<=Date.now()||date.getTime()>Date.now()+366*86400000)return need('Choose a valid birthday more than two days ahead and within one year.');
   const flowers=amount(birthday[3]),cake=amount(birthday[4]),total=String(BigInt(flowers)+BigInt(cake));
   if(BigInt(total)>BigInt(source.availableMinor))return need('Insufficient available CNY for this reservation.');
   return propose('Reserve '+displayAmount(total,'CNY')+' now; schedule fictional flowers ('+displayAmount(flowers,'CNY')+') and cake ('+displayAmount(cake,'CNY')+') two days before '+birthday[1]+' at midnight Shanghai time. No real merchant order. Due payments are rechecked and may require fresh verification.',{type:'transfer',mode:'birthday',sourceId:source.id,amountMinor:total,flowerMinor:flowers,cakeMinor:cake,birthday:birthday[1],label:'Birthday'});
  }
  return need('Use an exact supported request. Open Automations & tools for examples. No change has been made.');
 }catch(e){return need(e instanceof Error?e.message:'Invalid scenario details.');}
}
