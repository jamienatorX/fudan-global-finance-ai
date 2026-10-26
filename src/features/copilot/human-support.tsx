'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import {validSupportDestination} from '../../agent/support';
export function HumanSupport({signedIn=false,...props}:{destination?:string;summary:string;demo?:boolean;signedIn?:boolean}){return signedIn?<Link href="/support" className="fufu-support-link">Contact a human operator →</Link>:<PublicHumanSupport {...props}/>;}
function PublicHumanSupport({destination,summary}:{destination?:string;summary:string;demo?:boolean}){
 
 const [open,setOpen]=useState(false),[copied,setCopied]=useState('');const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const uid=useId(),titleId=uid+"-title",summaryId=uid+"-summary";
 const safe=validSupportDestination(destination);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
 function close(){setOpen(false);trigger.current?.focus();}
 return <><button ref={trigger} type="button" onClick={()=>{setCopied('');setOpen(true);}} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800"><span aria-hidden="true">🎙️</span>Contact a human operator</button>
  <dialog ref={dialog} onCancel={close} aria-labelledby={titleId} className="m-auto w-[min(90vw,30rem)] rounded-3xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
   <h3 id={titleId} className="text-lg font-bold">Contact a human operator</h3>
   <>
   <p className="mt-3 text-sm">{safe?'You can open our configured support channel. Share only the information you choose.':'Sign in to create a private request in your support inbox.'} No request has been sent.</p>
   <Link href="/support" className="mt-3 inline-block rounded-xl border px-4 py-3 text-sm font-semibold">Sign in for secure support</Link>
   <label className="mt-4 block text-sm font-semibold" htmlFor={summaryId}>Request summary</label><textarea id={summaryId} readOnly rows={3} value={summary||'I need help with FU Bank.'} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"/>
   <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="rounded-xl bg-slate-100 px-4 py-3 text-sm" onClick={async()=>{try{await navigator.clipboard.writeText(summary||'I need help with FU Bank.');setCopied('Summary copied.');}catch{setCopied('Select the summary above to copy it.');}}}>Copy summary</button>
   {safe&&<a href={safe} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-3 text-sm text-white">Open human support</a>}
   <button type="button" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" onClick={close}>Close</button></div>{copied&&<p aria-live="polite" className="mt-2 text-sm">{copied}</p>}</>
  </dialog>
 </>;
}
