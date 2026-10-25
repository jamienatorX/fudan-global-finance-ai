'use client';
import {useEffect,useRef,useState} from 'react';
import {createBrowserSupabaseClient} from '../../lib/supabase/browser';
import {securePost} from './security-client';
type Policy={tier:'Green'|'Yellow'|'Red';reason:string;review?:Record<string,string>};
type Props={actionId:string;onReady:(ready:boolean)=>void};
export function ActionVerification(props:Props){return <ActionVerificationSession key={props.actionId} {...props}/>;}
function ActionVerificationSession({actionId,onReady}:Props){
 const [policy,setPolicy]=useState<Policy|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[grant,setGrant]=useState(''),[code,setCode]=useState(''),[verified,setVerified]=useState(false);
 const callback=useRef(onReady);useEffect(()=>{callback.current=onReady;},[onReady]);
 useEffect(()=>{let active=true;callback.current(false);
  securePost<Policy>('/api/banking/policy',{operation:'policy',actionId}).then(p=>{if(active){setPolicy(p);callback.current(p.tier==='Yellow'||p.tier==='Green');}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Verification unavailable.');});
  return()=>{active=false;};},[actionId]);
 async function begin(){setBusy(true);setError('');setVerified(false);callback.current(false);try{const r=await securePost<{id:string}>('/api/banking/policy',{operation:'begin',actionId});setGrant(r.id);}catch(e){setError(e instanceof Error?e.message:'Verification unavailable.');}finally{setBusy(false);}}
 async function verify(){setBusy(true);setError('');try{
  const client=createBrowserSupabaseClient();const factors=await client.auth.mfa.listFactors();if(factors.error)throw new Error('Could not load your authenticator.');
  const factor=factors.data.totp.find(f=>f.status==='verified');if(!factor)throw new Error('Set up an authenticator under Security first.');
  const result=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code});setCode('');if(result.error)throw new Error('The code could not be verified. Use a fresh authenticator code.');
  await securePost('/api/banking/policy',{operation:'verify',grantId:grant});setVerified(true);callback.current(true);
 }catch(e){setError(e instanceof Error?e.message:'Verification failed.');callback.current(false);}finally{setBusy(false);}}
 return <div className="my-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm" aria-label="Action permission">
  <p className="font-semibold">{policy?policy.tier+' permission':'Checking action permissions…'}</p>
  {policy?.review&&<dl className="my-2 space-y-1">{Object.entries(policy.review).map(([key,value])=>{const money=key==='Amount minor units'||key==='Limit minor units';const currency=policy.review?.Currency??'CNY';const display=money?currency+' '+(Number(value)/(currency==='IDR'?1:100)).toLocaleString(undefined,{minimumFractionDigits:currency==='IDR'?0:2}):value;return <div key={key}><dt className="inline font-semibold">{money?key.replace(' minor units',''):key}: </dt><dd className="inline break-words">{display}</dd></div>;})}</dl>}
  {policy?.tier==='Yellow'&&<p>Review the exact details before confirming.</p>}
  {policy?.tier==='Red'&&<><p>{policy.reason==='DAILY_TRANSFER_THRESHOLD'?'This transfer exceeds the ¥1,000 daily threshold.':'This action needs stronger verification.'}</p>
   {verified?<p role="status">Authenticator verified for this action. Confirm below within five minutes.</p>:!grant?<button type="button" disabled={busy} onClick={()=>void begin()} className="mt-2 rounded-xl border px-3 py-2">Verify this action</button>:<div className="mt-3 flex flex-wrap items-end gap-2"><label>Authenticator code<input aria-label="Authenticator code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} className="mt-1 block w-40 rounded-lg border bg-[var(--color-surface)] p-2"/></label><button type="button" disabled={busy||code.length!==6} onClick={()=>void verify()} className="rounded-lg border px-3 py-2">{busy?'Verifying…':'Verify code'}</button></div>}</>}
  {error&&<p role="alert" className="mt-2">{error}</p>}
  <button type="button" disabled={busy} className="mt-2 rounded-lg border px-3 py-2 text-xs" onClick={()=>{callback.current(false);setVerified(false);setGrant('');setCode('');void securePost<Policy>('/api/banking/policy',{operation:'policy',actionId}).then(p=>{setPolicy(p);callback.current(p.tier==='Yellow'||p.tier==='Green');}).catch(e=>setError(e instanceof Error?e.message:'Permissions unavailable.'));}}>Refresh permissions / verify again</button>
 </div>;
}
