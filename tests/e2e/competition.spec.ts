import { expect, test } from '@playwright/test';

test.describe('competition simulation critical paths', () => {
  test('independent approvals update tuition, budget and subscription while preserving audit receipts', async ({page}) => {
    await page.goto('/competition');
    await expect(page.getByRole('heading',{name:'Competition demonstration'})).toBeVisible();
    await expect(page.getByText('Pay fictional tuition').first()).toBeVisible();
    await expect(page.getByText('Reduce shopping cap').first()).toBeVisible();
    await expect(page.getByText('Cancel fictional Campus Video').first()).toBeVisible();
    const boxes=page.getByRole('checkbox');
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await boxes.nth(2).check();
    await page.getByRole('button',{name:'Execute only selected approved simulations'}).click();
    const verification=page.getByRole('region',{name:'Verification results'});
    await expect(verification).toContainText('EXECUTED');
    await expect(verification).toContainText('CNY 5,016.00');
    await expect(verification).toContainText('CNY 0.00');
    await page.goto('/planner');
    await expect(page.getByText('Paid',{exact:false}).first()).toBeVisible();
    await page.goto('/subscriptions');
    await expect(page.getByText('cancelled',{exact:true}).first()).toBeVisible();
    await page.goto('/audit');
    await expect(page.getByText('demo.tuition').first()).toBeVisible();
    await expect(page.getByText('demo.budget').first()).toBeVisible();
    await expect(page.getByText('demo.subscription').first()).toBeVisible();
  });
  test('a rejected proposed step leaves tuition unpaid',async({page})=>{
    await page.goto('/competition');
    await expect(page.getByRole('checkbox')).toHaveCount(3);
    await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('button',{name:'Execute only selected approved simulations'}).click();
    const verification=page.getByRole('region',{name:'Verification results'});
    await expect(verification).toContainText('REJECTED');
    await expect(verification).toContainText('EXECUTED');
    await expect(verification).toContainText('CNY 5,000.00');
  });
  test('a simulated card freeze requires human confirmation and survives reload',async({page})=>{
    await page.goto('/cards');
    await page.getByRole('button',{name:'Review freeze'}).first().click();
    const modal=page.getByRole('region',{name:'Simulation approval and result'});
    await expect(modal).toContainText('approval required');
    await page.getByRole('button',{name:'Approve simulation'}).click();
    await page.reload();
    await expect(page.getByRole('button',{name:'Review unfreeze'}).first()).toBeVisible();
  });
  test('FX labels fallback and a malformed CSV never modifies the ledger',async({page})=>{
    await page.goto('/fx');
    await expect(page.getByText('FALLBACK').first()).toBeVisible();
    await page.goto('/transactions');
    await page.getByLabel('CSV contents').fill('date,merchant,amount,currency\n2026-02-30,Bad,-12.00,CNY\n2026-10-11,Valid,-2.50,CNY');
    await page.getByRole('button',{name:'Validate and preview'}).click();
    await expect(page.getByText('1 valid / 1 invalid out of 2 rows')).toBeVisible();
    await expect(page.getByText('Preview only.')).toBeVisible();
  });
  test('reset removes all simulated mutations',async({page})=>{
    await page.goto('/cards');
    await page.getByRole('button',{name:'Review freeze'}).first().click();
    await page.getByRole('button',{name:'Approve simulation'}).click();
    await page.goto('/settings');
    await page.getByRole('textbox',{name:'Type RESET DEMO'}).fill('RESET DEMO');
    await page.getByRole('button',{name:'Reset browser-local simulation'}).click();
    await page.goto('/cards');
    await expect(page.getByRole('button',{name:'Review freeze'}).first()).toBeVisible();
  });
});
