import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../../app/register/page';

const auth = vi.hoisted(() => ({ error: false }));
vi.mock('../../src/lib/supabase/config', () => ({ isSupabaseConfigured: () => true }));
vi.mock('../../src/lib/supabase/browser', () => ({ createBrowserSupabaseClient: () => ({ auth: { signUp: async () => ({ error: auth.error ? new Error('private provider details') : null }) } }) }));

describe('registration feedback', () => {
  beforeEach(() => { auth.error = false; });
  function submit() {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fictional-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  }
  it('provides a next step after an account request', async () => {
    submit();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Check your email'));
  });
  it('announces a registration failure with a recovery action', async () => {
    auth.error = true;
    submit();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('try again'));
    expect(screen.queryByText('private provider details')).not.toBeInTheDocument();
  });
});
