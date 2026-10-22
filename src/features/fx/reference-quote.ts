export type ReferenceQuote={base:string;quote:string;rate:number;date:string;source:string;provider:string};
export async function fetchReferenceQuote(base:string,quote:string):Promise<{data?:ReferenceQuote;error?:string;status:number}>{
 if(!/^[A-Z]{3}$/.test(base)||!/^[A-Z]{3}$/.test(quote))return{error:'Choose two valid currency codes.',status:400};
 if(base===quote)return{status:200,data:{base,quote,rate:1,date:new Date().toISOString().slice(0,10),source:'identity',provider:'Identity conversion'}};
 try{
  const response=await fetch('https://api.frankfurter.dev/v2/rate/'+base+'/'+quote,{next:{revalidate:3600},signal:AbortSignal.timeout(7000),headers:{Accept:'application/json'}});
  if(!response.ok)return{status:response.status===404||response.status===422?404:503,error:response.status===404||response.status===422?'Reference rate not published for this pair.':'FX provider unavailable.'};
  const row=await response.json() as Partial<ReferenceQuote>;
  if(row.base?.toUpperCase()!==base||row.quote?.toUpperCase()!==quote||typeof row.rate!=='number'||!Number.isFinite(row.rate)||row.rate<=0||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))return{status:503,error:'Invalid reference-rate response.'};
  return{status:200,data:{base,quote,rate:row.rate,date:row.date,source:'live-reference',provider:'Frankfurter (blended official-source mid-market rates)'}};
 }catch{return{status:503,error:'Reference service currently unavailable.'};}
}
