/** Same published currency choices used by the website reference converter. */
export const FX_CURRENCY_CODES=new Set(['AUD','CAD','CHF','CNY','EUR','GBP','HKD','IDR','INR','JPY','KRW','MYR','NZD','PHP','SGD','THB','TWD','USD','VND']);
export function referenceDigits(code:string):number{return new Intl.NumberFormat('en-US',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits??2;}
export function parseReferenceMinor(raw:string,code:string):bigint{
 const digits=referenceDigits(code),m=raw.replaceAll(',','').match(/^(\d+)(?:\.(\d+))?$/);
 if(!m||(m[2]?.length??0)>digits)throw new Error('Invalid reference amount');
 const value=BigInt(m[1])*10n**BigInt(digits)+BigInt((m[2]??'').padEnd(digits,'0')||'0');
 if(value<=0n||value>99999999999n)throw new Error('Invalid reference amount');return value;
}
export function showReferenceMinor(value:bigint,code:string):string{
 const digits=referenceDigits(code),scale=10n**BigInt(digits);return code+' '+value/scale+(digits?'.'+(value%scale).toString().padStart(digits,'0'):'');
}
