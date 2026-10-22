'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase/browser';
import { IDLE_TIMEOUT_MS } from '../../lib/security/policy';

export function SessionControls(){
  const router=useRouter();
  const lastActivity=useRef(0);
  const lastPing=useRef(0);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    lastActivity.current=Date.now();
    let ended=false;
    const leave=async()=>{if(ended)return;ended=true;await createBrowserSupabaseClient().auth.signOut({scope:'local'});router.replace('/login?reason=session');router.refresh();};
    const activity=()=>{
      if(Date.now()-lastActivity.current>=IDLE_TIMEOUT_MS){void leave();return;}
      lastActivity.current=Date.now();
      if(Date.now()-lastPing.current<60_000)return;
      lastPing.current=Date.now();
      void fetch('/api/banking/session',{method:'POST',credentials:'same-origin'}).then(res=>{
        if(res.status===401)void leave();else if(res.status===403){router.replace('/security');router.refresh();}
      }).catch(()=>setNotice('Connection unavailable. Sensitive actions remain protected.'));
    };
    const timer=setInterval(()=>{if(Date.now()-lastActivity.current>=IDLE_TIMEOUT_MS)void leave();},1000);
    const focus=()=>{if(document.visibilityState==='visible')activity();};
    window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);window.addEventListener('scroll',activity,{passive:true});document.addEventListener('visibilitychange',focus);
    return()=>{clearInterval(timer);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);window.removeEventListener('scroll',activity);document.removeEventListener('visibilitychange',focus);};
  },[router]);
  async function signOutOthers(){
    if(busy)return;setBusy(true);setNotice('');
    try{const {error}=await createBrowserSupabaseClient().auth.signOut({scope:'others'});setNotice(error?'Could not sign out other devices. Try again.':'Other devices have been signed out.');}
    catch{setNotice('Could not sign out other devices. Try again.');}finally{setBusy(false);}
  }
  return <section aria-label="Account security" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
    <div><p className="font-semibold">Two-factor verification enabled</p><p className="text-xs text-slate-600">Locks after 15 minutes of inactivity. Sessions expire after 8 hours.</p>{notice?<p role="status" className="mt-1">{notice}</p>:null}</div>
    <div className="flex flex-wrap gap-2"><Link className="rounded-xl border px-3 py-3" href="/security">Verify again</Link><button className="rounded-xl border px-3 py-3" disabled={busy} onClick={()=>void signOutOthers()}>Sign out other devices</button></div>
  </section>;
}
