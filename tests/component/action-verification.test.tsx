import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ActionVerification} from '../../src/features/banking/action-verification';
vi.mock('../../src/lib/supabase/browser',()=>({createBrowserSupabaseClient:vi.fn()}));
afterEach(()=>vi.unstubAllGlobals());
it('enables ordinary exact confirmation only after checking policy',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({tier:'Yellow',reason:'EXACT_CONFIRMATION'})}));
 const ready=vi.fn();render(<ActionVerification actionId="a" onReady={ready}/>);
 await waitFor(()=>expect(ready).toHaveBeenLastCalledWith(true));expect(screen.getByText(/Yellow/)).toBeVisible();
});
it('keeps Red confirmation disabled until a real challenge succeeds',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({tier:'Red',reason:'DAILY_TRANSFER_THRESHOLD'})}));
 const ready=vi.fn();render(<ActionVerification actionId="b" onReady={ready}/>);
 expect(await screen.findByRole('button',{name:'Verify this action'})).toBeVisible();
 expect(ready).not.toHaveBeenCalledWith(true);
});
