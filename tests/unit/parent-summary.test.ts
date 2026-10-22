import { describe, expect, it } from 'vitest';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import type { FinancialRepository } from '../../src/domain/financial-repository';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { buildParentSummary, encodeParentSummary, decodeParentSummary, reportMonthAt } from '../../src/features/reports/parent-summary';
const snapshot = createSeedSnapshot('v1');
async function report() {
  const model = await getOverviewModel({getSnapshot:async()=>snapshot} as unknown as FinancialRepository,DEMO_USER_ID);
  return buildParentSummary(snapshot,model,'2026-10','CNY');
}
describe('parent summary',()=>{
  it('reconciles consumption categories and includes snapshot tuition in report currency',async()=>{
    const value = await report();
    expect(value.spendingMinor).toBe('520000');
    expect(value.categories.reduce((sum,row)=>sum+BigInt(row.amountMinor),0n)).toBe(520000n);
    expect(value.tuition?.outstandingMinor).toBeTruthy();
    expect(JSON.stringify(value)).not.toContain('merchant');
  });
  it('round trips a bounded aggregate without identity or transactions',async()=>{
    const value = await report();
    expect(decodeParentSummary('#report='+encodeParentSummary(value))).toEqual(value);
    expect(Object.keys(value)).not.toContain('transactions');
  });
  it('rejects unexpected data, invalid totals, dates, currencies and oversized links',async()=>{
    const value = await report();
    for(const invalid of [{...value,version:2},{...value,merchant:'secret'},{...value,spendingMinor:'-1'},{...value,currency:'EUR'},{...value,asOf:'2026-02-30T00:00:00.000Z'},{...value,categories:[]}]) expect(()=>encodeParentSummary(invalid as never)).toThrow();
    expect(()=>decodeParentSummary('A'.repeat(22000))).toThrow();
    expect(()=>decodeParentSummary('#report=%%%')).toThrow();
  });
  it('uses Shanghai month boundaries and keeps current snapshot facts separate',async()=>{
    expect(reportMonthAt('2026-09-30T17:00:00.000Z')).toBe('2026-10');
    const model = await getOverviewModel({getSnapshot:async()=>snapshot} as unknown as FinancialRepository,DEMO_USER_ID);
    const historical=buildParentSummary(snapshot,model,'2025-01');
    expect(historical.spendingMinor).toBe('0');
    expect(historical.currency).toBe('IDR');
    expect(historical.asOf).toBe(snapshot.asOf);
    expect(historical.cashRunwayMonths).toBe(model.cashRunwayMonths);
  });
});

it('preserves the no-current-spending state in a shared report',async()=>{
 const seed=createSeedSnapshot('v1'); const snapshot={...seed,transactions:[]};
 const model=await getOverviewModel({getSnapshot:async()=>snapshot} as unknown as import('../../src/domain/financial-repository').FinancialRepository,DEMO_USER_ID);
 const report=buildParentSummary(snapshot,model,'2026-10','IDR');
 expect(report.cashRunwayMonths).toBeNull();expect(decodeParentSummary(encodeParentSummary(report)).cashRunwayMonths).toBeNull();
});
