import { expect, test } from '@playwright/test';

test('keeps the financial overview readable across small screens, landscape and large text', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/overview');
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Jim/ })).toBeVisible();
    await expect(page.getByText('CNY 40,201.36')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/inter/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if (testInfo.project.name === 'desktop-chromium') {
      const path = testInfo.outputPath(`finance-${viewport.width}.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(`finance-${viewport.width}`, { path, contentType: 'image/png' });
      await page.screenshot({ path: testInfo.outputPath(`finance-${viewport.width}-viewport.png`) });
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(page.getByRole('link', { name: /Send home/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
