import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../../app/login/page';

const auth = vi.hoisted(() => ({ error: false, configured: true, query: '' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams(auth.query) }));
vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: () => auth.configured }));
vi.mock('@/lib/supabase/browser', () => ({ createBrowserSupabaseClient: () => ({ auth: { signInWithPassword: async ({ email, password }: { email: string; password: string }) => ({ error: auth.error || email !== 'demo@example.test' || password !== 'fictional-password' ? new Error('provider details') : null }) } }) }));

describe('fictional account login', () => {
  beforeEach(() => { auth.error = false; auth.configured = true; auth.query = ''; });
  it('signs in with user-entered credentials and communicates success', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fictional-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Signed in'));
  });
  it('shows safe authentication failure without leaking provider details', async () => {
    auth.error = true;
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fictional-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to sign in'));
    expect(screen.queryByText('provider details')).not.toBeInTheDocument();
  });
  it('disables hosted sign-in when configuration is absent while retaining the local demo', () => {
    auth.configured = false;
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Open local demo' })).toHaveAttribute('href', '/');
  });
  it('displays a generic allowlisted callback failure', () => {
    auth.query = 'error=auth&details=private-provider-information';
    render(<LoginPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to complete sign-in. Please try again.');
    expect(screen.queryByText(/private-provider-information/)).not.toBeInTheDocument();
  });
  it('does not display arbitrary callback query errors', () => {
    auth.query = 'error=private-provider-information';
    render(<LoginPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/private-provider-information/)).not.toBeInTheDocument();
  });
});
