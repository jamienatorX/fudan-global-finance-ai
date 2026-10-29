import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../../app/register/page';

const auth = vi.hoisted(() => ({ error: null as null|{code?:string;status?:number;message?:string},resend:vi.fn() }));
vi.mock('../../src/lib/supabase/config', () => ({ isSupabaseConfigured: () => true }));
vi.mock('../../src/lib/supabase/browser', () => ({ createBrowserSupabaseClient: () => ({ auth: { signUp: async () => ({ error: auth.error }),resend:auth.resend } }) }));

describe('registration feedback', () => {
  beforeEach(() => { auth.error = null;auth.resend.mockReset().mockResolvedValue({error:null}); });
  function submit() {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fictional-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  }
  it('provides a next step after an account request', async () => {
    submit();
    await waitFor(() => expect(screen.getByText(/Request received/)).toHaveTextContent('check your inbox'));
  });
  it('announces a registration failure with a recovery action', async () => {
    auth.error = {message:'private provider details'};
    submit();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('try again'));
    expect(screen.queryByText('private provider details')).not.toBeInTheDocument();
  });
  it('offers simple retry feedback when sending is unavailable',async()=>{
    auth.error={code:'over_email_send_rate_limit',status:429};submit();
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Please try again later'));
    expect(screen.getByRole('button',{name:'Create account'})).toBeDisabled();
  });
  it('resends confirmation without requesting a password or creating another account',async()=>{
    render(<RegisterPage/>);
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'demo@example.test'}});
    fireEvent.click(screen.getByRole('button',{name:'Resend confirmation email'}));
    await waitFor(()=>expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({type:'signup',email:'demo@example.test',options:expect.objectContaining({emailRedirectTo:expect.stringContaining('/auth/callback?next=/security')})})));
    expect(screen.getByRole('button',{name:'Resend confirmation email'})).toBeDisabled();
  });
});

