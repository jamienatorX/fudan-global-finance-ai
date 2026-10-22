import {referenceConversion,parseMajorAmount} from '../features/demo/planning-helpers';
import {type CurrencyCode} from '../domain/currency';
import {money} from '../domain/money';
import {displayAmount,type AgentContext,type AgentPlanResult} from './contracts';
import type {ReferenceQuote} from '../features/fx/reference-quote';
import {UNSUPPORTED_MESSAGE} from './support';
import {FX_CURRENCY_CODES,parseReferenceMinor,showReferenceMinor,referenceDigits} from '../features/fx/currency-codes';
export function resolveAgentQuote(command:string,c:AgentContext):Partial<AgentPlanResult>|null {
 if(!/^(convert|quote)\b/i.test(command))return null;
 const m=command.trim().match(/^(?:convert|quote)\s+([A-Z]{3})\s+([\d,.]+)\s+to\s+([A-Z]{3})$/i);
 if(!m)return{resultKind:'needs-input',message:'Use: Convert USD 100 to CNY. Reference quotes do not exchange money.',actions:[]};
 const base=m[1].toUpperCase(),quote=m[3].toUpperCase();
 if(!FX_CURRENCY_CODES.has(base)||!FX_CURRENCY_CODES.has(quote))return{resultKind:'unsupported',message:UNSUPPORTED_MESSAGE,actions:[],links:[{href:'/fx',label:'Open full currency reference converter'}]};
 try{parseReferenceMinor(m[2],base);}catch{return{resultKind:'needs-input',message:'Enter a positive reference amount with valid currency precision and within the simulation limit.',actions:[]};}
 try{
  const amount=money(BigInt(parseMajorAmount(m[2].replaceAll(',',''),base as CurrencyCode)),base as CurrencyCode);
  if(amount.amountMinor>99999999999n)return{resultKind:'needs-input',message:'Choose a smaller reference amount.',actions:[]};
  const result=referenceConversion(amount,quote as CurrencyCode,c.rates??[]);
  return{resultKind:'answer',actions:[],message:`Reference only: ${displayAmount(String(amount.amountMinor),base)} ≈ ${displayAmount(String(result.amount.amountMinor),quote)}. Source: ${result.source}. Quote date: ${result.referenceAt||c.asOf.slice(0,10)}. Retrieved: ${c.rates?.map(r=>r.retrievedAt).sort()[0]??c.asOf}. No money was exchanged.`};
 }catch{return{resultKind:'handoff',actions:[],message:'A reference rate or valid amount is unavailable. No money was exchanged. Use the existing FX converter to check the pair.',links:[{href:'/fx',label:'Open currency reference converter'}]};}
}

/** Live reference lookup with explicit labelled fixture fallback. Never a monetary tool. */
export async function planQuote(command:string,c:AgentContext,load:(base:string,quote:string)=>Promise<ReferenceQuote|undefined>):Promise<Partial<AgentPlanResult>|null>{
 const result=resolveAgentQuote(command,c);if(!result||result.resultKind==='unsupported'||result.resultKind==='needs-input')return result;
 const m=command.trim().match(/^(?:convert|quote)\s+([A-Z]{3})\s+([\d,.]+)\s+to\s+([A-Z]{3})$/i);if(!m)return result;
 try{const base=m[1].toUpperCase(),quote=m[3].toUpperCase(),rate=await load(base,quote);if(!rate)return result;
 if(rate.base!==base||rate.quote!==quote||!Number.isFinite(rate.rate)||rate.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(rate.date))return result;
 const raw=rate.rate.toFixed(12);if(!/^\d+\.\d{12}$/.test(raw))return result;
 const amount=parseReferenceMinor(m[2],base),numerator=amount*BigInt(raw.replace('.',''))*10n**BigInt(referenceDigits(quote)),denominator=10n**BigInt(referenceDigits(base))*1000000000000n;
 const output=(numerator+denominator/2n)/denominator,now=new Date().toISOString();
 return{resultKind:'answer',actions:[],message:`Reference only: ${showReferenceMinor(amount,base)} ≈ ${showReferenceMinor(output,quote)}. Source: ${rate.source}; ${rate.provider}. Quote date: ${rate.date}. Retrieved: ${now}. No money was exchanged.`};
 }catch{return result;}
}
