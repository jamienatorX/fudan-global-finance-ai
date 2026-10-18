import { describe,expect,it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { money } from '../../src/domain/money';
import { parseMajorAmount,referenceConversion,projectedRunway } from '../../src/features/demo/planning-helpers';

describe('demo international planning',()=>{
 const s=createSeedSnapshot('v1');
 it('converts exact minor units using labeled inverse reference rates',()=>{
   expect(parseMajorAmount('100.25','CNY')).toBe('10025');
   expect(()=>parseMajorAmount('1.2','IDR')).toThrow();
   expect(referenceConversion(money(10_000_000n,'IDR'),'CNY',s.exchangeRates)).toMatchObject({amount:money(454_545n,'CNY')});
   expect(referenceConversion(money(5_000n,'USD'),'SGD',s.exchangeRates).amount).toEqual(money(6574n,'SGD'));
   expect(referenceConversion(money(1_000_000n,'IDR'),'USD',s.exchangeRates).amount).toEqual(money(6402n,'USD'));
   for(const from of ['CNY','IDR','USD','SGD'] as const){
     for(const to of ['CNY','IDR','USD','SGD'] as const){
       expect(referenceConversion(money(100000000n,from),to,s.exchangeRates).amount.currency).toBe(to);
     }
   }
 });
 it('makes runway one-off tuition separate from recurring caps',()=>{
   const p=projectedRunway(s);
   expect(p.monthly.amountMinor).toBe(520000n);
   expect(p.due.amountMinor).toBe(500000n);
   expect(p.available.amountMinor).toBe(3866936n);
   expect(p.months).toBe(6.5);
   const noBudgets=projectedRunway({...s,budgets:[]});
   expect(noBudgets.months).toBeNull();
   const after={...s,budgets:s.budgets.map(b=>b.category==='shopping'?{...b,limit:money(46400n,'CNY')}:b),
     subscriptions:s.subscriptions.map(sub=>sub.merchant==='Campus Video'?{...sub,status:'cancelled' as const}:sub)};
   expect(projectedRunway(after).monthly.amountMinor).toBe(501600n);
 });
});
