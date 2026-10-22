'use client';
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ArrowRight, CircleAlert, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { DemoEntry } from '../../src/components/auth/demo-entry';
import { AuthShell } from '../../src/components/auth/auth-shell';
import { Captcha } from '../../src/components/auth/captcha';
import { captchaRequired } from '../../src/lib/security/policy';
import { PasswordField } from '../../src/components/auth/password-field';

function LoginForm() {
  const router = useRouter();
  const callbackError = useSearchParams().get('error') === 'auth';
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const captchaReady = !captchaRequired() || Boolean(captchaToken);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const configured = isSupabaseConfigured();
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured || !captchaReady) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError(false);
    try {
      const client = createBrowserSupabaseClient();
      const { error } = await client.auth.signInWithPassword({
        email: String(form.get('email')), password: String(form.get('password')), options: { captchaToken },
      });
      if (error) { setError(true); return; }
      setSignedIn(true);
      router.replace('/security'); router.refresh();
    } catch { setError(true); }
    finally { setPending(false); setCaptchaToken(''); setCaptchaAttempt(n => n + 1); }
  }
  return <AuthShell>
    <span className="auth-mode-label"><ShieldCheck size={15} aria-hidden />PERSONAL BANKING</span>
    <h1 className="auth-title">Welcome back.</h1>
    <p className="auth-intro">Your financial world, all in one place.<br />Sign in to your account.</p>
    {!configured && <p className="auth-notice">Sign-in is currently unavailable. You can still explore the overview.</p>}
    <form onSubmit={signIn} className="auth-form" aria-label="Sign in" aria-busy={pending}>
      <div className="auth-field"><label htmlFor="email">Email</label><div className="auth-input-wrap"><Mail className="auth-input-icon" size={18} aria-hidden /><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" className="auth-input" disabled={pending} required /></div></div>
      <div className="auth-field"><label htmlFor="password">Password</label><PasswordField id="password" name="password" autoComplete="current-password" placeholder="Enter your password" disabled={pending} required /></div>
      {error && <p role="alert" className="auth-feedback auth-feedback-error"><CircleAlert size={18} aria-hidden />Unable to sign in. Check your email and password and try again.</p>}
      {!error && !signedIn && callbackError && <p role="alert" className="auth-feedback auth-feedback-error"><CircleAlert size={18} aria-hidden />Unable to complete sign-in. Please try again.</p>}
      <Captcha key={captchaAttempt} onToken={setCaptchaToken} />
      <button className="auth-submit" disabled={!configured || pending || !captchaReady} type="submit">{pending ? <><LoaderCircle size={18} className="auth-spinner" aria-hidden />Signing in…</> : <>Sign in<ArrowRight size={18} aria-hidden /></>}</button>
    </form>
    {signedIn && <p role="status" className="auth-feedback auth-feedback-success">Signed in. Opening your account…</p>}
    <p className="auth-switch">New here? <Link href="/register">Create an account</Link></p>
    <div className="auth-divider"><span />YOUR NEXT STEP<span /></div>
    <DemoEntry/>

  </AuthShell>;
}

export default function LoginPage() {
  return <Suspense fallback={<AuthShell><p role="status">Loading sign-in…</p></AuthShell>}><LoginForm /></Suspense>;
}

