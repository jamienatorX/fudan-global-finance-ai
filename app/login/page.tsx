'use client';
import { LocalizedBr, LocalizedButton, LocalizedDiv, LocalizedForm, LocalizedH1, LocalizedInput, LocalizedLabel, LocalizedP, LocalizedSpan } from '../../src/i18n/localized';
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LocalizedLink as Link } from '../../src/i18n/localized';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ArrowRight, ArrowUpRight, CircleAlert, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../src/components/auth/auth-shell';
import { PasswordField } from '../../src/components/auth/password-field';

function LoginForm() {
  const router = useRouter();
  const callbackError = useSearchParams().get('error') === 'auth';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const configured = isSupabaseConfigured();
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError(false);
    try {
      const client = createBrowserSupabaseClient();
      const { error } = await client.auth.signInWithPassword({
        email: String(form.get('email')), password: String(form.get('password')),
      });
      if (error) { setError(true); return; }
      setSignedIn(true);
      router.replace('/banking'); router.refresh();
    } catch { setError(true); }
    finally { setPending(false); }
  }
  return <AuthShell>
    <LocalizedSpan className="auth-mode-label"><ShieldCheck size={15} aria-hidden />PERSONAL BANKING</LocalizedSpan>
    <LocalizedH1 className="auth-title">Welcome back.</LocalizedH1>
    <LocalizedP className="auth-intro">Your financial world, all in one place.<LocalizedBr />Sign in to your account.</LocalizedP>
    {!configured && <LocalizedP className="auth-notice">Sign-in is currently unavailable. You can still explore the overview.</LocalizedP>}
    <LocalizedForm onSubmit={signIn} className="auth-form" aria-label="Sign in" aria-busy={pending}>
      <LocalizedDiv className="auth-field"><LocalizedLabel htmlFor="email">Email</LocalizedLabel><LocalizedDiv className="auth-input-wrap"><Mail className="auth-input-icon" size={18} aria-hidden /><LocalizedInput id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" className="auth-input" disabled={pending} required /></LocalizedDiv></LocalizedDiv>
      <LocalizedDiv className="auth-field"><LocalizedLabel htmlFor="password">Password</LocalizedLabel><PasswordField id="password" name="password" autoComplete="current-password" placeholder="Enter your password" disabled={pending} required /></LocalizedDiv>
      {error && <LocalizedP role="alert" className="auth-feedback auth-feedback-error"><CircleAlert size={18} aria-hidden />Unable to sign in. Check your email and password and try again.</LocalizedP>}
      {!error && !signedIn && callbackError && <LocalizedP role="alert" className="auth-feedback auth-feedback-error"><CircleAlert size={18} aria-hidden />Unable to complete sign-in. Please try again.</LocalizedP>}
      <LocalizedButton className="auth-submit" disabled={!configured || pending} type="submit">{pending ? <><LoaderCircle size={18} className="auth-spinner" aria-hidden />Signing in…</> : <>Sign in<ArrowRight size={18} aria-hidden /></>}</LocalizedButton>
    </LocalizedForm>
    {signedIn && <LocalizedP role="status" className="auth-feedback auth-feedback-success">Signed in. Opening your account…</LocalizedP>}
    <LocalizedP className="auth-switch">New here? <Link href="/register">Create an account</Link></LocalizedP>
    <LocalizedDiv className="auth-divider"><LocalizedSpan />YOUR NEXT STEP<LocalizedSpan /></LocalizedDiv>
    <Link href="/" className="auth-secondary">Explore overview<ArrowUpRight size={16} aria-hidden /></Link>

  </AuthShell>;
}

export default function LoginPage() {
  return <Suspense fallback={<AuthShell><LocalizedP role="status">Loading sign-in…</LocalizedP></AuthShell>}><LoginForm /></Suspense>;
}

