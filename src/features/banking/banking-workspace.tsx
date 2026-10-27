'use client';
import { LocalizedButton, LocalizedDd, LocalizedDiv, LocalizedDl, LocalizedDt, LocalizedH1, LocalizedH2, LocalizedH3, LocalizedHeader, LocalizedInput, LocalizedLabel, LocalizedMain, LocalizedNav, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
import { useCallback,useEffect,useMemo,useState,type ReactNode } from 'react';
import { LocalizedLink as Link } from '../../i18n/localized';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase/browser';
import type { BankingState,TableItem } from '../../server/secure-banking';
import {securityMessage} from './security-client';
import {ActionVerification} from './action-verification';
import {SecurityStatus} from './security-status';
import { SessionControls } from './session-controls';
import {ScenarioWorkspace} from './scenario-workspace';
import {SuitabilityPanel} from './report-and-suitability';
import {PrivateCopilot} from '../copilot/private-copilot';
import { searchPrivateBanking } from './private-search';
type BankProposal = Readonly<{type: 'transfer'|'tuition'|'budget'|'subscription'|'card'|'investment'; [key:string]:string}>;

type Tab='overview'|'transfers'|'cards'|'budgets'|'subscriptions'|'wealth'|'activity'|'automations';
type Pending={id:string;payload:BankProposal;expiresInSeconds:number};
const TABS:readonly {id:Tab;title:string}[]=[
 {id:'overview',title:'Overview'},{id:'transfers',title:'Transfers'},
 {id:'cards',title:'Cards'},{id:'budgets',title:'Budgets'},
 {id:'subscriptions',title:'Subscriptions'},{id:'wealth',title:'Investments'},
 {id:'activity',title:'Activity'},{id:'automations',title:'Automations & tools'},
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
 return <LocalizedSection className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><LocalizedH2 className="text-lg font-bold text-slate-900">{title}</LocalizedH2>
 {description&&<LocalizedP className="mt-1 text-sm leading-6 text-slate-500">{description}</LocalizedP>}<LocalizedDiv className="mt-5">{children}</LocalizedDiv></LocalizedSection>;
}
function CurrencyAccount({row}:{row:TableItem}){
 return <LocalizedDiv className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)]">
   <LocalizedP className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">{String(row.label)}</LocalizedP>
   <LocalizedP className="mt-3 text-2xl font-bold tabular-nums text-[var(--color-text)]">{money(row.balance_minor,String(row.currency))}</LocalizedP>
   <LocalizedP className="mt-2 text-sm text-[var(--color-text-muted)]">Available after reservations: {money(row.available_minor??row.balance_minor,String(row.currency))}</LocalizedP>

 </LocalizedDiv>;
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

export function BankingWorkspace({supportDestination,initialTab}:{supportDestination?:string;initialTab?:string}={}){
 const router=useRouter();
 const [suggestedRequest,setSuggestedRequest]=useState<{id:string;text:string}|undefined>();
 const [state,setState]=useState<BankingState>(empty);
 const [bankSearch,setBankSearch]=useState('');
 const [tab,setTab]=useState<Tab>(()=>TABS.some(t=>t.id===initialTab)?initialTab as Tab:'overview');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [pending,setPending]=useState<Pending|null>(null);
 const [actionReady,setActionReady]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [form,setForm]=useState<Record<string,string>>({});
 const field=(key:string,defaultValue='')=>form[key]??defaultValue;
 const put=(key:string,value:string)=>setForm(f=>({...f,[key]:value}));
 const refresh=useCallback(async()=>{
   const response=await fetch('/api/banking/state',{cache:'no-store'});
   if(response.status===401){router.replace('/login');return;}
   if(response.status===403){router.replace('/security');return;}
   if(!response.ok)throw new Error('Could not load financial records');
   setState(await response.json() as BankingState);
 },[router]);
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
   if(response.status===401){router.replace('/login');throw new Error('Your session ended. Please sign in again.');}
   if(result.error==='MFA_REQUIRED'||result.error==='REAUTH_REQUIRED'){router.replace('/security');throw new Error('Verify again, then review your action.');}
   if(result.code)throw new Error(securityMessage(String(result.code)));
   if(['SAFETY_LOCKED','ACTION_VERIFICATION_REQUIRED'].includes(String(result.error)))throw new Error(securityMessage(String(result.error)));
   if(!response.ok)throw new Error(response.status===429?'Too many requests. Please wait a minute.':'This action could not be completed. Review your details and try again.');
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
   setNotice('Ready for review. Confirm or cancel below.');
   await refresh();
  });
 }
 async function decide(approve:boolean){
  if(!pending)return;
  await run(async()=>{
   const result=await post({operation:'execute',actionId:pending.id,approve});
   setNotice('Status: '+String(result.status)+(typeof result.message==='string'?' — '+result.message:'')+'.');
   setPending(null);await refresh();
  });
 }
 async function initialize(){
  await run(async()=>{await post({operation:'initialize'});await refresh();setNotice('Your accounts are ready.');});
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
 if(loading)return <LocalizedMain className="grid min-h-screen place-items-center bg-slate-50"><LocalizedP role="status">Loading your account…</LocalizedP></LocalizedMain>;
 return <LocalizedDiv className="private-banking min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
   <LocalizedHeader className="border-b border-slate-200 bg-white">
     <LocalizedDiv className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
      <LocalizedDiv><LocalizedP className="text-xl font-black tracking-tight text-[var(--color-text)]"><LocalizedSpan className="fu-logo mr-2" aria-hidden>福</LocalizedSpan>福 bank</LocalizedP>
        <LocalizedP className="text-xs font-semibold tracking-widest text-slate-500">PERSONAL BANKING</LocalizedP></LocalizedDiv>
      <LocalizedDiv className="flex items-center gap-2"><Link href="/overview" className={sec}>Overview</Link>
       <LocalizedButton className={sec} onClick={async()=>{await createBrowserSupabaseClient().auth.signOut();window.location.assign('/login');}}>Sign out</LocalizedButton></LocalizedDiv>
     </LocalizedDiv>
   </LocalizedHeader>
   <LocalizedDiv className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8"><div className="bank-security-toolbar"><SessionControls/><SecurityStatus/></div>
    {!state.enrolled?<Pane title="Set up your accounts" description="Choose your accounts in CNY, USD, SGD and IDR.">
      <LocalizedButton className={cta} disabled={busy} onClick={initialize}>Set up accounts</LocalizedButton>

    </Pane>:<>
     <LocalizedDiv className="mb-7 flex flex-wrap items-center justify-between gap-4">
       <LocalizedDiv><LocalizedP className="text-xs font-bold uppercase tracking-widest text-blue-700">YOUR BANKING</LocalizedP><LocalizedH1 className="mt-1 text-3xl font-bold tracking-tight">Your money, at a glance</LocalizedH1>
       </LocalizedDiv>
       <LocalizedDiv className="flex gap-2"><LocalizedButton className={sec} onClick={()=>void run(refresh)} disabled={busy}>Refresh balances</LocalizedButton>
       <LocalizedButton className={cta} onClick={()=>setTab('transfers')}>New transfer</LocalizedButton></LocalizedDiv>
     </LocalizedDiv>
     <div className="mb-6"><PrivateCopilot suggestedRequest={suggestedRequest} supportDestination={supportDestination} version={state.version} refresh={refresh}/></div>
     <LocalizedSection aria-label="Search your banking records" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
       <LocalizedLabel htmlFor="private-bank-search" className="block text-sm font-semibold text-slate-900">Search your banking records</LocalizedLabel>
       <LocalizedInput id="private-bank-search" type="search" className={input} value={bankSearch}
         onChange={e=>setBankSearch(e.target.value)} placeholder="Accounts, payments, subscriptions, cards…" />
       {bankSearch.trim() ? <LocalizedDiv role="region" aria-label="Private banking search results" className="mt-3 space-y-2">
         <LocalizedP className="text-xs text-slate-500">{searchResults.length ? searchResults.length+' matching records':'No matching records found'}</LocalizedP>
         <LocalizedDiv className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
           {searchResults.map(item=><LocalizedButton key={item.id} type="button" onClick={()=>{setTab(item.tab);setBankSearch('');}}
             className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50">
             <LocalizedStrong className="block truncate">{item.title}</LocalizedStrong><LocalizedSpan className="mt-1 block truncate text-xs text-slate-500">{item.category} · {item.detail}</LocalizedSpan>
           </LocalizedButton>)}
         </LocalizedDiv>
       </LocalizedDiv> : null}
     </LocalizedSection>
     <LocalizedNav aria-label="Banking modules" className="mb-6 flex flex-wrap gap-2">
      {TABS.map(item=><LocalizedButton type="button" key={item.id} aria-current={tab===item.id?'page':undefined}
       onClick={()=>setTab(item.id)} className={'rounded-xl px-4 py-2.5 text-sm font-semibold '+(tab===item.id?'bg-blue-600 text-white':'bg-white text-slate-600 hover:bg-blue-50')}>
       {item.title}</LocalizedButton>)}
     </LocalizedNav>
     {tab==='automations'&&<ScenarioWorkspace accounts={state.accounts} cards={state.cards} products={state.products} refresh={refresh} onPending={setPending} onRequest={text=>{setSuggestedRequest({id:crypto.randomUUID(),text});requestAnimationFrame(()=>document.getElementById('fufu-message')?.focus());}}/>}
     {tab==='overview'&&<LocalizedDiv className="space-y-5">
       <LocalizedDiv className="grid gap-4 md:grid-cols-3">
        <LocalizedDiv className="rounded-3xl bg-gradient-to-br from-blue-950 to-blue-700 p-6 text-white shadow-lg md:col-span-2">
         <LocalizedP className="text-sm text-blue-200">Total CNY balance</LocalizedP>
         <LocalizedP className="mt-2 text-4xl font-bold tabular-nums">{money(totalCash)}</LocalizedP><LocalizedP className="mt-3 text-sm text-blue-200">Balances are kept in original currencies; other currencies are shown separately below.</LocalizedP>
        </LocalizedDiv>
        <LocalizedDiv className="rounded-3xl border border-slate-200 bg-white p-6">
         <LocalizedP className="text-sm text-slate-500">Monthly planned spending</LocalizedP><LocalizedP className="mt-2 text-3xl font-bold">{money(totalBudget)}</LocalizedP>
         <LocalizedP className="mt-3 text-sm text-slate-500">Active subscriptions: {money(monthlySubscriptions)}/month</LocalizedP></LocalizedDiv>
       </LocalizedDiv><LocalizedDiv className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{state.accounts.map(a=><CurrencyAccount row={a} key={String(a.id)}/>)}</LocalizedDiv>
       <LocalizedDiv className="grid gap-5 lg:grid-cols-2"><Pane title="Tuition and obligations">{state.tuition.map(t=><LocalizedP key={String(t.id)} className="flex justify-between gap-2 text-sm"><LocalizedSpan>{String(t.label)}</LocalizedSpan><LocalizedStrong className={t.paid?'text-emerald-700':'text-amber-700'}>{t.paid?'Paid':money(t.amount_minor)}</LocalizedStrong></LocalizedP>)}</Pane>
       <Pane title="Recent ledger activity">{latest.length?latest.slice(0,5).map(t=><LocalizedP key={String(t.id)} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"><LocalizedSpan>{String(t.label)}</LocalizedSpan><LocalizedStrong>{t.direction==='debit'?'−':'+'}{money(t.amount_minor,String(t.currency))}</LocalizedStrong></LocalizedP>):<LocalizedP className="text-sm text-slate-500">No activity yet.</LocalizedP>}</Pane></LocalizedDiv>
     </LocalizedDiv>}
     {tab==='transfers'&&<LocalizedDiv className="grid gap-5 lg:grid-cols-2">
       <Pane title="Transfer between your own accounts" description="">
         <LocalizedDiv className="space-y-4">
          <LocalizedLabel className="block text-sm font-semibold">From<LocalizedSelect className={input} value={sourceId} onChange={e=>{const next=e.target.value;setForm(f=>({...f,source:next,destination:String(state.accounts.find(a=>a.currency===byId(state.accounts,next)?.currency && a.id!==next)?.id??'')}));}}>
            {state.accounts.filter(a=>state.accounts.some(other=>other.id!==a.id&&other.currency===a.currency)).map(a=><LocalizedOption key={String(a.id)} value={String(a.id)}>{String(a.label)} · {money(a.balance_minor,String(a.currency))}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
          <LocalizedLabel className="block text-sm font-semibold">To<LocalizedSelect className={input} value={destinationId} onChange={e=>put('destination',e.target.value)}>
            {state.accounts.filter(a=>a.id!==source?.id && a.currency===source?.currency).map(a=><LocalizedOption key={String(a.id)} value={String(a.id)}>{String(a.label)}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
          <LocalizedLabel className="block text-sm font-semibold">Amount ({String(source?.currency??'CNY')})<LocalizedInput className={input} inputMode="decimal" value={field('amount','800.00')} onChange={e=>put('amount',e.target.value)}/></LocalizedLabel>
          <LocalizedButton className={cta} disabled={busy} onClick={()=>{try{const a={type:'transfer',sourceId,destinationId,amountMinor:toMinor(field('amount','800.00'),String(source?.currency??'CNY'))} as BankProposal;void prepare(a);}catch(e){setError(errorMessage(e))}}}>Review transfer</LocalizedButton>
         </LocalizedDiv></Pane>
       <Pane title="Transaction verification" description="">
         <LocalizedDiv className="space-y-3">{state.ledger.slice(0,12).map(t=><LocalizedDiv key={String(t.id)} className="flex justify-between border-b border-slate-100 pb-3 text-sm">
         <LocalizedSpan>{String(t.label)}<LocalizedSpan className="mt-1 block text-xs text-slate-500">{String(t.classification)}</LocalizedSpan></LocalizedSpan>
         <LocalizedStrong>{t.direction==='debit'?'−':'+'}{money(t.amount_minor,String(t.currency))}</LocalizedStrong></LocalizedDiv>)}</LocalizedDiv>
       </Pane></LocalizedDiv>}
     {tab==='cards'&&<LocalizedDiv className="grid gap-5 md:grid-cols-2">{state.cards.map(c=><Pane key={String(c.id)} title={String(c.label)}>
       <LocalizedDiv className="rounded-2xl bg-gradient-to-br from-slate-950 to-blue-800 px-6 py-5 text-white">
        <LocalizedP className="text-sm font-semibold">福 bank</LocalizedP><LocalizedP className="mt-12 font-mono text-xl tracking-widest">{String(c.masked_number)}</LocalizedP>
        <LocalizedP className="mt-3 text-xs">{c.frozen?'FROZEN':'ACTIVE'}</LocalizedP></LocalizedDiv>
       <LocalizedP className="mt-4 text-sm text-slate-600">Monthly limit: <LocalizedStrong>{money(c.monthly_limit_minor)}</LocalizedStrong></LocalizedP>
       <LocalizedDiv className="mt-4 flex flex-wrap gap-2"><LocalizedButton className={cta} onClick={()=>void prepare({type:'card',cardId:String(c.id),mode:c.frozen?'unfreeze':'freeze'})}>
        {c.frozen?'Review unfreeze':'Review freeze'}</LocalizedButton></LocalizedDiv>
       <LocalizedLabel className="mt-4 block text-sm font-semibold">New monthly limit CNY<LocalizedInput className={input} inputMode="decimal" value={field('card:'+c.id)} placeholder="2000.00" onChange={e=>put('card:'+c.id,e.target.value)}/></LocalizedLabel>
       <LocalizedButton className={sec+' mt-3'} onClick={()=>{try{void prepare({type:'card',cardId:String(c.id),mode:'limit',limitMinor:toMinor(field('card:'+c.id))})}catch(e){setError(errorMessage(e))}}}>Review limit update</LocalizedButton>
     </Pane>)}</LocalizedDiv>}
     {tab==='budgets'&&<LocalizedDiv className="grid gap-5 lg:grid-cols-2">
       <Pane title="Monthly budget caps" description="">
         {state.budgets.map(b=><LocalizedDiv key={String(b.id)} className="border-b border-slate-100 py-3">
           <LocalizedDiv className="flex justify-between text-sm"><LocalizedStrong className="capitalize">{String(b.category)}</LocalizedStrong><LocalizedSpan>{money(b.limit_minor)}</LocalizedSpan></LocalizedDiv>
           <LocalizedDiv className="mt-2 flex gap-2"><LocalizedInput aria-label={'New '+String(b.category)+' cap'} className={input+' !mt-0'} inputMode="decimal" value={field('budget:'+b.category)} onChange={e=>put('budget:'+b.category,e.target.value)} placeholder="CNY amount"/>
           <LocalizedButton className={sec} onClick={()=>{try{void prepare({type:'budget',category:String(b.category),limitMinor:toMinor(field('budget:'+b.category))})}catch(e){setError(errorMessage(e))}}}>Review</LocalizedButton></LocalizedDiv></LocalizedDiv>)}
       </Pane>
       <Pane title="University tuition" description="">
         {state.tuition.map(t=><LocalizedDiv key={String(t.id)}><LocalizedP className="text-sm font-semibold">{String(t.label)}</LocalizedP><LocalizedP className="mt-3 text-2xl font-bold">{money(t.amount_minor)}</LocalizedP>
           <LocalizedP className="mt-2 text-sm text-slate-500">{t.paid?'Already paid':'Outstanding installment'}</LocalizedP>
           {!t.paid&&cny.length>0&&<LocalizedButton className={cta+' mt-4'} onClick={()=>void prepare({type:'tuition',sourceId:sourceId,tuitionId:String(t.id)})}>Review payment</LocalizedButton>}</LocalizedDiv>)}
       </Pane></LocalizedDiv>}
     {tab==='subscriptions'&&<LocalizedDiv className="grid gap-5 md:grid-cols-2">{state.subscriptions.map(s=><Pane key={String(s.id)} title={String(s.merchant)}>
       <LocalizedP className="text-3xl font-bold">{money(s.monthly_minor)}<LocalizedSpan className="text-sm font-normal text-slate-500"> / month</LocalizedSpan></LocalizedP>
       <LocalizedP className="mt-2 text-sm text-slate-600">Status: {s.active?'Active':'Cancelled'}</LocalizedP>
       {s.active===true&&<LocalizedButton className={cta+' mt-4'} onClick={()=>void prepare({type:'subscription',subscriptionId:String(s.id)})}>Review cancellation</LocalizedButton>}
     </Pane>)}</LocalizedDiv>}
     {tab==='wealth'&&<SuitabilityPanel products={state.products}/>}
     {tab==='wealth'&&<LocalizedDiv className="grid gap-5 lg:grid-cols-2">
       <Pane title="Investment products" description="">
         {state.products.map(p=><LocalizedDiv key={String(p.id)} className="border-b border-slate-100 py-4">
           <LocalizedDiv className="flex justify-between"><LocalizedStrong>{String(p.name)}</LocalizedStrong><LocalizedSpan className="text-xs uppercase text-blue-700">{String(p.risk)} risk</LocalizedSpan></LocalizedDiv>
           <LocalizedP className="mt-1 text-sm text-slate-500">{String(p.description)}</LocalizedP>
           <LocalizedButton className={sec+' mt-3'} onClick={()=>put('product',String(p.id))}>Select</LocalizedButton></LocalizedDiv>)}
       </Pane>
       <Pane title="Review investment order">
         <LocalizedLabel className="block text-sm font-semibold">Product<LocalizedSelect className={input} value={field('product',String(state.products[0]?.id))} onChange={e=>put('product',e.target.value)}>
           {state.products.map(p=><LocalizedOption key={String(p.id)} value={String(p.id)}>{String(p.name)}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
         <LocalizedLabel className="mt-4 block text-sm font-semibold">Direction<LocalizedSelect className={input} value={field('direction','buy')} onChange={e=>put('direction',e.target.value)}>
           <LocalizedOption value="buy">Buy</LocalizedOption><LocalizedOption value="redeem">Redeem</LocalizedOption></LocalizedSelect></LocalizedLabel>
         <LocalizedLabel className="mt-4 block text-sm font-semibold">CNY amount<LocalizedInput className={input} value={field('investAmount','500.00')} inputMode="decimal" onChange={e=>put('investAmount',e.target.value)}/></LocalizedLabel>
         <LocalizedButton className={cta+' mt-4'} onClick={()=>{try{void prepare({type:'investment',sourceId,productId:field('product',String(state.products[0]?.id)),direction:field('direction','buy'),amountMinor:toMinor(field('investAmount','500.00'))})}catch(e){setError(errorMessage(e))}}}>Review investment order</LocalizedButton>
         <LocalizedH3 className="mt-7 text-sm font-bold">Holdings</LocalizedH3>
         {state.holdings.map(h=><LocalizedP key={String(h.id)} className="mt-2 text-sm">{String(byId(state.products,String(h.product_id))?.name)}: {money(h.value_minor)}</LocalizedP>)}
       </Pane></LocalizedDiv>}
     {tab==='activity'&&<LocalizedDiv className="grid gap-5 lg:grid-cols-2">
       <Pane title="Immutable-style transaction receipts" description="Read-only activity view. Recorded transfers have debit and credit ledger entries.">
        {state.ledger.map(t=><LocalizedDiv key={String(t.id)} className="border-b border-slate-100 py-3 text-sm">
         <LocalizedDiv className="flex justify-between"><LocalizedStrong>{String(t.label)}</LocalizedStrong><LocalizedSpan>{t.direction==='debit'?'−':'+'}{money(t.amount_minor,String(t.currency))}</LocalizedSpan></LocalizedDiv>
         <LocalizedP className="mt-1 text-xs text-slate-500">{String(t.created_at)} · {String(t.action_id)}</LocalizedP></LocalizedDiv>)}
       </Pane><Pane title="Server-side action audit">
        {state.audit.map(e=><LocalizedDiv key={String(e.id)} className="border-b border-slate-100 py-3 text-sm">
          <LocalizedP className="font-semibold">{String(e.event)}</LocalizedP><LocalizedP className="mt-1 text-xs text-slate-500">{String(e.created_at)} · {String(e.action_id)}</LocalizedP><details><summary>Decision and execution details</summary><pre className="overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(e.detail,null,2)}</pre></details>
        </LocalizedDiv>)}
       </Pane></LocalizedDiv>}
    </>}
    {error&&<LocalizedP role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</LocalizedP>}
    {notice&&<LocalizedP role="status" className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{notice}</LocalizedP>}
    {pending&&<LocalizedDiv role="dialog" aria-modal="true" aria-label="Confirm action" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
      <LocalizedSection className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
       <LocalizedP className="text-xs font-bold uppercase tracking-widest text-blue-700">Review & confirm</LocalizedP>
       <LocalizedH2 className="mt-2 text-2xl font-bold">Approve this exact change?</LocalizedH2>
       <LocalizedP className="mt-3 text-sm text-slate-600">This confirmation expires in {pending.expiresInSeconds} seconds.</LocalizedP>
       <LocalizedDl className="mt-4 space-y-3 text-sm">{Object.entries(pending.payload).filter(([key])=>key!=='type').map(([key,value])=>{
         const labels:Record<string,string>={sourceId:'From',destinationId:'To',tuitionId:'Tuition',productId:'Product',cardId:'Card',subscriptionId:'Subscription',amountMinor:'Amount',limitMinor:'Limit',direction:'Order',mode:'Change',category:'Category'};
         const record=byId([...state.accounts,...state.products,...state.cards,...state.subscriptions,...state.tuition],value);
         const display=key==='amountMinor'||key==='limitMinor'?money(value,String(source?.currency??'CNY')):String(record?.label??record?.name??record?.masked_number??value);
         return <LocalizedDiv className="flex justify-between gap-4" key={key}><LocalizedDt className="text-slate-500">{labels[key]??key}</LocalizedDt><LocalizedDd className="break-words text-right font-medium capitalize">{display}</LocalizedDd></LocalizedDiv>;
       })}</LocalizedDl>
       <LocalizedDiv className="mt-6 flex flex-wrap gap-3">
        <ActionVerification key={pending.id} actionId={pending.id} onReady={setActionReady}/><LocalizedButton className={cta} disabled={busy||!actionReady} onClick={()=>void decide(true)}>Confirm</LocalizedButton>
        <LocalizedButton className={sec} disabled={busy} onClick={()=>void decide(false)}>Reject without changes</LocalizedButton>
       </LocalizedDiv>
      </LocalizedSection>
    </LocalizedDiv>}

   </LocalizedDiv>
 </LocalizedDiv>;
}


