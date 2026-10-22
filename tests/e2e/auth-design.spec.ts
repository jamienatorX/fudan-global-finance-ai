import { expect, test } from '@playwright/test';

test('presents a usable sign-in page and a matching registration page', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [375, 812, 1440]) {
    await page.setViewportSize({ width, height: width === 812 ? 375 : 1000 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await page.getByLabel('Email', { exact: true }).fill('demo@example.test');
    await page.getByLabel('Password', { exact: true }).fill('fictional-test-password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (testInfo.project.name === 'desktop-chromium') {
      await page.getByLabel('Email', { exact: true }).clear();
      await page.getByLabel('Password', { exact: true }).clear();
      await page.getByRole('heading', { name: 'Welcome back.' }).click();
      await page.screenshot({ path: testInfo.outputPath(`login-${width}.png`), fullPage: true, style: 'nextjs-portal { display: none; }' });
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByRole('form', { name: 'Create an account' })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('minlength', '12');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'desktop-chromium') {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.screenshot({ path: testInfo.outputPath('registration-1440.png'), fullPage: true, style: 'nextjs-portal { display: none; }' });
  }
});
