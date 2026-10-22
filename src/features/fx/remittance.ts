import type { ExchangeRate } from '../../domain/entities';
import { money } from '../../domain/money';
import { referenceConversion } from '../demo/planning-helpers';
export type RatePoint=Readonly<{date:string;rate:number}>;
export function rateComparison(current:number,history:readonly RatePoint[],direction:'receive'|'send'){
  const valid=[...new Map(history.filter(p=>Number.isFinite(p.rate)&&p.rate>0&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)).map(p=>[p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(!Number.isFinite(current)||current<=0||valid.length<10||Date.parse(valid.at(-1)!.date)-Date.parse(valid[0].date)<20*86400000)return null;
  const average=valid.reduce((sum,p)=>sum+p.rate,0)/valid.length;
  return {average,observations:valid.length,improvementPercent:(direction==='send'?current/average:average/current)*100-100};
}
export function remittanceQuote(amountMinor:bigint,direction:'receive'|'send',rates:readonly ExchangeRate[]){
  if(amountMinor<=0n||amountMinor>1_000_000_000_000n)throw new Error('Enter a positive amount within the sandbox limit.');
  const from=direction==='receive'?'IDR':'CNY';const to=direction==='receive'?'CNY':'IDR';
  // Illustrative fees: 0.35% plus IDR 5,000 or CNY 2.00, paid in source currency.
  const fee=(amountMinor*35n+9999n)/10000n+(from==='IDR'?5000n:200n);
  if(fee>=amountMinor)throw new Error('The amount must exceed the illustrative fee.');
  const source=money(amountMinor,from);
  const destination=referenceConversion(money(amountMinor-fee,from),to,rates).amount;
  return {source,fee:money(fee,from),destination};
}
