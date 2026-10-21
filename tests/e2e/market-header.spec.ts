import { expect, test } from '@playwright/test';

test('market header shows directional quotes, pauses, and keeps actions at the right edge', async ({page}) => {
  await page.route('**/api/fx/ticker', route => route.fulfill({json:{provider:'Frankfurter',quotes:[
    {pair:'USD/CNY',rate:7.07,change:1,date:'2026-10-16',previousDate:'2026-10-15'},
    {pair:'USD/SGD',rate:1.287,change:-1,date:'2026-10-16',previousDate:'2026-10-15'},
    {pair:'USD/IDR',rate:17000,change:0,date:'2026-10-16',previousDate:'2026-10-15'},
  ]}}));
  await page.goto('/overview');
  const header = page.getByRole('banner');
  const ticker = page.getByRole('region', {name:'Currency market ticker'});
  await expect(ticker.locator('.fx-up').first()).toContainText('+1.00%');
  await expect(ticker.locator('.fx-down').first()).toContainText('1.00%');
  await expect(header.getByText(/Simulated data|^Demo$/)).toHaveCount(0);
  if(page.viewportSize()!.width<640){await expect(ticker.getByText(/Daily reference/)).toBeVisible();return;}
  await ticker.getByRole('button',{name:'Pause currency ticker'}).click();
  await expect(ticker.locator('.fx-ticker-track')).toHaveAttribute('data-paused','true');
  await ticker.getByRole('button',{name:'Resume currency ticker'}).click();
  await expect(ticker.locator('.fx-ticker-track')).toHaveAttribute('data-paused','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const notification = await header.getByRole('button',{name:'Notifications'}).boundingBox();
  const profile = await header.getByTitle('Jim Pratama').boundingBox();
  expect(profile!.x).toBeGreaterThan(notification!.x);
  if (page.viewportSize()!.width >= 1024) {
    expect((await ticker.boundingBox())!.width).toBeGreaterThan((await header.getByRole('searchbox').boundingBox())!.width);
  }
  await page.screenshot({path:test.info().outputPath('market-header.png'),fullPage:false});
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await ticker.locator('.fx-ticker-track').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('market ticker does not invent quotes when the provider is unavailable', async ({page}) => {
  await page.route('**/api/fx/ticker', route => route.fulfill({status:503,json:{provider:'Frankfurter',quotes:[]}}));
  await page.goto('/overview');
  const ticker = page.getByRole('region',{name:'Currency market ticker'});
  await expect(ticker.getByText('Fallback · sandbox reference rates')).toBeVisible();
  await expect(ticker.locator('.fx-up, .fx-down')).toHaveCount(0);
});
