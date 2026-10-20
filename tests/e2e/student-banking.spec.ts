import {test,expect} from '@playwright/test';
for(const width of [375,800,1280])test(`student overview at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:812});
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
 await page.goto('/overview');
 const hero=page.getByRole('region',{name:'Safe to spend',exact:true});
 await expect(hero).toBeVisible();
 await expect(hero.getByText(/Next bill:/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 if(width===375){
  const receive=hero.getByRole('link',{name:'↙ Receive from home'});await expect(receive).toBeVisible();
  const box=await receive.boundingBox();expect(box!.y+box!.height).toBeLessThan(740);
  await expect(page.getByRole('navigation',{name:'Mobile bottom navigation'})).toBeVisible();
 }
 if(width===800)await expect(page.locator('.bank-sidebar')).toBeHidden();
 if(width===1280)await expect(page.locator('.bank-sidebar')).toBeVisible();
 await page.screenshot({path:test.info().outputPath(`student-${width}.png`),fullPage:true});
});
