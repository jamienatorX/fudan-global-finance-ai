import {test,expect} from '@playwright/test';
// UI fixtures only. These checks do not prove Supabase sign-in or an actual MFA challenge.
const account='00000000-0000-4000-8000-000000000010',action='00000000-0000-4000-8000-000000000020';
for(const mode of ['light','dark'] as const)for(const width of [1440,390]){
 test(`security review and support UI ${mode} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:mode});
  const state={enrolled:true,version:0,accounts:[{id:account,label:'Daily CNY',currency:'CNY',balance_minor:1865000}],budgets:[],subscriptions:[],cards:[{id:account,label:'Daily card',masked_number:'•••• 4821',monthly_limit_minor:300000,frozen:false}],tuition:[],products:[],holdings:[],actions:[],ledger:[],audit:[]};
  await page.route('**/api/banking/**',async route=>{
   const url=new URL(route.request().url()),body=route.request().method()==='POST'?route.request().postDataJSON():{};
   let data:unknown={status:'ok'};
   if(url.pathname.endsWith('/state'))data=state;
   else if(url.pathname.endsWith('/conversation'))data={state:{id:account,revision:0,messages:[],drafts:[]},tasks:[],entities:{accounts:[],recipients:[],cards:[],subscriptions:[],tuition:[],products:[]}};
   else if(url.pathname.endsWith('/workflow'))data={workflows:[]};
   else if(url.pathname.endsWith('/action'))data={id:action,expiresInSeconds:600};
   else if(url.pathname.endsWith('/policy'))data=body.operation==='policy'?{tier:'Red',reason:'CARD_SECURITY_VERIFICATION',review:{Action:'card',Mode:'freeze',Card:'Daily card •••• 4821'}}:{locked:false};
   else if(url.pathname.endsWith('/support'))data=body.operation==='create'?{id:action,revision:0,status:'queued',messages:[{id:account,role:'customer',message:body.message}]}:{tickets:[]};
   await route.fulfill({json:data});
  });
  await page.goto('/banking');
  await expect(page.getByRole('textbox',{name:'Message Fufu',exact:true})).toHaveCount(1);
  await expect(page.getByRole('textbox',{name:'Your banking request',exact:true})).toHaveCount(0);
  await expect(page.getByText('Two-factor verification enabled',{exact:true})).not.toBeVisible();
  await page.screenshot({path:test.info().outputPath('banking-clean-'+mode+'-'+width+'.png'),fullPage:true});
  const card=page.getByText('Daily CNY',{exact:true}).locator('..');
  const ratio=await card.evaluate(el=>{
   const luminance=(c:string)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;ctx.fillStyle=c;ctx.fillRect(0,0,1,1);const rgb=ctx.getImageData(0,0,1,1).data;return [...rgb].slice(0,3).map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);};
   const style=getComputedStyle(el),bg=style.backgroundImage==='none'?style.backgroundColor:(style.getPropertyValue('--tw-gradient-from')||'#ffffff');
   return [...el.querySelectorAll('p')].map(p=>{const fg=luminance(getComputedStyle(p).color),back=luminance(bg);return(Math.max(fg,back)+.05)/(Math.min(fg,back)+.05);});
  });
  expect(Math.min(...ratio)).toBeGreaterThanOrEqual(4.5);
  await page.goto('/banking?tab=cards');await page.getByRole('button',{name:'Review freeze',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Confirm action'});await expect(dialog.getByText('Red permission')).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled();await expect(dialog.getByRole('button',{name:'Verify this action',exact:true})).toBeVisible();
  await expect(dialog.getByText('Daily card •••• 4821',{exact:true})).toBeVisible();
  await page.screenshot({path:test.info().outputPath(`permission-${mode}-${width}.png`),fullPage:true});
  await page.goto('/support');await page.getByLabel('Support message').fill('Please help me review my task.');await page.getByRole('button',{name:'Send support request'}).click();
  await expect(page.getByRole('status')).toHaveText('queued');await expect(page.getByRole('log',{name:'Support conversation'})).toContainText('Please help me review my task.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/login');await expect(page.getByRole('heading',{name:/Welcome to.*福 Bank/i})).toBeVisible();
  await expect(page.getByRole('img',{name:/Fufu/})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('welcome-'+mode+'-'+width+'.png'),fullPage:true});
  await page.screenshot({path:test.info().outputPath(`support-${mode}-${width}.png`),fullPage:true});
 });
}
