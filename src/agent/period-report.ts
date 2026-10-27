import {shanghaiDate} from '../features/overview/safe-to-spend';
import {displayAmount,type AgentContext,type AgentTransaction} from './contracts';

export type PeriodReport={period:string;completePeriod:boolean;totals:Record<string,string>;categories:Record<string,Record<string,string>>;evidenceIds:string[];warnings:string[];anomalies:{transactionId:string;reason:string;baselineCount:number;medianMinor:string;thresholdMinor:string}[]};
const median=(values:bigint[])=>{const v=values.toSorted((a,b)=>a<b?-1:a>b?1:0),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2n;};
const consumption=(t:AgentTransaction)=>t.settled&&t.direction==='debit'&&t.classification==='consumption'&&/^[1-9]\d*$/.test(t.amountMinor);
/** Historical observations only. A flag is a review prompt, not a fraud verdict. */
export function buildAgentReport(context:AgentContext,period:string):PeriodReport{
 if(!/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(period)||Number(period.slice(0,4))<1900)throw new Error('INVALID_PERIOD');
 const start=period+(period.length===4?'-01-01':'-01'),end=new Date(start+'T00:00:00Z');
 if(period.length===4)end.setUTCFullYear(end.getUTCFullYear()+1);else end.setUTCMonth(end.getUTCMonth()+1);
 const until=end.toISOString().slice(0,10),all=[...new Map(context.transactions.map(t=>[t.id,t])).values()].filter(consumption);
 const rows=all.filter(t=>Number.isFinite(Date.parse(t.date))&&Date.parse(t.date)<=Date.parse(context.asOf)&&shanghaiDate(t.date)>=start&&shanghaiDate(t.date)<until);
 const report:PeriodReport={period,completePeriod:!context.coverage.truncated&&shanghaiDate(context.coverage.from)<=start&&shanghaiDate(context.coverage.to)>=until,totals:{},categories:{},evidenceIds:rows.map(t=>t.id),warnings:[],anomalies:[]};
 if(!report.completePeriod)report.warnings.push('Partial period or incomplete coverage; totals describe retrieved records only.');
 if(context.coverage.truncated)report.warnings.push('History is truncated. Missing transactions may change totals and baselines.');
 if(!rows.length)report.warnings.push('No eligible settled consumption records in this period.');
 for(const t of rows){
  const n=BigInt(t.amountMinor);report.totals[t.currency]=String(BigInt(report.totals[t.currency]??'0')+n);
  const categories=report.categories[t.currency]??={};categories[t.category]=String(BigInt(categories[t.category]??'0')+n);
  const floor=new Date(t.date);floor.setUTCDate(floor.getUTCDate()-90);
  const prior=all.filter(p=>p.id!==t.id&&p.accountId===t.accountId&&p.currency===t.currency&&p.category===t.category&&Date.parse(p.date)<Date.parse(t.date)&&Date.parse(p.date)>=floor.getTime()).map(p=>BigInt(p.amountMinor));
  if(prior.length<10)continue;
  const med=median(prior),mad=median(prior.map(v=>v>=med?v-med:med-v)),threshold=med+(6n*mad>2n*med?6n*mad:2n*med);
  if(n>threshold)report.anomalies.push({transactionId:t.id,reason:'Amount exceeds the greater of 3× historical median or median + 6× median absolute deviation, using earlier same-account/currency/category purchases within 90 days. Review only; not evidence of fraud.',baselineCount:prior.length,medianMinor:String(med),thresholdMinor:String(threshold)});
 }
 return report;
}
export function describeAgentReport(r:PeriodReport):string{
 return [`Recorded consumption report: ${r.period} (Shanghai calendar)`, ...Object.entries(r.totals).map(([c,n])=>displayAmount(n,c)+'; '+Object.entries(r.categories[c]).map(([k,v])=>k+' '+displayAmount(v,c)).join(', ')),`${r.evidenceIds.length} settled purchases. Transfers and investments excluded.`,...r.warnings,`${r.anomalies.length} statistical review flags. At least 10 earlier purchases are required per baseline.`,...r.anomalies.map(a=>a.transactionId+': '+a.reason)].join('\n');
}
export type SuitabilityAnswers={horizonYears:number;lossTolerancePercent:number;emergencyMonths:number;experience:number};
export function assessSuitability(a:SuitabilityAnswers):{risk:'low'|'medium'|'high';score:number;reasons:string[]}{
 if(Object.values(a).some(n=>!Number.isFinite(n)||n<0)||a.horizonYears>50||a.lossTolerancePercent>100||a.emergencyMonths>120||![0,1,2].includes(a.experience))throw new Error('INVALID_ASSESSMENT');
 const score=(a.horizonYears>=5?2:a.horizonYears>=2?1:0)+(a.lossTolerancePercent>=20?2:a.lossTolerancePercent>=5?1:0)+a.experience;
 const capacity=a.emergencyMonths>=3&&a.horizonYears>=1&&a.lossTolerancePercent>=5;
 return{risk:!capacity?'low':score>=5?'high':score>=3?'medium':'low',score,reasons:[capacity?'Emergency liquidity, horizon and loss tolerance meet the prototype capacity floor.':'Limited liquidity, short horizon or low loss tolerance caps this result at low risk.','Self-reported educational screening, not regulated suitability advice. No purchase is authorised.']};
}
