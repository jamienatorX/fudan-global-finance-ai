import { expect, test } from '@playwright/test';

test.describe('global banking search and file chooser', () => {
  test('finds a real transaction and opens the matching filtered month and account', async ({ page }) => {
    await page.goto('/overview');
    const input = page.getByRole('searchbox', { name: 'Search banking' });
    await input.fill('Campus Dining');
    const results = page.getByRole('listbox', { name: 'Banking search results' });
    await expect(results.getByRole('option', { name: /Campus Dining/ })).toBeVisible();
    await results.getByRole('option', { name: /Campus Dining/ }).click();
    await expect(page).toHaveURL(/\/transactions\?/);
    await expect(page.getByRole('heading', { name: 'Transactions & bill analysis' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Merchant search' })).toHaveValue('Campus Dining');
    await expect(page.getByText('Campus Dining').first()).toBeVisible();
  });

  test('supports keyboard selection, escape, empty state, and responsive access', async ({ page }) => {
    await page.goto('/overview');
    const input = page.getByRole('searchbox', { name: 'Search banking' });
    await input.fill('Campus Video');
    await expect(page.getByRole('listbox')).toBeVisible();
    await input.press('Escape');
    await expect(page.getByRole('listbox')).not.toBeVisible();
    await input.fill('zzzznotfound');
    await expect(page.getByText('No matching records found')).toBeVisible();
    await page.getByRole('button', { name: 'Clear banking search' }).click();
    await expect(input).toHaveValue('');
    await input.fill('Shopping budget');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/planner/);
  });

  test('CSV chooser hides the native empty-file label and can load a selected file', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByText(/No file chosen|No file choosen/i)).toHaveCount(0);
    await expect(page.getByText('Choose CSV file', { exact: true })).toBeVisible();
    const file = page.locator('input[type="file"]#transaction-csv-file');
    await file.setInputFiles({name:'demo-import.csv',mimeType:'text/csv',buffer:Buffer.from('date,merchant,amount,currency\n2026-10-12,Campus Dining,-25.50,CNY')});
    await expect(page.getByText('demo-import.csv')).toBeVisible();
    await page.getByRole('button',{name:'Validate and preview'}).click();
    await expect(page.getByText('1 valid / 0 invalid out of 1 rows')).toBeVisible();
  });
});
