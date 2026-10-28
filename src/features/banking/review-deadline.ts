'use client';
import {useEffect,useState} from 'react';
export function useReviewDeadline(deadline:number){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const update=()=>setNow(Date.now());const timer=setInterval(update,250);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[]);
 return Number.isFinite(deadline)?Math.max(0,Math.ceil((deadline-now)/1000)):0;
}

