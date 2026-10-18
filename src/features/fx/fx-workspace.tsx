'use client';

import { ArrowLeftRight, ArrowRight, Clock3, Globe2, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDemo } from '../../demo/demo-context';
import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from '../../domain/currency';
import { money } from '../../domain/money';
import { referenceConversion } from '../demo/planning-helpers';

type CurrencyOption = Readonly<{ code: string; name: string }>;
type Quote = Readonly<{ base: string; quote: string; rate: number; date: string; source: string; provider: string }>;
const CORE = new Set(Object.keys(CURRENCY_MINOR_DIGITS));
const CURRENCIES: CurrencyOption[] = [
  {code:'AUD',name:'Australian Dollar'}, {code:'CAD',name:'Canadian Dollar'},
  {code:'CHF',name:'Swiss Franc'}, {code:'CNY',name:'Chinese Yuan'},
  {code:'EUR',name:'Euro'}, {code:'GBP',name:'British Pound'},
  {code:'HKD',name:'Hong Kong Dollar'}, {code:'IDR',name:'Indonesian Rupiah'},
  {code:'INR',name:'Indian Rupee'}, {code:'JPY',name:'Japanese Yen'},
  {code:'KRW',name:'South Korean Won'}, {code:'MYR',name:'Malaysian Ringgit'},
  {code:'NZD',name:'New Zealand Dollar'}, {code:'PHP',name:'Philippine Peso'},
  {code:'SGD',name:'Singapore Dollar'}, {code:'THB',name:'Thai Baht'},
  {code:'TWD',name:'New Taiwan Dollar'}, {code:'USD',name:'US Dollar'},
  {code:'VND',name:'Vietnamese Dong'},
];
const FAVORITES = [
  ['USD','CNY'], ['CNY','IDR'], ['SGD','CNY'],
  ['USD','SGD'], ['USD','IDR'], ['EUR','USD'], ['USD','JPY'], ['GBP','CNY'],
] as const;
const panel = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7';
const input = 'mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

function decimalPlaces(code: string): number {
  try {return new Intl.NumberFormat('en-US',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits ?? 2;}
  catch {return 2;}
}
function format(value: number, code: string) {
  try {
    return new Intl.NumberFormat('en-US',{style:'currency',currency:code,currencyDisplay:'code',
      maximumFractionDigits:decimalPlaces(code),minimumFractionDigits:decimalPlaces(code)}).format(value);
  } catch{return code+' '+value.toLocaleString('en-US');}
}
function niceRate(rate:number) {
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:10,minimumSignificantDigits:2,maximumSignificantDigits:10}).format(rate);
}
function parseInput(raw: string) {
  if (!/^\d{0,10}(?:\.\d{0,6})?$/.test(raw) || !raw || raw==='.') return null;
  const value=Number(raw);
  return Number.isFinite(value) && value>=0 && value<=1_000_000_000 ? value : null;
}
function localQuote(base: string, quote: string, rates: Parameters<typeof referenceConversion>[2]): Quote | null {
  if (!CORE.has(base)||!CORE.has(quote))return null;
  try {
    const code=base as CurrencyCode,to=quote as CurrencyCode;
    const precision=BigInt(CURRENCY_MINOR_DIGITS[code]);
    // Use a large reference amount so zero-decimal currencies have meaningful precision.
    const unit=10n**precision*100_000_000n;
    const output=referenceConversion(money(unit,code),to,rates);
    const targetScale=10**CURRENCY_MINOR_DIGITS[to];
    return {base,quote,rate:Number(output.amount.amountMinor)/targetScale/100_000_000,
      date: output.referenceAt.slice(0,10),source:base===quote?'identity':'fallback',
      provider:base===quote?'Identity conversion':'Fictional seed via '+('via' in output && typeof output.via === 'number' && output.via>1?'cross-rate':'direct/inverse rate')};
  } catch {return null;}
}

export function FxWorkspace() {
  const { snapshot } = useDemo();
  const [base,setBase]=useState('USD');
  const [quote,setQuote]=useState('CNY');
  const [amount,setAmount]=useState('100');
  const [catalog,setCatalog]=useState<CurrencyOption[]>(CURRENCIES);
  const [catalogNote,setCatalogNote]=useState('Loading supported currencies…');
  const [rate,setRate]=useState<Quote|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [refreshId,setRefreshId]=useState(0);
  const value=useMemo(()=>parseInput(amount),[amount]);

  useEffect(()=>{
    const controller=new AbortController();
    async function loadCurrencies(){
      try {
        const response=await fetch('/api/fx/currencies',{signal:controller.signal});
        if(!response.ok)throw new Error('Catalog unavailable');
        const data=await response.json() as {currencies?:CurrencyOption[];source?:string;warning?:string};
        const list=(data.currencies??[]).filter(c=>/^[A-Z]{3}$/.test(c.code)&&typeof c.name==='string')
          .toSorted((a,b)=>a.code.localeCompare(b.code));
        if(list.length) setCatalog(list);
        setCatalogNote(data.source==='live-catalog'?list.length+' published currencies available':'Common currency list · provider temporarily unavailable');
      }catch{if(!controller.signal.aborted)setCatalogNote('Common currency list · provider temporarily unavailable');}
    }
    void loadCurrencies();return ()=>controller.abort();
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    // Always show the source of the current selection, never a stale previous quote.
    async function loadRate(){
      setLoading(true);setRate(null);setError('');
      try {
        const response=await fetch('/api/fx/rate?base='+encodeURIComponent(base)+'&quote='+encodeURIComponent(quote),
          {signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error('Reference rates are not currently available for '+base+'/'+quote);
        const data=await response.json() as Quote;
        if (controller.signal.aborted)return;
        if (!Number.isFinite(data.rate)||data.rate<=0||data.base!==base||data.quote!==quote)throw new Error('Invalid exchange-rate response');
        setRate(data);
      }catch(e){
        if(controller.signal.aborted)return;
        const fallback=localQuote(base,quote,snapshot.exchangeRates);
        if(fallback){setRate(fallback);setError('Live reference unavailable. Showing the historical fictional demo fixture instead.');}
        else setError(e instanceof Error?e.message:'Currency quote unavailable');
      }finally{if(!controller.signal.aborted)setLoading(false);}
    }
    void loadRate();
    return ()=>controller.abort();
  },[base,quote,refreshId,snapshot.exchangeRates]);

  const result=rate&&value!==null ? value*rate.rate : null;
  const isFallback=rate?.source==='fallback';
  const referenceDate=rate?.date ?? '';
  const commonOptions=catalog.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>);
  const selectedName=(code:string)=>catalog.find(c=>c.code===code)?.name??code;
  const selectPair=(from:string,to:string)=>{setBase(from);setQuote(to);};
  const swap=()=>{setBase(quote);setQuote(base);};

  return <div className="space-y-6 pb-14">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white sm:p-9">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200"><Globe2 size={17}/> Global currency desk</div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Convert between global currencies</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
        Compare the latest published mid-market reference rates across global currencies, with no API key or subscription.
        Live reference rates update according to their providers&apos; publication schedules, not on every market tick.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100"><ShieldCheck size={13} className="mr-1 inline"/>No real exchange or remittance</span>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100"><Clock3 size={13} className="mr-1 inline"/>Dated reference quotes</span>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100">{catalogNote}</span>
      </div>
    </header>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
      <section className={panel} aria-label="Currency converter">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold text-slate-950">Currency converter</h2><p className="mt-1 text-sm text-slate-500">Choose any available pair and enter an amount.</p></div>
          <button type="button" aria-label="Refresh reference rate" onClick={()=>setRefreshId(i=>i+1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="mt-7 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <label className="text-sm font-semibold text-slate-700">From
            <select aria-label="From currency" className={input} value={base} onChange={e=>setBase(e.target.value)}>{commonOptions}</select>
          </label>
          <button type="button" aria-label="Swap currencies" onClick={swap}
            className="mx-auto grid size-12 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 hover:rotate-180"><ArrowLeftRight size={19}/></button>
          <label className="text-sm font-semibold text-slate-700">To
            <select aria-label="To currency" className={input} value={quote} onChange={e=>setQuote(e.target.value)}>{commonOptions}</select>
          </label>
        </div>
        <label className="mt-6 block text-sm font-semibold text-slate-700">Amount in {selectedName(base)}
          <input className={input} inputMode="decimal" aria-label="Amount to convert" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100.00" />
        </label>
        {value===null&&<p role="alert" className="mt-2 text-sm text-red-700">Enter a valid non-negative amount, up to 1 billion, with up to 6 decimal places.</p>}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5 sm:p-6" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Reference conversion</p>
          <div className="mt-2 min-h-14">
            {loading ? <p role="status" className="py-3 text-sm text-slate-500">Checking the latest published rate…</p> :
             result===null ? <p className="py-3 text-sm text-slate-500">Conversion unavailable for this selection.</p> :
             <strong className="break-all text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">{format(result,quote)}</strong>}
          </div>
          {rate&&!loading&&<div className="mt-4 space-y-2 border-t border-blue-100 pt-4 text-sm text-slate-700">
            <p>1 {base} ≈ <strong>{niceRate(rate.rate)} {quote}</strong></p>
            <p className="text-xs text-slate-500">{rate.provider} · Reference date {referenceDate||'not applicable'}</p>
            <p className={'text-xs font-bold '+(isFallback?'text-amber-800':'text-emerald-700')}>
              {isFallback?'FALLBACK · fictional historical fixture':rate.source==='identity'?'Identity conversion':'Latest published reference rate · cached up to one hour'}
            </p>
          </div>}
        </div>
        {error&&<p role={isFallback?'status':'alert'} className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <p className="mt-4 text-xs leading-5 text-slate-500">Indicative only: real exchange providers apply spreads, fees, cutoffs, and verification. No payment or money transfer is initiated.</p>
      </section>
      <section className={panel}>
        <div className="flex items-center gap-2 text-blue-700"><TrendingUp size={20}/><h2 className="text-xl font-bold text-slate-950">Popular currency pairs</h2></div>
        <p className="mt-2 text-sm text-slate-500">Quickly compare rates relevant to international students and cross-border planning.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {FAVORITES.map(([from,to])=><button type="button" key={from+'-'+to} onClick={()=>selectPair(from,to)}
            aria-pressed={base===from&&quote===to}
            className={'flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors '+
              (base===from&&quote===to?'border-blue-400 bg-blue-50':'border-slate-200 bg-white hover:bg-slate-50')}>
            <span className="font-semibold text-slate-900">{from} <ArrowRight size={14} className="mx-1 inline text-blue-600"/> {to}</span>
            <span className="text-xs text-slate-500">{base===from&&quote===to?'Selected':'View rate'}</span>
          </button>)}
        </div>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900">Offline support</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            When the provider is unavailable, CNY, IDR, USD, and SGD pairs remain convertible using clearly marked fictional
            reference data. Other currencies display an unavailable status rather than an invented price.
          </p>
        </div>
      </section>
    </div>
  </div>;
}
