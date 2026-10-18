import { expect, test } from '@playwright/test';

test('uses the 福 bank brand and keeps implementation commentary out of customer pages', async ({ page }) => {
  for (const route of ['/overview','/accounts','/transactions','/transfers','/cards','/subscriptions','/wealth','/planner','/audit','/settings','/fx','/showcase','/login','/register']) {
    await page.goto(route);
    await expect(page).toHaveTitle('福 bank');
    await expect(page.locator('h1')).toBeVisible();
    const copy = await page.locator('body').innerText();
    expect(copy).not.toMatch(/Supabase|PostgreSQL|prototype|fixture|Phase [1-6]|browser-local|Income and consumption totals exclude|AI banking is intentionally paused|Fudan Global|FINANCE LAB/i);
  }
});

test('shows readable transfer details before confirmation', async ({ page }) => {
  await page.goto('/transfers');
  await page.getByRole('combobox', { name: /^Recipient/ }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  const review = page.getByRole('region', { name: 'Review and confirmation' });
  await expect(review.getByText('Amount', { exact: true })).toBeVisible();
  await expect(review.getByText('CNY 800.00', { exact: true })).toBeVisible();
  await expect(review).not.toContainText('amountMinor');
  await expect(review).not.toContainText('sourceId');
  await expect(review.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
});
