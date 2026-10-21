'use client';
import { LocalizedDetails, LocalizedDiv, LocalizedP, LocalizedSpan, LocalizedStrong, LocalizedSummary } from '../../i18n/localized';
import {Card,CardHeader} from '../../components/ui/card';
import {AccountLink as Link} from '../../components/shell/account-link';
import {useDemo} from '../../demo/demo-context';
import {formatMoney,money} from '../../domain/money';
import {referenceConversion} from '../demo/planning-helpers';
import {ratesFromQuotes,useFxReference} from '../fx/fx-reference-context';
import {rateComparison} from '../fx/remittance';
import {useRateHistory} from '../fx/use-rate-history';
import type {OverviewModel} from './overview-queries';
export function TuitionFxCard({overview:o,compact=false}:{overview:OverviewModel;compact?:boolean}){
 const {snapshot}=useDemo();const reference=useFxReference();const history=useRateHistory();
 const rates=ratesFromQuotes(snapshot.exchangeRates,reference.quotes);
 const idr=referenceConversion(o.tuition.outstanding,'IDR',rates).amount;
 const current=Number(rates.find(r=>r.base==='CNY'&&r.quote==='IDR')?.rate);
 const comparison=reference.status==='live'?rateComparison(current,history,'receive'):null;
 const scenario=(rate:number)=>formatMoney(money((o.tuition.outstanding.amountMinor*BigInt(Math.round(rate*1000000))+50000000n)/100000000n,'IDR'));
 return <Card className="student-panel tuition-summary"><CardHeader title="Upcoming tuition" eyebrow="CNY tuition · IDR funding estimate" action={<Link href="/planner" className="student-link">Plan payment</Link>}/>
 <LocalizedDiv className="student-tuition-values"><LocalizedStrong>{formatMoney(o.tuition.outstanding)}</LocalizedStrong><LocalizedSpan>≈ {formatMoney(idr)}</LocalizedSpan></LocalizedDiv>
 <LocalizedP className="student-note">{o.tuition.next?`${o.tuition.next.institution} · ${o.tuition.next.installment} · due ${o.tuition.next.dueAt.slice(0,10)}`:'No unpaid tuition.'}</LocalizedP>
 <LocalizedP className="student-note"><LocalizedSpan>{reference.status==='live'?`Latest published reference: ${reference.date}.`:reference.status==='loading'?'Checking published rates; a sample estimate is shown while loading.':'Sample sandbox rate; current published rate unavailable.'}</LocalizedSpan> Estimate excludes remittance fees.</LocalizedP>
 <LocalizedDetails className="student-tuition-scenarios" open={!compact}><LocalizedSummary>Convert now vs later</LocalizedSummary>
 <LocalizedP>Convert now reference: {formatMoney(idr)}. Later rates are unknown.</LocalizedP>
 {comparison?<><LocalizedP>30-day mean scenario: {scenario(comparison.average)} ({comparison.observations} published observations).</LocalizedP><LocalizedP>If rates revisit the observed low: {scenario(Math.min(...history.map(p=>p.rate)))}. Observed high: {scenario(Math.max(...history.map(p=>p.rate)))}.</LocalizedP></>:<LocalizedP>Insufficient recent published history for a meaningful comparison.</LocalizedP>}
 <LocalizedP>Scenarios reuse past observations; they are not forecasts or a recommendation to time FX.</LocalizedP>
 <Link href="/transfers?direction=receive" className="student-link">Review a sandbox conversion →</Link></LocalizedDetails>
 </Card>;
}
