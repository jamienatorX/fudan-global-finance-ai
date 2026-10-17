import { expect, test } from '@playwright/test';

test.describe('banking simulation critical paths (AI features paused)', () => {
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
  test('does not expose an AI copilot in banking navigation', async ({page}) => {
    await page.goto('/overview');
    await expect(page.getByRole('region', { name: 'Banking shortcuts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ask AI banker' })).toHaveCount(0);
  });
});
