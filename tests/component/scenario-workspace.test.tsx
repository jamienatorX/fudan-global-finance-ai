import {expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {ScenarioWorkspace} from '../../src/features/banking/scenario-workspace';
vi.mock('../../src/features/banking/security-client',()=>({securePost:vi.fn(async(_path:string,b:Record<string,unknown>)=>b.operation==='state'?{bank_demo_beneficiaries:[{id:'r',name:'Zhang Wei',phone:'13800000001',remark:'Demo Zhang'}],bank_scheduled_jobs:[{id:'j',label:'Flowers',due_at:'2027-01-01',status:'paused'}],bank_reservations:[],bank_split_requests:[],bank_renewal_notices:[],bank_action_evidence:[]}:{})}));
it('shows persisted jobs and routes examples to the existing Fufu conversation',async()=>{
 const request=vi.fn();render(<ScenarioWorkspace accounts={[{id:'a',label:'Daily CNY',currency:'CNY'}]} cards={[]} products={[]} onRequest={request} onPending={vi.fn()} refresh={vi.fn()}/>);
 await screen.findByText('Zhang Wei');expect(screen.getByText('Flowers')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Draft birthday plan'}));await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.stringContaining('Plan birthday')));
 expect(screen.getByText(/no real merchant/i)).toBeInTheDocument();
});
