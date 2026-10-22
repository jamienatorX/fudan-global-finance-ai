import {expect,it} from 'vitest';
import {createSeedSnapshot} from '../../src/demo/seed';
import {dailySpendingBudget} from '../../src/features/overview/daily-spending-budget';
import {safeToSpend} from '../../src/features/overview/safe-to-spend';

it('keeps savings in available cash while separating an exhausted spending budget',()=>{
 const seed=createSeedSnapshot('v1');
 expect(safeToSpend(seed,'2026-10-21T08:00:00Z').total.amountMinor).toBe(3366936n);
 expect(dailySpendingBudget(seed,'2026-10-21T08:00:00Z')).toMatchObject({remaining:{amountMinor:0n},perDay:{amountMinor:0n},days:11});
});
it('deducts recorded discretionary purchases, excludes fixed bills and future purchases, and rounds down',()=>{
 const seed=createSeedSnapshot('v1');
 const food=seed.transactions.find(t=>t.category==='food')!;
 const state={...seed,budgets:seed.budgets.filter(b=>b.category==='food').map(b=>({...b,limit:{...b.limit,amountMinor:30000n}})),
  transactions:[{...food,amount:{...food.amount,amountMinor:10000n}},
   {...food,id:'future',occurredAt:'2026-10-30T08:00:00Z'},...seed.transactions.filter(t=>['rent','subscriptions'].includes(t.category))]};
 expect(dailySpendingBudget(state,'2026-10-21T08:00:00Z')).toMatchObject({remaining:{amountMinor:20000n},perDay:{amountMinor:1818n},days:11});
});
it('does not invent a budget when Shanghai has moved into a month without configured caps',()=>{
 const seed=createSeedSnapshot('v1');
 expect(dailySpendingBudget(seed,'2026-10-31T15:59:00Z')?.days).toBe(1);
 expect(dailySpendingBudget(seed,'2026-10-31T16:00:00Z')).toBeNull();
});
