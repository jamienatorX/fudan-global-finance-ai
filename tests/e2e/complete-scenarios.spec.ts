import {test,expect} from '@playwright/test';
// Transport fixtures exercise UI only; SQL authorization is covered independently.
const a='00000000-0000-4000-8000-000000000010',b='00000000-0000-4000-8000-000000000011',action='00000000-0000-4000-8000-000000000020';
for(const color of ['light','dark'] as const)for(const width of [1440,390])test(`saved scenarios and exact review ${color} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:color});
 const state={enrolled:true,version:0,accounts:[{id:a,label:'Daily CNY',currency:'CNY',balance_minor:1865000},{id:b,label:'Savings CNY',currency:'CNY',balance_minor:1200000}],budgets:[],subscriptions:[],cards:[],tuition:[],products:[],holdings:[],actions:[],ledger:[],audit:[]};
 const conversation={id:a,revision:0,source:'private',messages:[],drafts:[],expiresAt:Date.now()+1800000};
 const entities={accounts:[{id:a,name:'Daily CNY',currency:'CNY'}],recipients:[],cards:[],subscriptions:[],tuition:[],products:[]};
 await page.route('**/api/banking/**',async route=>{
  const url=new URL(route.request().url()),body=route.request().method()==='POST'?route.request().postDataJSON():{};let data:unknown={status:'ok'};
  if(url.pathname.endsWith('/state'))data=state;
  else if(url.pathname.endsWith('/workflow'))data={workflows:[]};
  else if(url.pathname.endsWith('/conversation')){
   if(body.operation==='prepare')data={pending:{id:action,conversationId:a,revision:1,taskId:'draft',expiresAt:Date.now()+600000,description:'Reserve CNY 1,000 for fictional birthday flowers and cake'}};
   else if(body.operation==='message')data={state:{...conversation,revision:1,messages:[{role:'user',content:body.message}],drafts:[{id:'draft',kind:'scenario',status:'draft',query:body.message}]},entities,tasks:[{draft:{id:'draft',kind:'scenario',status:'draft',query:body.message},status:'ready',message:'Review the fictional birthday reservation.',plan:{actions:[{description:'Reserve CNY 1,000 for fictional birthday flowers and cake',payload:{type:'transfer',mode:'birthday'}}]}}]};
   else data={state:conversation,entities,tasks:[]};
  }else if(url.pathname.endsWith('/scenarios')){
   data=body.operation==='report'?{period:body.period,completePeriod:false,totals:{CNY:'3000'},categories:{CNY:{food:'3000'}},evidenceIds:['purchase-1'],warnings:['Partial history'],anomalies:[]}:{bank_demo_beneficiaries:[{id:b,name:'Zhang Wei',phone:'13800000001',remark:'Demo Zhang'}],bank_scheduled_jobs:[{id:b,label:'Fictional flowers',status:'paused',due_at:'2027-01-01T00:00:00Z'}],bank_reservations:[],bank_split_requests:[],bank_renewal_notices:[],bank_action_evidence:[],bank_scheduler_status:[{configured:false}]};
  }else if(url.pathname.endsWith('/policy'))data=body.operation==='policy'?{tier:'Red',reason:'DAILY_TRANSFER_THRESHOLD',review:{Action:'transfer',Mode:'birthday',Currency:'CNY','Amount minor units':'100000',Birthday:'2027-01-10'}}:{locked:false};
  await route.fulfill({json:data});
 });
 await page.goto('/banking?tab=automations');
 await expect(page.getByText('Zhang Wei',{exact:true})).toBeVisible();
 await expect(page.getByText(/Automatic execution is not active here/)).toBeVisible();
 await page.getByLabel('Birthday',{exact:true}).fill('2027-01-10');await page.getByRole('button',{name:'Draft birthday plan',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Message Fufu',exact:true})).toHaveValue('Plan birthday 2027-01-10 from Daily CNY with CNY 300 flowers and CNY 700 cake');
 await page.getByRole('button',{name:'Send to Fufu',exact:true}).click();await page.getByRole('button',{name:'Review this change',exact:true}).click();
 const review=page.getByRole('region',{name:'Confirm conversational change'});await expect(review.getByText('Red permission')).toBeVisible();await expect(review.getByRole('button',{name:'Confirm exact change',exact:true})).toBeDisabled();
 await page.getByRole('textbox',{name:'Report period'}).fill('2026');await page.getByRole('button',{name:'Generate report',exact:true}).click();await expect(page.getByText('CNY 30.00',{exact:true})).toBeVisible();await expect(page.getByText('Partial history',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath(`scenarios-${color}-${width}.png`),fullPage:true});
});
