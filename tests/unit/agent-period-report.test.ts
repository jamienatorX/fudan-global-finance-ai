import {expect,it} from 'vitest';
import {buildAgentReport,assessSuitability} from '../../src/agent/period-report';
import type {AgentContext,AgentTransaction} from '../../src/agent/contracts';
const row=(id:string,date:string,amountMinor='1000',currency='CNY'):AgentTransaction=>({id,date,amountMinor,currency,accountId:'a',merchant:'Shop',category:'food',direction:'debit',classification:'consumption',settled:true});
const context=(transactions:AgentTransaction[]):AgentContext=>({source:'fixture',asOf:'2026-10-27T00:00:00Z',version:0,coverage:{from:'2026-01-01',to:'2026-10-27',truncated:false},transactions,cards:[],subscriptions:[]});
it('reports annual consumption by currency without mixing transfers or double counting IDs',()=>{
 const c=context([row('a','2026-01-01'),row('b','2026-10-01','2000'),row('c','2026-10-01','50','IDR'),{...row('d','2026-10-01'),classification:'internal-transfer'},row('a','2026-01-01')]);
 const r=buildAgentReport(c,'2026');expect(r.totals).toEqual({CNY:'3000',IDR:'50'});expect(r.completePeriod).toBe(false);expect(r.categories.CNY.food).toBe('3000');expect(r.evidenceIds).toEqual(['a','b','c']);
});
it('uses only earlier settled same-account/currency/category history for anomaly baselines',()=>{
 const prior=Array.from({length:10},(_,i)=>row('p'+i,'2026-09-'+String(i+1).padStart(2,'0')));
 const r=buildAgentReport(context([...prior,row('large','2026-10-01','20000'),row('small','2026-10-02','1000')]),'2026-10');
 expect(r.anomalies.map(a=>a.transactionId)).toEqual(['large']);expect(r.anomalies[0]).toMatchObject({baselineCount:10,medianMinor:'1000'});
 expect(buildAgentReport(context([row('a','2026-10-01','20000')]),'2026-10').anomalies).toEqual([]);
});
it('rejects invalid periods and discloses truncated history',()=>{
 for(const p of ['2026-13','2026-1','2026-02-30','abc'])expect(()=>buildAgentReport(context([]),p)).toThrow('INVALID_PERIOD');
 const c=context([]);c.coverage.truncated=true;expect(buildAgentReport(c,'2026-10').warnings.join(' ')).toMatch(/truncated/i);
});
it('scores suitability conservatively using capacity, horizon and tolerance',()=>{
 expect(assessSuitability({horizonYears:5,lossTolerancePercent:30,emergencyMonths:6,experience:2})).toMatchObject({risk:'high'});
 expect(assessSuitability({horizonYears:5,lossTolerancePercent:30,emergencyMonths:0,experience:2})).toMatchObject({risk:'low'});
 expect(()=>assessSuitability({horizonYears:5,lossTolerancePercent:Infinity,emergencyMonths:6,experience:2})).toThrow();
});
it('uses Shanghai calendar boundaries and excludes transactions later than the snapshot',()=>{
 const c=context([row('october','2026-09-30T16:30:00Z'),row('september','2026-09-30T15:30:00Z'),row('future','2026-10-27T02:00:00Z')]);
 const report=buildAgentReport(c,'2026-10');expect(report.evidenceIds).toEqual(['october']);expect(report.totals).toEqual({CNY:'1000'});
});
