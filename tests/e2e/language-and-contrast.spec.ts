import { test, expect } from '@playwright/test';

for (const width of [375,800,1280]) test(`language and account action contrast at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
 await page.goto('/accounts');
 const action=page.getByRole('link',{name:'View transactions',exact:true}).first();
 await expect(action).toBeVisible();
 const colors=()=>action.evaluate(el=>{const s=getComputedStyle(el);return {foreground:s.color,background:s.backgroundColor};});
 function luminance(color:string){const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
 const contrast=async()=>{const c=await colors();const a=luminance(c.foreground),b=luminance(c.background);expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toBeGreaterThanOrEqual(4.5);};
 await contrast();await action.hover();await contrast();
 await page.getByRole('button',{name:'简体中文',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
 await expect(page.getByRole('link',{name:'查看交易',exact:true})).toHaveCount(5);
 await expect(page.getByRole('heading',{name:/CNY\s18,650\.00/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.reload();
 await expect(page.getByRole('button',{name:'简体中文',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'English',exact:true}).click();
 await expect(page.getByRole('link',{name:'View transactions',exact:true})).toHaveCount(5);
});
