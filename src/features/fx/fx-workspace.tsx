'use client';

import { LocalizedButton, LocalizedDiv, LocalizedH1, LocalizedH2, LocalizedHeader, LocalizedInput, LocalizedLabel, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
import { ArrowLeftRight, ArrowRight, Clock3, Globe2, RefreshCw, TrendingUp } from 'lucide-react';
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
      provider:base===quote?'Same currency':'Fictional seed via '+('via' in output && typeof output.via === 'number' && output.via>1?'cross-rate':'direct/inverse rate')};
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
        if(fallback){setRate(fallback);setError('Live rates are unavailable. A sample rate is shown.');}
        else setError(e instanceof Error?e.message:'Currency quote unavailable');
      }finally{if(!controller.signal.aborted)setLoading(false);}
    }
    void loadRate();
    return ()=>controller.abort();
  },[base,quote,refreshId,snapshot.exchangeRates]);

  const result=rate&&value!==null ? value*rate.rate : null;
  const isFallback=rate?.source==='fallback';
  const referenceDate=rate?.date ?? '';
  const commonOptions=catalog.map(c=><LocalizedOption key={c.code} value={c.code}>{c.code} — {c.name}</LocalizedOption>);
  const selectedName=(code:string)=>catalog.find(c=>c.code===code)?.name??code;
  const selectPair=(from:string,to:string)=>{setBase(from);setQuote(to);};
  const swap=()=>{setBase(quote);setQuote(base);};

  return <LocalizedDiv className="space-y-6 pb-14">
    <LocalizedHeader className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white sm:p-9">
      <LocalizedDiv className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200"><Globe2 size={17}/> Global currency desk</LocalizedDiv>
      <LocalizedH1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Convert between global currencies</LocalizedH1>

      <LocalizedDiv className="mt-5 flex flex-wrap gap-2">
        <LocalizedSpan className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100"><Clock3 size={13} className="mr-1 inline"/>Dated reference quotes</LocalizedSpan>
        <LocalizedSpan className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100">{catalogNote}</LocalizedSpan>
      </LocalizedDiv>
    </LocalizedHeader>
    <LocalizedDiv className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
      <LocalizedSection className={panel} aria-label="Currency converter">
        <LocalizedDiv className="flex flex-wrap items-center justify-between gap-3">
          <LocalizedDiv><LocalizedH2 className="text-xl font-bold text-slate-950">Currency converter</LocalizedH2><LocalizedP className="mt-1 text-sm text-slate-500">Choose any available pair and enter an amount.</LocalizedP></LocalizedDiv>
          <LocalizedButton type="button" aria-label="Refresh reference rate" onClick={()=>setRefreshId(i=>i+1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16}/> Refresh</LocalizedButton>
        </LocalizedDiv>
        <LocalizedDiv className="mt-7 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <LocalizedLabel className="text-sm font-semibold text-slate-700">From
            <LocalizedSelect aria-label="From currency" className={input} value={base} onChange={e=>setBase(e.target.value)}>{commonOptions}</LocalizedSelect>
          </LocalizedLabel>
          <LocalizedButton type="button" aria-label="Swap currencies" onClick={swap}
            className="mx-auto grid size-12 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 hover:rotate-180"><ArrowLeftRight size={19}/></LocalizedButton>
          <LocalizedLabel className="text-sm font-semibold text-slate-700">To
            <LocalizedSelect aria-label="To currency" className={input} value={quote} onChange={e=>setQuote(e.target.value)}>{commonOptions}</LocalizedSelect>
          </LocalizedLabel>
        </LocalizedDiv>
        <LocalizedLabel className="mt-6 block text-sm font-semibold text-slate-700">Amount in {selectedName(base)}
          <LocalizedInput className={input} inputMode="decimal" aria-label="Amount to convert" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100.00" />
        </LocalizedLabel>
        {value===null&&<LocalizedP role="alert" className="mt-2 text-sm text-red-700">Enter a valid non-negative amount, up to 1 billion, with up to 6 decimal places.</LocalizedP>}
        <LocalizedDiv className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5 sm:p-6" aria-live="polite">
          <LocalizedP className="text-xs font-bold uppercase tracking-wider text-blue-700">Reference conversion</LocalizedP>
          <LocalizedDiv className="mt-2 min-h-14">
            {loading ? <LocalizedP role="status" className="py-3 text-sm text-slate-500">Checking the latest published rate…</LocalizedP> :
             result===null ? <LocalizedP className="py-3 text-sm text-slate-500">Conversion unavailable for this selection.</LocalizedP> :
             <LocalizedStrong className="break-all text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">{format(result,quote)}</LocalizedStrong>}
          </LocalizedDiv>
          {rate&&!loading&&<LocalizedDiv className="mt-4 space-y-2 border-t border-blue-100 pt-4 text-sm text-slate-700">
            <LocalizedP>1 {base} ≈ <LocalizedStrong>{niceRate(rate.rate)} {quote}</LocalizedStrong></LocalizedP>
            <LocalizedP className="text-xs text-slate-500">{isFallback?'Sample rate':rate.provider} · {referenceDate||'Same currency'}</LocalizedP>
            <LocalizedP className={'text-xs font-bold '+(isFallback?'text-amber-800':'text-emerald-700')}>
              {isFallback?'Sample rate · not live':rate.source==='identity'?'Same currency':'Published reference rate'}
            </LocalizedP>
          </LocalizedDiv>}
        </LocalizedDiv>
        {error&&<LocalizedP role={isFallback?'status':'alert'} className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</LocalizedP>}
      </LocalizedSection>
      <LocalizedSection className={panel}>
        <LocalizedDiv className="flex items-center gap-2 text-blue-700"><TrendingUp size={20}/><LocalizedH2 className="text-xl font-bold text-slate-950">Popular currency pairs</LocalizedH2></LocalizedDiv>
        <LocalizedP className="mt-2 text-sm text-slate-500">Quickly compare rates relevant to international students and cross-border planning.</LocalizedP>
        <LocalizedDiv className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {FAVORITES.map(([from,to])=><LocalizedButton type="button" key={from+'-'+to} onClick={()=>selectPair(from,to)}
            aria-pressed={base===from&&quote===to}
            className={'flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors '+
              (base===from&&quote===to?'border-blue-400 bg-blue-50':'border-slate-200 bg-white hover:bg-slate-50')}>
            <LocalizedSpan className="font-semibold text-slate-900">{from} <ArrowRight size={14} className="mx-1 inline text-blue-600"/> {to}</LocalizedSpan>
            <LocalizedSpan className="text-xs text-slate-500">{base===from&&quote===to?'Selected':'View rate'}</LocalizedSpan>
          </LocalizedButton>)}
        </LocalizedDiv>
      </LocalizedSection>
    </LocalizedDiv>
  </LocalizedDiv>;
}

