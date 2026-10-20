import { NextResponse } from 'next/server';
export const runtime='nodejs';
export async function GET(){
  const today=new Date().toISOString().slice(0,10);
  const from=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  try{
    const response=await fetch(`https://api.frankfurter.dev/v2/rates?base=CNY&quotes=IDR&from=${from}`,{next:{revalidate:3600},signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw new Error('Unavailable');
    const raw:unknown=await response.json();
    if(!Array.isArray(raw))throw new Error('Invalid history');
    const points=[...new Map(raw.filter(r=>r&&r.base==='CNY'&&r.quote==='IDR'&&typeof r.rate==='number'&&Number.isFinite(r.rate)&&r.rate>0&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date>=from&&r.date<=today&&new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)===r.date).map(r=>[r.date,{date:r.date,rate:r.rate}])).values()].sort((a,b)=>a.date.localeCompare(b.date));
    if(!points.length)throw new Error('No published history');
    return NextResponse.json({base:'CNY',quote:'IDR',points,from,to:today,provider:'Frankfurter'},{headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'}});
  }catch{return NextResponse.json({points:[],error:'Published rate history unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
