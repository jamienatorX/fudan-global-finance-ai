'use client';
import {useEffect,useState} from 'react';
import type {RatePoint} from './remittance';
export function useRateHistory(){
 const [history,setHistory]=useState<readonly RatePoint[]>([]);
 useEffect(()=>{const controller=new AbortController();void fetch('/api/fx/history',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();if(!controller.signal.aborted&&Array.isArray(data.points))setHistory(data.points.filter((p:RatePoint)=>typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&typeof p.rate==='number'&&Number.isFinite(p.rate)&&p.rate>0));}).catch(()=>{});return()=>controller.abort();},[]);
 return history;
}
