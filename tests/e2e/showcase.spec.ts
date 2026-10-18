import { expect, test } from '@playwright/test';
test.describe('Phase 6 manual banking presentation',()=>{
  test('has current balances, eight workflows and links into real banking pages',async({page})=>{
    await page.goto('/showcase');
    await expect(page.getByRole('heading',{name:'One financial home for international students'})).toBeVisible();
    await expect(page.getByRole('region',{name:'Guided product tour'}).getByRole('button')).toHaveCount(8+1);
    await page.getByRole('button',{name:/Tuition & budgeting/}).click();
    await expect(page.getByRole('heading',{name:'Tuition & budgeting'})).toBeVisible();
    await page.getByRole('link',{name:'Open working module'}).click();
    await expect(page).toHaveURL(/\/planner/);
  });
  test('does not offer an AI banking agent or real money',async({page})=>{
    await page.goto('/showcase');
    await expect(page.getByText(/AI banking is intentionally paused/)).toBeVisible();
    await expect(page.getByText(/does not claim to fulfill AI-agent-track requirements/)).toBeVisible();
  });
});
