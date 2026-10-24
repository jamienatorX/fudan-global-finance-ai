'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {validSupportDestination} from '../../agent/support';
export function HumanSupport({destination,summary,demo=false}:{destination?:string;summary:string;demo?:boolean}){
 const [message,setMessage]=useState(''),[sent,setSent]=useState(false);
 const [open,setOpen]=useState(false),[copied,setCopied]=useState('');const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const uid=useId(),titleId=uid+"-title",summaryId=uid+"-summary";
 const safe=validSupportDestination(destination);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
 function close(){setOpen(false);trigger.current?.focus();}
 return <><button ref={trigger} type="button" onClick={()=>{setCopied('');setSent(false);setMessage('');setOpen(true);}} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800"><span aria-hidden="true">🎙️</span>Contact a human operator</button>
  <dialog ref={dialog} onCancel={close} aria-labelledby={titleId} className="m-auto w-[min(90vw,30rem)] rounded-3xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
   <h3 id={titleId} className="text-lg font-bold">{demo?'Contact a human operator':'A little human help'}</h3>
   {demo?<form onSubmit={event=>{event.preventDefault();if(!message.trim())return;setMessage('');setSent(true);}}>
    <p className="mt-2 text-xs text-slate-500">Demo only. Messages are not delivered to an operator.</p>
    <label className="mt-4 block text-sm font-semibold" htmlFor={summaryId}>Your message</label>
    <textarea id={summaryId} name="operator-message" rows={4} maxLength={2000} value={message} onChange={event=>{setMessage(event.target.value);setSent(false);}} placeholder="How can we help?" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base"/>
    <div className="mt-4 flex flex-wrap gap-3"><button type="submit" disabled={!message.trim()} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Send message</button><button type="button" onClick={close} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">Close</button></div>
    {sent&&<p role="status" className="mt-3 text-sm">Demo message sent.</p>}
   </form>:<>
   <p className="mt-3 text-sm">{safe?'You can open our configured support channel. Share only the information you choose.':'No human support channel is connected yet. Please use your project’s usual support contact.'} No request has been sent.</p>
   <p className="mt-2 text-xs text-slate-500">The message does not create a ticket or guarantee a resolution time.</p>
   <label className="mt-4 block text-sm font-semibold" htmlFor={summaryId}>Request summary</label><textarea id={summaryId} readOnly rows={3} value={summary||'I need help with FU Bank.'} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"/>
   <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="rounded-xl bg-slate-100 px-4 py-3 text-sm" onClick={async()=>{try{await navigator.clipboard.writeText(summary||'I need help with FU Bank.');setCopied('Summary copied.');}catch{setCopied('Select the summary above to copy it.');}}}>Copy summary</button>
   {safe&&<a href={safe} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-3 text-sm text-white">Open human support</a>}
   <button type="button" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" onClick={close}>Close</button></div>{copied&&<p aria-live="polite" className="mt-2 text-sm">{copied}</p>}</>}
  </dialog>
 </>;
}
