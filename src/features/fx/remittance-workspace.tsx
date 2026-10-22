'use client';
import { LocalizedButton, LocalizedDd, LocalizedDiv, LocalizedDl, LocalizedDt, LocalizedInput, LocalizedLabel, LocalizedP } from '../../i18n/localized';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useDemo} from '../../demo/demo-context';
import {formatMoney} from '../../domain/money';
import {parseMajorAmount} from '../demo/planning-helpers';
import {ratesFromQuotes,useFxReference} from './fx-reference-context';
import {rateComparison,remittanceQuote} from './remittance';
import {useRateHistory} from './use-rate-history';
import {Card,CardHeader} from '../../components/ui/card';
export function RemittanceWorkspace(){
 const {snapshot,request}=useDemo();const params=useSearchParams();
 const [direction,setDirection]=useState<'receive'|'send'>(params.get('direction')==='send'?'send':'receive');
 const [amount,setAmount]=useState('1000000');const [error,setError]=useState('');
 const reference=useFxReference();const history=useRateHistory();const rates=ratesFromQuotes(snapshot.exchangeRates,reference.quotes);
 const from=direction==='receive'?'IDR':'CNY';const to=direction==='receive'?'CNY':'IDR';
 const source=snapshot.accounts.find(a=>a.status==='active'&&a.currency===from);const destination=snapshot.accounts.find(a=>a.status==='active'&&a.currency===to);
 let quote:ReturnType<typeof remittanceQuote>|null=null;let problem='';
 try{quote=remittanceQuote(BigInt(parseMajorAmount(amount,from)),direction,rates);}catch(e){problem=e instanceof Error?e.message:'Check amount';}
 const current=Number(rates.find(r=>r.base==='CNY'&&r.quote==='IDR')?.rate);const comparison=reference.status==='live'?rateComparison(current,history,direction):null;
 return <Card className="student-panel" aria-label="Sandbox remittance"><CardHeader title="Receive from home / Send home" eyebrow="Sandbox · fictional funds"/>
 <LocalizedDiv className="student-tool-body"><LocalizedDiv className="student-toggle">{(['receive','send'] as const).map(d=><LocalizedButton key={d} aria-pressed={direction===d} onClick={()=>{setDirection(d);setAmount(d==='receive'?'1000000':'500');setError('');}}>{d==='receive'?'Receive from home':'Send home'}</LocalizedButton>)}</LocalizedDiv>
 <LocalizedP className="student-note">Moves fictional money between your own {from} and {to} demo accounts. No parent, bank or payment provider is contacted.</LocalizedP>
 <LocalizedLabel>Amount ({from})<LocalizedInput aria-label="Remittance amount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></LocalizedLabel>
 <LocalizedP>Rate: 1 CNY ≈ {Number.isFinite(current)?current.toLocaleString('en-US',{maximumFractionDigits:4}):'Unavailable'} IDR · {reference.status==='live'?`Published ${reference.date}`:'Sample sandbox rate'}</LocalizedP>
 {comparison?<LocalizedP>{Math.abs(comparison.improvementPercent).toFixed(1)}% {comparison.improvementPercent>=0?'better':'worse'} than the 30-day mean ({comparison.observations} published observations).</LocalizedP>:<LocalizedP className="student-muted">Insufficient published history for a 30-day comparison.</LocalizedP>}
 {quote?<LocalizedDl className="student-key-values"><LocalizedDiv><LocalizedDt>You send</LocalizedDt><LocalizedDd>{formatMoney(quote.source)}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Illustrative fee · 0.35% + {from==='IDR'?'IDR 5,000':'CNY 2.00'}</LocalizedDt><LocalizedDd>{formatMoney(quote.fee)}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Recipient demo account gets</LocalizedDt><LocalizedDd>{formatMoney(quote.destination)}</LocalizedDd></LocalizedDiv><LocalizedDiv><LocalizedDt>Estimated arrival</LocalizedDt><LocalizedDd>Instant in sandbox; real-world example 1–2 business days</LocalizedDd></LocalizedDiv></LocalizedDl>:<LocalizedP role="status">{problem}</LocalizedP>}
 <LocalizedButton className="invest-button" disabled={!quote||!source||!destination} onClick={()=>{try{request({type:'remittance',sourceId:source!.id,destinationId:destination!.id,amountMinor:quote!.source.amountMinor.toString(),rate:String(current),referenceAt:reference.date??snapshot.exchangeRates[0].referenceAt.slice(0,10),direction});setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to prepare quote');}}}>Review sandbox remittance</LocalizedButton>
 {error?<LocalizedP role="alert">{error}</LocalizedP>:null}</LocalizedDiv></Card>;
}
