import { expect,test } from '@playwright/test';
test('starts at sign-in and gives the demo an explicit fictional-data boundary',async({page})=>{
  const response=await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  const csp=response!.headers()['content-security-policy'];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/script-src[^;]*'nonce-/);
  expect(response!.headers()['x-frame-options']).toBe('DENY');
  const scripts=page.locator('script[src*="/_next/"]');
  expect(await scripts.first().evaluate(el=>(el as HTMLScriptElement).nonce)).toBeTruthy();
  await page.getByRole('button',{name:'Try the demo',exact:true}).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByText('Demo workspace · Fictional accounts only.',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Sign in to your account',exact:true})).toHaveAttribute('href','/login');
});
