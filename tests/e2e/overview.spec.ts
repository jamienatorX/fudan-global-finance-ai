import { expect, test } from '@playwright/test';

test.describe('overview dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
  });

  test('presents the simulated financial overview and all product destinations', async ({ page }, testInfo) => {
    await expect(page.getByRole('heading', { name: /Good morning, Ayu/ })).toBeVisible();
    await expect(page.getByText('CNY 40,201.36')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Currency market ticker' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Banking shortcuts' })).toBeVisible();

    if (testInfo.project.name === 'mobile-chromium') {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Mobile navigation' }).getByText('Demo')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Mobile product navigation' }).getByRole('link')).toHaveCount(12);
    } else {
      await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link')).toHaveCount(12);
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
    }

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(horizontalOverflow).toBe(false);
  });

  test('supports keyboard navigation and named interactive controls', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.getByRole('link', { name: 'Skip to content' }).press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await expect(page.getByRole('combobox', { name: 'Active account' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Transfer money/ })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search banking' })).toBeVisible();
  });

  test('switches account context through URL state and updates the selected balance', async ({ page }) => {
    await page.goto('/overview?account=00000000-0000-4000-8000-000000000013');
    await expect(page).toHaveURL(/\/overview\?account=00000000-0000-4000-8000-000000000013/);
    await expect(page.getByRole('region', { name: 'Selected account' })).toContainText('USD 650.00');
    await page.getByRole('link', { name: 'View accounts' }).click();
    await expect(page).toHaveURL(/\/accounts\?account=00000000-0000-4000-8000-000000000013/);
    await expect(page.getByRole('region', { name: 'Currency market ticker' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to overview' }).click();
    await expect(page.getByRole('region', { name: 'Selected account' })).toContainText('USD 650.00');
  });

  test('announces the active route outside the overview', async ({ page }, testInfo) => {
    await page.goto('/accounts');
    const mobile = testInfo.project.name === 'mobile-chromium';
    if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('navigation', { name: mobile ? 'Mobile product navigation' : 'Primary navigation' }).getByRole('link', { name: mobile ? 'Accounts & Balances' : 'Accounts' })).toHaveAttribute('aria-current', 'page');
  });
});

