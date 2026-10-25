import {render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {WorkflowPanel} from '../../src/features/copilot/workflow-panel';
afterEach(()=>vi.unstubAllGlobals());
it('shows persisted workflow controls and exact step review without an accordion',async()=>{
 const workflow={id:'w',revision:1,status:'active',nodes:[{id:'n',position:0,status:'pending',action_id:'a',description:'Transfer CNY 1 from Daily to Savings',dependencies:[]}]};
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_url,options)=>({ok:true,json:async()=>JSON.parse(options.body).operation==='list'?{workflows:[workflow]}:workflow})));
 render(<WorkflowPanel conversationId="c" conversationRevision={1}/>);
 const button=await screen.findByRole('button',{name:/Open workflow/});button.click();
 expect(await screen.findByText('Transfer CNY 1 from Daily to Savings')).toBeVisible();expect(screen.getByRole('button',{name:'Pause workflow'})).toBeVisible();
});
