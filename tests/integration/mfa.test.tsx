import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import SecurityPage from '../../app/security/page';
const state=vi.hoisted(()=>({verified:false,fail:false,push:vi.fn(),verify:vi.fn(),enroll:vi.fn()}));
const router={replace:state.push,refresh:()=>{}};
vi.mock('next/navigation',()=>({useRouter:()=>router}));
vi.mock('../../src/lib/supabase/browser',()=>({createBrowserSupabaseClient:()=>({auth:{
  getUser:async()=>({data:{user:{id:'user'}},error:null}),
  mfa:{listFactors:async()=>({data:{totp:state.verified?[{id:'verified',status:'verified'}]:[],all:[]},error:null}),
    enroll:async()=>{state.enroll();return {data:{id:'new-factor',totp:{qr_code:'data:image/svg+xml;utf-8,<svg><path fill="#000"/></svg>',secret:'setup-secret'}},error:null};},
    unenroll:async()=>({error:null}),
    challengeAndVerify:async(value:unknown)=>{state.verify(value);return {error:state.fail?new Error('provider secret'):null};}},
  signOut:async()=>({error:null}),
}})}));
describe('authenticator checkpoint',()=>{
  beforeEach(()=>{state.verified=false;state.fail=false;state.push.mockClear();state.verify.mockClear();state.enroll.mockClear();});
  it('requires verification to finish authenticator enrollment',async()=>{
    render(<SecurityPage/>);
    fireEvent.click(await screen.findByRole('button',{name:'Set up authenticator'}));
    expect(await screen.findByAltText('Authenticator setup QR code')).toBeInTheDocument();
    const qr=screen.getByAltText('Authenticator setup QR code');
    expect(qr.getAttribute('src')).toBe('data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg><path fill="#000"/></svg>'));
    expect(qr).toHaveStyle({backgroundColor:'rgb(255, 255, 255)',padding:'24px'});
    expect(state.push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Authenticator code'),{target:{value:'123456'}});
    fireEvent.click(screen.getByRole('button',{name:'Verify and continue'}));
    await waitFor(()=>expect(state.push).toHaveBeenCalledWith('/banking'));
    expect(state.verify).toHaveBeenCalledWith({factorId:'new-factor',code:'123456'});
  });
  it('keeps an invalid code out of banking and never exposes provider details',async()=>{
    state.verified=true;state.fail=true;render(<SecurityPage/>);
    fireEvent.change(await screen.findByLabelText('Authenticator code'),{target:{value:'000000'}});
    fireEvent.click(screen.getByRole('button',{name:'Verify and continue'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
    expect(state.push).not.toHaveBeenCalled();expect(screen.queryByText('provider secret')).not.toBeInTheDocument();
    expect(state.enroll).not.toHaveBeenCalled();
  });
});


