'use client';
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
 <div className="student-tool-body"><div className="student-toggle">{(['receive','send'] as const).map(d=><button key={d} aria-pressed={direction===d} onClick={()=>{setDirection(d);setAmount(d==='receive'?'1000000':'500');setError('');}}>{d==='receive'?'Receive from home':'Send home'}</button>)}</div>
 <p className="student-note">Moves fictional money between your own {from} and {to} demo accounts. No parent, bank or payment provider is contacted.</p>
 <label>Amount ({from})<input aria-label="Remittance amount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <p>Rate: 1 CNY ≈ {Number.isFinite(current)?current.toLocaleString('en-US',{maximumFractionDigits:4}):'Unavailable'} IDR · {reference.status==='live'?`Published ${reference.date}`:'Sample sandbox rate'}</p>
 {comparison?<p>{Math.abs(comparison.improvementPercent).toFixed(1)}% {comparison.improvementPercent>=0?'better':'worse'} than the 30-day mean ({comparison.observations} published observations).</p>:<p className="student-muted">Insufficient published history for a 30-day comparison.</p>}
 {quote?<dl className="student-key-values"><div><dt>You send</dt><dd>{formatMoney(quote.source)}</dd></div><div><dt>Illustrative fee · 0.35% + {from==='IDR'?'IDR 5,000':'CNY 2.00'}</dt><dd>{formatMoney(quote.fee)}</dd></div><div><dt>Recipient demo account gets</dt><dd>{formatMoney(quote.destination)}</dd></div><div><dt>Estimated arrival</dt><dd>Instant in sandbox; real-world example 1–2 business days</dd></div></dl>:<p role="status">{problem}</p>}
 <button className="invest-button" disabled={!quote||!source||!destination} onClick={()=>{try{request({type:'remittance',sourceId:source!.id,destinationId:destination!.id,amountMinor:quote!.source.amountMinor.toString(),rate:String(current),referenceAt:reference.date??snapshot.exchangeRates[0].referenceAt.slice(0,10),direction});setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to prepare quote');}}}>Review sandbox remittance</button>
 {error?<p role="alert">{error}</p>:null}</div></Card>;
}
