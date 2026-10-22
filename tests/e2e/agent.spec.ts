import {createSeedSnapshot} from '../../src/demo/seed';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {test,expect} from '@playwright/test';
import {planCommand} from '../../src/agent/planner';
import type {AgentContext} from '../../src/agent/contracts';
test('public agent detects fixture evidence and cancels only after confirmation',async({page})=>{
 await page.goto('/copilot');await page.getByText('Single-task tools',{exact:true}).click();
 await expect(page.getByRole('heading',{name:'Tell us what you want to do'})).toBeVisible();
 await page.getByRole('button',{name:'Find recurring payments',exact:true}).click();
 await expect(page.getByText(/Insufficient transaction evidence/)).toBeVisible();
 await page.getByText('Try a reproducible sample').click();await page.getByRole('button',{name:'Load fictional purchase history'}).click();
 await page.getByRole('button',{name:'Find recurring payments',exact:true}).click();
 await expect(page.getByText(/Found 4 recurring-payment candidates/)).toBeVisible();
 await page.getByText(/Tencent Video VIP · CNY 68.00/).click();await expect(page.getByRole('table',{name:'Supporting settled transactions'}).first()).toBeVisible();
 await page.getByLabel('Your banking request').fill('Cancel Tencent Video VIP');await page.getByRole('button',{name:'Send request'}).click();
 await page.getByRole('button',{name:'Review action 1'}).click();await page.getByRole('button',{name:'Reject without changes'}).click();
 await expect(page.getByRole('status').filter({hasText:'Rejected; no banking change'})).toBeVisible();
 await page.getByRole('button',{name:'Send request'}).click();await page.getByRole('button',{name:'Review action 1'}).click();await page.getByRole('button',{name:'Confirm exact change'}).click();
 await expect(page.getByRole('status').filter({hasText:'Verified:'})).toBeVisible();
 await page.goto('/subscriptions');await expect(page.getByRole('heading',{name:'Tencent Video VIP'})).toBeVisible();
 await expect(page.getByText('cancelled',{exact:true})).toBeVisible();
 await page.goto('/audit');await expect(page.getByText('agent.action.executed',{exact:true})).toBeVisible();
});
test('card action changes the same state read by card management',async({page})=>{
 await page.goto('/copilot');await page.getByText('Single-task tools',{exact:true}).click();await page.getByRole('button',{name:'Freeze my shopping card'}).click();
 await page.getByRole('button',{name:'Review action 1'}).click();await page.getByRole('button',{name:'Confirm exact change'}).click();
 await expect(page.getByRole('status').filter({hasText:'Verified:'})).toBeVisible();
 await page.goto('/cards');await expect(page.getByText('frozen',{exact:true})).toBeVisible();
});
test('signed-in panel uses server transport and confirmation, never browser demo records',async({page})=>{
 // UI contract test with isolated mocked authenticated services; database authorization is tested separately.
 const id='00000000-0000-4000-8000-000000000050',actionId='00000000-0000-4000-8000-000000000090';
 let active=true,version=0,executions=0;
 await page.route('**/api/banking/session',r=>r.fulfill({json:{status:'ok'}}));
 await page.route('**/api/banking/state',r=>r.fulfill({json:{enrolled:true,version,accounts:[{id:'a',label:'Daily CNY',currency:'CNY',balance_minor:1865000}],budgets:[],subscriptions:[{id,merchant:'Private Video',monthly_minor:6800,active}],cards:[],tuition:[],products:[],holdings:[],actions:[],ledger:[],audit:[]}}));
 await page.route('**/api/banking/agent',async route=>{
  const b=route.request().postDataJSON();
  if(b.operation==='plan'){
   const c:AgentContext={source:'authenticated test fixture',version,asOf:'2026-10-22',coverage:{from:'2026-08-01',to:'2026-10-22',truncated:false},transactions:[],cards:[],subscriptions:[{id,name:'Private Video',active,amountMinor:'6800',currency:'CNY',cadence:'monthly',capability:'simulated',usage:'unknown'}]};
   await route.fulfill({json:planCommand(b.command,c)});
  }else if(b.operation==='prepare')await route.fulfill({json:{id:actionId,expiresInSeconds:600}});
  else if(b.operation==='execute'){if(b.approve){active=false;version++;executions++;}await route.fulfill({json:{status:b.approve?'executed':'rejected',verified:b.approve}});}
  else await route.fulfill({status:400,json:{error:'INVALID_OPERATION'}});
 });
 await page.goto('/banking');await page.getByText('Single-task tools',{exact:true}).click();await page.getByLabel('Your banking request').fill('Cancel Private Video');await page.getByRole('button',{name:'Send request'}).click();
 await page.getByRole('button',{name:'Review action 1'}).click();expect(executions).toBe(0);
 await page.getByRole('button',{name:'Confirm exact change'}).click();await expect(page.getByRole('status').filter({hasText:'Verified:'})).toBeVisible();expect(executions).toBe(1);
 await page.getByRole('button',{name:'Subscriptions',exact:true}).last().click();await expect(page.getByText('Status: Cancelled')).toBeVisible();
 await expect(page.getByText('Tencent Video VIP',{exact:true})).toHaveCount(0);
});


async function askFufu(page:import('@playwright/test').Page,command:string){await page.getByLabel('Your banking request').fill(command);await page.getByRole('button',{name:'Send request',exact:true}).click();}
async function confirmFufu(page:import('@playwright/test').Page){await page.getByRole('button',{name:'Review action 1'}).click();await page.getByRole('button',{name:'Confirm exact change'}).click();await expect(page.getByRole('status').filter({hasText:'Verified:'})).toBeVisible();}
test('Fufu connects transfers, budgets and tuition to existing state',async({page})=>{
 const c=demoAgentContext(createSeedSnapshot('v1'),0),a=c.accounts!.find(a=>a.name==='daily CNY')!,b=c.accounts!.find(a=>a.name==='savings CNY')!;
 await page.goto('/copilot');await page.getByText('Single-task tools',{exact:true}).click();await expect(page.getByRole('img',{name:/Fufu/}).first()).toBeVisible();
 await askFufu(page,'Show my accounts');await expect(page.getByText(/daily CNY: balance/)).toBeVisible();
 await askFufu(page,'Transfer CNY 10 from '+a.name+' to '+b.name);await confirmFufu(page);
 await askFufu(page,'Set food budget to CNY 500');await confirmFufu(page);
 await askFufu(page,'Show my budgets');await expect(page.getByText(/food: monthly cap CNY 500.00/)).toBeVisible();
 await askFufu(page,'Pay '+c.tuition![0].name+' from '+a.name);await confirmFufu(page);
 await askFufu(page,'Show my tuition');await expect(page.getByText(c.tuition![0].name+': paid',{exact:true})).toBeVisible();
 await page.goto('/transfers');await expect(page.getByText('CNY 10.00',{exact:true}).first()).toBeVisible();
});
test('Fufu connects fictional buy/redeem, FX references and navigation',async({page})=>{
 const c=demoAgentContext(createSeedSnapshot('v1'),0),p=c.products![0];
 await page.route('**/api/fx/rate?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({base:'USD',quote:'CNY',rate:7.1,date:'2026-10-21',source:'live-reference',provider:'Test reference provider'})}));
 await page.goto('/copilot');await page.getByText('Single-task tools',{exact:true}).click();
 await askFufu(page,'Buy CNY 100 of '+p.name+' from daily CNY with high risk tolerance');await confirmFufu(page);
 await askFufu(page,'Redeem CNY 50 of '+p.name+' from daily CNY');await confirmFufu(page);
 await askFufu(page,'Convert USD 100 to CNY');await expect(page.getByText(/Reference only: USD 100.00 ≈ CNY 710.00/)).toBeVisible();await expect(page.getByRole('button',{name:'Review action 1'})).toHaveCount(0);
 await askFufu(page,'Open wealth');await page.getByRole('link',{name:'Open Wealth',exact:true}).click();await expect(page).toHaveURL(/\/wealth/);
});
test('Fufu politely declines unsupported tasks and offers honest human help',async({page})=>{
 await page.goto('/copilot');await page.getByText('Single-task tools',{exact:true}).click();await askFufu(page,'Get me a mortgage');await expect(page.getByText('Sorry, we cannot do that for now. We will resolve it as soon as possible. You can contact a human operator for help.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Review action 1'})).toHaveCount(0);
 await page.getByRole('button',{name:'Contact a human operator'}).last().click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('No human support channel is connected yet');await expect(dialog).toContainText('No request has been sent');await expect(dialog.getByLabel('Request summary')).toHaveValue('Get me a mortgage');await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).not.toBeVisible();
});
test('signed-in Fufu handoffs change the displayed banking tab on repeated navigation',async({page})=>{
 await page.route('**/api/banking/session',r=>r.fulfill({json:{status:'ok'}}));await page.route('**/api/banking/state',r=>r.fulfill({json:{enrolled:true,version:0,accounts:[{id:'a',label:'Daily CNY',currency:'CNY',balance_minor:1865000}],budgets:[],subscriptions:[],cards:[],tuition:[],products:[],holdings:[],actions:[],ledger:[],audit:[]}}));
 await page.route('**/api/banking/agent',async r=>{const command=r.request().postDataJSON().command as string;const tab=command.includes('transfers')?'transfers':'cards';const c:AgentContext={source:'authenticated fixture',version:0,asOf:'2026-10-22',coverage:{from:'2026-01-01',to:'2026-10-22',truncated:false},transactions:[],cards:[],subscriptions:[]};const plan=planCommand(command,c);plan.links=[{href:'/banking?tab='+tab,label:'Open '+tab}];await r.fulfill({json:plan});});
 await page.goto('/banking');await page.getByText('Single-task tools',{exact:true}).click();await askFufu(page,'Open transfers');await page.getByRole('link',{name:'Open transfers',exact:true}).click();await expect(page.getByRole('button',{name:'Transfers',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByText('Single-task tools',{exact:true}).click();await askFufu(page,'Open cards');await page.getByRole('link',{name:'Open cards',exact:true}).click();await expect(page.getByRole('button',{name:'Cards',exact:true})).toHaveAttribute('aria-current','page');
});
