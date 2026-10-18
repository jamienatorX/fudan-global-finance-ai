import { expect, test } from '@playwright/test';
test.describe('keyless worldwide FX converter',()=>{
 test('converts global currency pairs with dated published rate and swaps directions',async({page})=>{
   await page.route('**/api/fx/currencies',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     currencies:[{code:'USD',name:'US Dollar'},{code:'CNY',name:'Chinese Yuan'},{code:'SGD',name:'Singapore Dollar'},{code:'EUR',name:'Euro'},{code:'JPY',name:'Japanese Yen'}],
     source:'live-catalog'
   })}));
   await page.route('**/api/fx/rate?*',async route=>{
     const url=new URL(route.request().url());
     const a=url.searchParams.get('base'),b=url.searchParams.get('quote');
     const rate=a==='USD'&&b==='SGD'?1.3:a==='SGD'&&b==='USD'?0.7692308:a===b?1:1.2;
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({base:a,quote:b,date:'2026-10-16',rate,source:'live-reference',provider:'Frankfurter fixture'})});
   });
   await page.goto('/fx');
   await page.getByRole('combobox',{name:'To currency'}).selectOption('SGD');
   await expect(page.getByText('SGD 130.00')).toBeVisible();
   await expect(page.getByText('Reference date 2026-10-16')).toBeVisible();
   await page.getByRole('button',{name:'Swap currencies'}).click();
   await expect(page.getByRole('combobox',{name:'From currency'})).toHaveValue('SGD');
   await expect(page.getByText('USD 76.92')).toBeVisible();
   await page.getByRole('combobox',{name:'From currency'}).selectOption('EUR');
   await page.getByRole('combobox',{name:'To currency'}).selectOption('JPY');
   await expect(page.getByText('JPY 120')).toBeVisible();
 });
 test('converts USD and SGD with historical fixture while service is unavailable',async({page})=>{
   await page.route('**/api/fx/rate?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"offline"}'}));
   await page.goto('/fx');
   await page.getByRole('combobox',{name:'To currency'}).selectOption('SGD');
   await expect(page.getByText('FALLBACK · fictional historical fixture')).toBeVisible();
   await expect(page.getByText('SGD 131.48')).toBeVisible();
   await page.getByRole('combobox',{name:'From currency'}).selectOption('EUR');
   await expect(page.getByText('Conversion unavailable for this selection.')).toBeVisible();
 });
 test('converts dashboard summaries to SGD/IDR without touching account balances',async({page})=>{
   await page.goto('/overview');
   await page.getByRole('combobox',{name:'Dashboard reporting currency'}).selectOption('SGD');
   await expect(page.getByRole('region',{name:'Financial summary'})).toContainText('SGD');
   await expect(page.getByRole('region',{name:'Selected account'})).toContainText('CNY');
   await page.getByRole('combobox',{name:'Dashboard reporting currency'}).selectOption('IDR');
   await expect(page.getByRole('region',{name:'Financial summary'})).toContainText('IDR');
 });
});
