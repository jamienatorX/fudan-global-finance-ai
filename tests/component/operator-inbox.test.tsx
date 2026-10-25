import {fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {OperatorInbox} from '../../src/features/support/operator-inbox';
afterEach(()=>vi.unstubAllGlobals());
it('creates a durable customer request and shows the returned queue status',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_url,options)=>({ok:true,json:async()=>JSON.parse(options.body).operation==='list'?{tickets:[]}:{id:'ticket-123',revision:0,status:'queued',messages:[{id:'m',role:'customer',message:'Please help'}]}})));
 render(<OperatorInbox initialMessage="Please help"/>);fireEvent.click(await screen.findByRole('button',{name:'Send support request'}));
 expect(await screen.findByText(/ticket-123/)).toBeVisible();expect(screen.getByText('queued')).toBeVisible();
});
