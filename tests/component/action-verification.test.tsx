import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {createBrowserSupabaseClient} from '../../src/lib/supabase/browser';
import {afterEach,expect,it,vi} from 'vitest';
import {ActionVerification} from '../../src/features/banking/action-verification';
vi.mock('../../src/lib/supabase/browser',()=>({createBrowserSupabaseClient:vi.fn()}));
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
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
it('revokes readiness when the action-bound grant deadline expires',async()=>{
 vi.useFakeTimers();vi.setSystemTime(10000);
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_url,options)=>({ok:true,json:async()=>{
  const operation=JSON.parse(options.body).operation;return operation==='policy'?{tier:'Red',reason:'DAILY_TRANSFER_THRESHOLD'}:operation==='begin'?{id:'grant'}:{status:'verified'};
 }})));
 vi.mocked(createBrowserSupabaseClient).mockReturnValue({auth:{mfa:{listFactors:async()=>({data:{totp:[{id:'factor',status:'verified'}]}}),challengeAndVerify:async()=>({error:null})}}} as never);
 const ready=vi.fn();await act(async()=>{render(<ActionVerification actionId="expiry" onReady={ready}/>);});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Verify this action'}));});
 fireEvent.change(screen.getByRole('textbox',{name:'Authenticator code'}),{target:{value:'123456'}});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Verify code'}));});
 expect(ready).toHaveBeenLastCalledWith(true);
 act(()=>vi.advanceTimersByTime(300000));expect(ready).toHaveBeenLastCalledWith(false);
 expect(screen.getByText('Verification expired. Verify this action again.')).toBeVisible();
});

