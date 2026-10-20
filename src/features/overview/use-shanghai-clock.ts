'use client';
import {useSyncExternalStore} from 'react';
const subscribe=(onChange:()=>void)=>{const timer=window.setInterval(onChange,60_000);return()=>window.clearInterval(timer);};
const now=()=>Math.floor(Date.now()/60_000)*60_000;
const server=()=>0;
/** Stable minute-resolution clock; calendar interpretation happens in Asia/Shanghai. */
export function useShanghaiClock(){return useSyncExternalStore(subscribe,now,server);}
