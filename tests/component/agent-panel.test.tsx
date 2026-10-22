import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {AgentPanel} from '../../src/features/copilot/agent-panel';
import {planCommand} from '../../src/agent/planner';
import type {AgentContext} from '../../src/agent/contracts';
const context:AgentContext={source:'test simulation',version:0,asOf:'2026-10-21',coverage:{from:'2026-10-01',to:'2026-10-21',truncated:false},transactions:[],cards:[],subscriptions:[{id:'s',name:'Campus Video',active:true,amountMinor:'6800',currency:'CNY',cadence:'monthly',capability:'simulated',usage:'unknown'}]};
it('requires a separate exact confirmation and shows verified result',async()=>{
 const decide=vi.fn().mockResolvedValue({status:'executed',verified:true});
 render(<AgentPanel source="test simulation" version={0} transport={{plan:async c=>planCommand(c,context),prepare:async()=>({id:'a',expiresAt:Date.now()+600000}),decide,loadHistory:async()=>{}}}/>);
 fireEvent.change(screen.getByLabelText('Your banking request'),{target:{value:'Cancel Campus Video'}});fireEvent.click(screen.getByRole('button',{name:'Send request'}));
 await screen.findByRole('button',{name:'Review action 1'});expect(decide).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Review action 1'}));
 await screen.findByRole('button',{name:'Confirm exact change'});expect(decide).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm exact change'}));
 await waitFor(()=>expect(decide).toHaveBeenCalledWith(expect.objectContaining({id:'a'}),true));expect(await screen.findByRole('status')).toHaveTextContent('Verified: the requested state');
});
it('rejection never reports a cancellation success',async()=>{
 const decide=vi.fn().mockResolvedValue({status:'rejected',verified:false});
 render(<AgentPanel source="test simulation" version={0} transport={{plan:async c=>planCommand(c,context),prepare:async()=>({id:'a',expiresAt:Date.now()+600000}),decide,loadHistory:async()=>{}}}/>);
 fireEvent.change(screen.getByLabelText('Your banking request'),{target:{value:'Cancel Campus Video'}});fireEvent.click(screen.getByRole('button',{name:'Send request'}));
 fireEvent.click(await screen.findByRole('button',{name:'Review action 1'}));fireEvent.click(await screen.findByRole('button',{name:'Reject without changes'}));expect(await screen.findByRole('status')).toHaveTextContent('Rejected; no banking change');
});

