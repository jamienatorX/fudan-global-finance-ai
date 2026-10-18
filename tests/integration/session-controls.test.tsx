import { act,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { SessionControls } from '../../src/features/banking/session-controls';
const state=vi.hoisted(()=>({push:vi.fn(),signOut:vi.fn()}));
const router={replace:state.push,refresh:()=>{}};
vi.mock('next/navigation',()=>({useRouter:()=>router}));
vi.mock('../../src/lib/supabase/browser',()=>({createBrowserSupabaseClient:()=>({auth:{signOut:state.signOut}})}));
beforeEach(()=>{vi.useFakeTimers();state.push.mockClear();state.signOut.mockReset().mockResolvedValue({error:null});vi.stubGlobal('fetch',vi.fn(async()=>({status:200})));});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('session controls',()=>{
  it('locks an idle browser and redirects to sign-in',async()=>{
    render(<SessionControls/>);
    await act(async()=>{await vi.advanceTimersByTimeAsync(15*60_000);});
    expect(state.signOut).toHaveBeenCalledWith({scope:'local'});
    expect(state.push).toHaveBeenCalledWith('/login?reason=session');
  });
  it('signs out other devices without signing out the current device',async()=>{
    render(<SessionControls/>);
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Sign out other devices'}));});
    expect(state.signOut).toHaveBeenCalledWith({scope:'others'});
    expect(screen.getByRole('status')).toHaveTextContent('Other devices have been signed out');
    expect(state.push).not.toHaveBeenCalled();
  });
});
