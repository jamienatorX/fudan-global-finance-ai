import {render,screen,fireEvent,within} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {DemoProvider} from '../../src/demo/demo-context';
import {TransfersWorkspace} from '../../src/features/demo/scenario-workspaces';
import {ApprovalDrawer} from '../../src/features/demo/approval-drawer';
import {createSeedSnapshot} from '../../src/demo/seed';
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams()}));
beforeEach(()=>localStorage.clear());
it('prefills an internal transfer without exposing saved external recipients and still requires approval',()=>{
 const seed=createSeedSnapshot('v1');
 render(<DemoProvider><TransfersWorkspace internalOnly sourceId={seed.accounts[1].id} destinationId={seed.accounts[0].id}/><ApprovalDrawer/></DemoProvider>);
 expect(screen.getByRole('combobox',{name:'Source account'})).toHaveValue(seed.accounts[1].id);
 expect(screen.getByRole('combobox',{name:'Recipient'})).toHaveValue('account:'+seed.accounts[0].id);
 expect(within(screen.getByRole('combobox',{name:'Recipient'})).queryByRole('option',{name:/Zhang Wei/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Review transfer'}));
 expect(screen.getByRole('region',{name:'Review and confirmation'})).toHaveTextContent('CNY 800.00');
 fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
 expect(screen.getByRole('combobox',{name:'Source account'})).toHaveTextContent('CNY 11,200.00');
 expect(screen.getByRole('combobox',{name:'Source account'})).toHaveTextContent('CNY 19,450.00');
 expect(screen.getByRole('combobox',{name:'Recipient'})).toHaveValue('account:'+seed.accounts[0].id);
});
it('ignores invalid or mismatched account prefills',()=>{
 const seed=createSeedSnapshot('v1');
 render(<DemoProvider><TransfersWorkspace internalOnly sourceId="foreign-account" destinationId={seed.accounts[2].id}/></DemoProvider>);
 expect(screen.getByRole('combobox',{name:'Source account'})).toHaveValue(seed.accounts[0].id);
 expect(screen.getByRole('combobox',{name:'Recipient'})).toHaveValue('');
});
