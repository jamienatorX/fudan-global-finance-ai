'use client';
import { useCallback,useEffect,useMemo,useState,type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase/browser';
import type { BankingState,TableItem } from '../../server/secure-banking';
import { searchPrivateBanking } from './private-search';
type BankProposal = Readonly<{type: 'transfer'|'tuition'|'budget'|'subscription'|'card'|'investment'; [key:string]:string}>;

type Tab='overview'|'transfers'|'cards'|'budgets'|'subscriptions'|'wealth'|'activity';
type Pending={id:string;payload:BankProposal;expiresInSeconds:number};
const TABS:readonly {id:Tab;title:string}[]=[
 {id:'overview',title:'Overview'},{id:'transfers',title:'Transfers'},
 {id:'cards',title:'Cards'},{id:'budgets',title:'Budgets'},
 {id:'subscriptions',title:'Subscriptions'},{id:'wealth',title:'Investments'},
 {id:'activity',title:'Activity'},
];
const money=(minor:unknown,currency='CNY')=>{
 try {
  const value=BigInt(String(minor));
  const digits=currency==='IDR'?0:2;
  const scale=10n**BigInt(digits),whole=value/scale,part=value%scale;
  return currency+' '+whole.toLocaleString('en-US')+(digits?'.'+part.toString().padStart(digits,'0'):'');
 }catch{return currency+' —'}
};
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'An unexpected error occurred';
const input='mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-blue-500';
const cta='rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400';
const sec='rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50';
function Pane({title,description,children}:{title:string;description?:string;children:ReactNode}) {
 return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-slate-900">{title}</h2>
 {description&&<p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}<div className="mt-5">{children}</div></section>;
}
function CurrencyAccount({row}:{row:TableItem}){
 return <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5">
   <p className="text-xs font-bold uppercase tracking-widest text-blue-700">{String(row.label)}</p>
   <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{money(row.balance_minor,String(row.currency))}</p>
   <p className="mt-2 text-xs text-slate-500">Fictional balance · Authenticated Supabase sandbox</p>
 </div>;
}
const byId=(values:TableItem[],id:string)=>values.find(row=>row.id===id);
const toMinor=(text:string,currency='CNY')=>{
 if(!/^\d+(?:\.\d+)?$/.test(text))throw new Error('Enter a positive numeric amount');
 const digits=currency==='IDR'?0:2;const [whole,decimals='']=text.split('.');
 if(decimals.length>digits)throw new Error('Too many decimal places');
 const value=BigInt(whole)*10n**BigInt(digits)+BigInt(decimals.padEnd(digits,'0')||'0');
 if(value<1n||value>99999999999n)throw new Error('Amount must be between 1 minor unit and the sandbox limit');
 return value.toString();
};
const empty={enrolled:false,version:0,accounts:[],budgets:[],subscriptions:[],cards:[],tuition:[],products:[],holdings:[],actions:[],ledger:[],audit:[]} satisfies BankingState;

export function BankingWorkspace(){
 const router=useRouter();
 const [state,setState]=useState<BankingState>(empty);
 const [bankSearch,setBankSearch]=useState('');
 const [tab,setTab]=useState<Tab>('overview');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [pending,setPending]=useState<Pending|null>(null);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [form,setForm]=useState<Record<string,string>>({});
 const field=(key:string,defaultValue='')=>form[key]??defaultValue;
 const put=(key:string,value:string)=>setForm(f=>({...f,[key]:value}));
 const refresh=useCallback(async()=>{
   const response=await fetch('/api/banking/state',{cache:'no-store'});
   if(response.status===401){router.replace('/login');return;}
   if(!response.ok)throw new Error('Could not load persistent financial records');
   setState(await response.json() as BankingState);
 },[]);
 useEffect(()=>{
   let active=true;
   void (async()=>{
     try{if(active)await refresh();}
     catch(e){if(active)setError(errorMessage(e))}
     finally{if(active)setLoading(false)}
   })();
   return()=>{active=false};
 },[refresh]);
 async function post(payload:Record<string,unknown>,route='/api/banking/action'){
   const response=await fetch(route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const result=await response.json() as Record<string,unknown>;
   if(!response.ok)throw new Error(typeof result.message==='string'?result.message:typeof result.error==='string'?result.error:'Banking request failed');
   return result;
 }
 async function run(work:()=>Promise<void>){
  if(busy)return;setBusy(true);setError('');
  try{await work()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 async function prepare(payload:BankProposal){
  await run(async()=>{
   const result=await post({operation:'prepare',payload});
   setPending({id:String(result.id),payload,expiresInSeconds:Number(result.expiresInSeconds)});
   setNotice('Proposal stored in Supabase. Review and approve or reject the exact action.');
   await refresh();
  });
 }
 async function decide(approve:boolean){
  if(!pending)return;
  await run(async()=>{
   const result=await post({operation:'execute',actionId:pending.id,approve});
   setNotice('Database result: '+String(result.status)+(typeof result.message==='string'?' — '+result.message:'')+'.');
   setPending(null);await refresh();
  });
 }
 async function initialize(){
  await run(async()=>{await post({operation:'initialize'});await refresh();setNotice('Fictional accounts were initialized for your authenticated profile.');});
 }
 const cny=state.accounts.filter(a=>a.currency==='CNY');
 const sourceId=field('source',String(cny.find(a=>a.label==='Daily CNY')?.id??cny[0]?.id??''));
 const source=byId(state.accounts,sourceId);
 const destinationId=field('destination',String(cny.find(a=>a.label==='Savings CNY')?.id??''));
 const totalCash=state.accounts.filter(a=>a.currency==='CNY').reduce((sum,a)=>sum+BigInt(String(a.balance_minor)),0n);
 const totalBudget=state.budgets.reduce((sum,b)=>sum+BigInt(String(b.limit_minor)),0n);
 const monthlySubscriptions=state.subscriptions.filter(s=>s.active).reduce((sum,s)=>sum+BigInt(String(s.monthly_minor)),0n);
 const latest=useMemo(()=>state.ledger.slice(0,12),[state.ledger]);
 const searchResults=useMemo(()=>searchPrivateBanking(state,bankSearch),[state,bankSearch]);
 if(loading)return <main className="grid min-h-screen place-items-center bg-slate-50"><p role="status">Opening your authenticated banking sandbox…</p></main>;
 return <div className="min-h-screen bg-slate-50 text-slate-900">
   <header className="border-b border-slate-200 bg-white">
     <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
      <div><p className="text-xl font-black tracking-tight text-blue-950">FUDAN <span className="text-blue-600">GLOBAL</span></p>
        <p className="text-xs font-semibold tracking-widest text-slate-500">AUTHENTICATED BANKING LAB · SIMULATION</p></div>
      <div className="flex items-center gap-2"><Link href="/overview" className={sec}>Public demo</Link>
       <button className={sec} onClick={async()=>{await createBrowserSupabaseClient().auth.signOut();window.location.assign('/login');}}>Sign out</button></div>
     </div>
   </header>
   <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8">
    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <strong>Private demo workspace.</strong> All money, cards, investments and payments are fictional. Account changes persist to Supabase and require explicit approval; none move real funds.
    </div>
    {!state.enrolled?<Pane title="Initialize your secure financial sandbox" description="Creates your own persistent fictional CNY, USD, SGD and IDR accounts. Only you can read your data, with every subsequent change approved through a database transaction.">
      <button className={cta} disabled={busy} onClick={initialize}>Create fictional banking portfolio</button>
      <p className="mt-4 text-sm text-slate-500">No bank connections, payment-processing partners, identification documents, or deposits are required.</p>
    </Pane>:<>
     <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
       <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Banking command center</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Your financial workspace</h1>
       <p className="mt-2 text-sm text-slate-500">Server-authoritative fictional ledger · State version {state.version}</p></div>
       <div className="flex gap-2"><button className={sec} onClick={()=>void run(refresh)} disabled={busy}>Refresh ledger</button>
       <button className={cta} onClick={()=>setTab('transfers')}>New transfer</button></div>
     </div>
     <section aria-label="Search your banking records" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
       <label htmlFor="private-bank-search" className="block text-sm font-semibold text-slate-900">Search your banking records</label>
       <input id="private-bank-search" type="search" className={input} value={bankSearch}
         onChange={e=>setBankSearch(e.target.value)} placeholder="Accounts, payments, subscriptions, cards…" />
       {bankSearch.trim() ? <div role="region" aria-label="Private banking search results" className="mt-3 space-y-2">
         <p className="text-xs text-slate-500">{searchResults.length ? searchResults.length+' matching records':'No matching records found'}</p>
         <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
           {searchResults.map(item=><button key={item.id} type="button" onClick={()=>{setTab(item.tab);setBankSearch('');}}
             className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50">
             <strong className="block truncate">{item.title}</strong><span className="mt-1 block truncate text-xs text-slate-500">{item.category} · {item.detail}</span>
           </button>)}
         </div>
       </div> : null}
     </section>
     <nav aria-label="Banking modules" className="mb-6 flex flex-wrap gap-2">
      {TABS.map(item=><button type="button" key={item.id} aria-current={tab===item.id?'page':undefined}
       onClick={()=>setTab(item.id)} className={'rounded-xl px-4 py-2.5 text-sm font-semibold '+(tab===item.id?'bg-blue-600 text-white':'bg-white text-slate-600 hover:bg-blue-50')}>
       {item.title}</button>)}
     </nav>
     {tab==='overview'&&<div className="space-y-5">
       <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-gradient-to-br from-blue-950 to-blue-700 p-6 text-white shadow-lg md:col-span-2">
         <p className="text-sm text-blue-200">Total fictional CNY deposits</p>
         <p className="mt-2 text-4xl font-bold tabular-nums">{money(totalCash)}</p><p className="mt-3 text-sm text-blue-200">Balances are kept in original currencies; other currencies are shown separately below.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
         <p className="text-sm text-slate-500">Monthly planned spending</p><p className="mt-2 text-3xl font-bold">{money(totalBudget)}</p>
         <p className="mt-3 text-sm text-slate-500">Active subscriptions: {money(monthlySubscriptions)}/month</p></div>
       </div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{state.accounts.map(a=><CurrencyAccount row={a} key={String(a.id)}/>)}</div>
       <div className="grid gap-5 lg:grid-cols-2"><Pane title="Tuition and obligations">{state.tuition.map(t=><p key={String(t.id)} className="flex justify-between gap-2 text-sm"><span>{String(t.label)}</span><strong className={t.paid?'text-emerald-700':'text-amber-700'}>{t.paid?'Paid':money(t.amount_minor)}</strong></p>)}</Pane>
       <Pane title="Recent ledger activity">{latest.length?latest.slice(0,5).map(t=><p key={String(t.id)} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"><span>{String(t.label)}</span><strong>{t.direction==='debit'?'−':'+'}{money(t.amount_minor,String(t.currency))}</strong></p>):<p className="text-sm text-slate-500">No activity yet. Try a fictional transfer.</p>}</Pane></div>
     </div>}
     {tab==='transfers'&&<div className="grid gap-5 lg:grid-cols-2">
       <Pane title="Transfer between your own accounts" description="Immediate, same-currency transfers are atomic: the source is debited and destination credited in one database transaction.">
         <div className="space-y-4">
          <label className="block text-sm font-semibold">From<select className={input} value={sourceId} onChange={e=>{const next=e.target.value;setForm(f=>({...f,source:next,destination:String(state.accounts.find(a=>a.currency===byId(state.accounts,next)?.currency && a.id!==next)?.id??'')}));}}>
            {state.accounts.filter(a=>state.accounts.some(other=>other.id!==a.id&&other.currency===a.currency)).map(a=><option key={String(a.id)} value={String(a.id)}>{String(a.label)} · {money(a.balance_minor,String(a.currency))}</option>)}</select></label>
          <label className="block text-sm font-semibold">To<select className={input} value={destinationId} onChange={e=>put('destination',e.target.value)}>
            {state.accounts.filter(a=>a.id!==source?.id && a.currency===source?.currency).map(a=><option key={String(a.id)} value={String(a.id)}>{String(a.label)}</option>)}</select></label>
          <label className="block text-sm font-semibold">Amount ({String(source?.currency??'CNY')})<input className={input} inputMode="decimal" value={field('amount','800.00')} onChange={e=>put('amount',e.target.value)}/></label>
          <button className={cta} disabled={busy} onClick={()=>{try{const a={type:'transfer',sourceId,destinationId,amountMinor:toMinor(field('amount','800.00'),String(source?.currency??'CNY'))} as BankProposal;void prepare(a);}catch(e){setError(errorMessage(e))}}}>Review transfer</button>
         </div></Pane>
       <Pane title="Transaction verification" description="Unlike an external banking integration, this demo never sends money outside your fictional accounts.">
         <div className="space-y-3">{state.ledger.slice(0,12).map(t=><div key={String(t.id)} className="flex justify-between border-b border-slate-100 pb-3 text-sm">
         <span>{String(t.label)}<span className="mt-1 block text-xs text-slate-500">{String(t.classification)}</span></span>
         <strong>{t.direction==='debit'?'−':'+'}{money(t.amount_minor,String(t.currency))}</strong></div>)}</div>
       </Pane></div>}
     {tab==='cards'&&<div className="grid gap-5 md:grid-cols-2">{state.cards.map(c=><Pane key={String(c.id)} title={String(c.label)}>
       <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-blue-800 px-6 py-5 text-white">
        <p className="text-sm font-semibold">FUDAN · VIRTUAL DEMO</p><p className="mt-12 font-mono text-xl tracking-widest">{String(c.masked_number)}</p>
        <p className="mt-3 text-xs">{c.frozen?'FROZEN':'ACTIVE'}</p></div>
       <p className="mt-4 text-sm text-slate-600">Monthly limit: <strong>{money(c.monthly_limit_minor)}</strong></p>
       <div className="mt-4 flex flex-wrap gap-2"><button className={cta} onClick={()=>void prepare({type:'card',cardId:String(c.id),mode:c.frozen?'unfreeze':'freeze'})}>
        {c.frozen?'Review unfreeze':'Review freeze'}</button></div>
       <label className="mt-4 block text-sm font-semibold">New monthly limit CNY<input className={input} inputMode="decimal" value={field('card:'+c.id)} placeholder="2000.00" onChange={e=>put('card:'+c.id,e.target.value)}/></label>
       <button className={sec+' mt-3'} onClick={()=>{try{void prepare({type:'card',cardId:String(c.id),mode:'limit',limitMinor:toMinor(field('card:'+c.id))})}catch(e){setError(errorMessage(e))}}}>Review limit update</button>
     </Pane>)}</div>}
     {tab==='budgets'&&<div className="grid gap-5 lg:grid-cols-2">
       <Pane title="Monthly budget caps" description="Updates are versioned and require owner approval.">
         {state.budgets.map(b=><div key={String(b.id)} className="border-b border-slate-100 py-3">
           <div className="flex justify-between text-sm"><strong className="capitalize">{String(b.category)}</strong><span>{money(b.limit_minor)}</span></div>
           <div className="mt-2 flex gap-2"><input aria-label={'New '+String(b.category)+' cap'} className={input+' !mt-0'} inputMode="decimal" value={field('budget:'+b.category)} onChange={e=>put('budget:'+b.category,e.target.value)} placeholder="CNY amount"/>
           <button className={sec} onClick={()=>{try{void prepare({type:'budget',category:String(b.category),limitMinor:toMinor(field('budget:'+b.category))})}catch(e){setError(errorMessage(e))}}}>Review</button></div></div>)}
       </Pane>
       <Pane title="University tuition" description="A one-time fictional obligation, not recurring monthly consumption.">
         {state.tuition.map(t=><div key={String(t.id)}><p className="text-sm font-semibold">{String(t.label)}</p><p className="mt-3 text-2xl font-bold">{money(t.amount_minor)}</p>
           <p className="mt-2 text-sm text-slate-500">{t.paid?'Already paid':'Outstanding installment'}</p>
           {!t.paid&&cny.length>0&&<button className={cta+' mt-4'} onClick={()=>void prepare({type:'tuition',sourceId:sourceId,tuitionId:String(t.id)})}>Review simulated payment</button>}</div>)}
       </Pane></div>}
     {tab==='subscriptions'&&<div className="grid gap-5 md:grid-cols-2">{state.subscriptions.map(s=><Pane key={String(s.id)} title={String(s.merchant)}>
       <p className="text-3xl font-bold">{money(s.monthly_minor)}<span className="text-sm font-normal text-slate-500"> / month</span></p>
       <p className="mt-2 text-sm text-slate-600">Status: {s.active?'Active':'Cancelled'}</p>
       {s.active===true&&<button className={cta+' mt-4'} onClick={()=>void prepare({type:'subscription',subscriptionId:String(s.id)})}>Review cancellation</button>}
     </Pane>)}</div>}
     {tab==='wealth'&&<div className="grid gap-5 lg:grid-cols-2">
       <Pane title="Fictional investment products" description="These are simulated instruments, not securities or personalized investment recommendations.">
         {state.products.map(p=><div key={String(p.id)} className="border-b border-slate-100 py-4">
           <div className="flex justify-between"><strong>{String(p.name)}</strong><span className="text-xs uppercase text-blue-700">{String(p.risk)} risk</span></div>
           <p className="mt-1 text-sm text-slate-500">{String(p.description)}</p>
           <button className={sec+' mt-3'} onClick={()=>put('product',String(p.id))}>Select</button></div>)}
       </Pane>
       <Pane title="Review fictional investment order">
         <label className="block text-sm font-semibold">Product<select className={input} value={field('product',String(state.products[0]?.id))} onChange={e=>put('product',e.target.value)}>
           {state.products.map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.name)}</option>)}</select></label>
         <label className="mt-4 block text-sm font-semibold">Direction<select className={input} value={field('direction','buy')} onChange={e=>put('direction',e.target.value)}>
           <option value="buy">Buy</option><option value="redeem">Redeem</option></select></label>
         <label className="mt-4 block text-sm font-semibold">CNY amount<input className={input} value={field('investAmount','500.00')} inputMode="decimal" onChange={e=>put('investAmount',e.target.value)}/></label>
         <button className={cta+' mt-4'} onClick={()=>{try{void prepare({type:'investment',sourceId,productId:field('product',String(state.products[0]?.id)),direction:field('direction','buy'),amountMinor:toMinor(field('investAmount','500.00'))})}catch(e){setError(errorMessage(e))}}}>Review fictional investment order</button>
         <h3 className="mt-7 text-sm font-bold">Holdings</h3>
         {state.holdings.map(h=><p key={String(h.id)} className="mt-2 text-sm">{String(byId(state.products,String(h.product_id))?.name)}: {money(h.value_minor)}</p>)}
       </Pane></div>}
     {tab==='activity'&&<div className="grid gap-5 lg:grid-cols-2">
       <Pane title="Immutable-style transaction receipts" description="Read-only activity view. Recorded transfers have debit and credit ledger entries.">
        {state.ledger.map(t=><div key={String(t.id)} className="border-b border-slate-100 py-3 text-sm">
         <div className="flex justify-between"><strong>{String(t.label)}</strong><span>{t.direction==='debit'?'−':'+'}{money(t.amount_minor,String(t.currency))}</span></div>
         <p className="mt-1 text-xs text-slate-500">{String(t.created_at)} · {String(t.action_id)}</p></div>)}
       </Pane><Pane title="Server-side action audit">
        {state.audit.map(e=><div key={String(e.id)} className="border-b border-slate-100 py-3 text-sm">
          <p className="font-semibold">{String(e.event)}</p><p className="mt-1 text-xs text-slate-500">{String(e.created_at)} · {String(e.action_id)}</p>
        </div>)}
       </Pane></div>}
    </>}
    {error&&<p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{notice}</p>}
    {pending&&<div role="dialog" aria-modal="true" aria-label="Approve simulation" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
      <section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
       <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Final authorization · authenticated banking sandbox</p>
       <h2 className="mt-2 text-2xl font-bold">Approve this exact change?</h2>
       <p className="mt-3 text-sm text-slate-600">Stored proposal expires in {pending.expiresInSeconds} seconds. Any intervening account change makes it stale. All outcomes are fictional.</p>
       <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-100 p-4 text-xs text-slate-900">{JSON.stringify(pending.payload,null,2)}</pre>
       <div className="mt-6 flex flex-wrap gap-3">
        <button className={cta} disabled={busy} onClick={()=>void decide(true)}>Approve simulated change</button>
        <button className={sec} disabled={busy} onClick={()=>void decide(false)}>Reject without changes</button>
       </div>
      </section>
    </div>}
    <p className="mt-10 text-center text-xs leading-6 text-slate-500">This is a financial technology research sandbox, not a bank. No deposits, real cards, securities or customer funds are supported.</p>
   </div>
 </div>;
}
