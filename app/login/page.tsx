'use client';
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/supabase/config';

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
  return <main>
    <h1>Sign in to Fudan Global Finance AI</h1>
    <p>Simulated financial data. Use only your fictional demo account—not bank credentials.</p>
    {!configured && <p>Hosted authentication is not configured. The local demo remains available.</p>}
    <form onSubmit={signIn}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button disabled={!configured || pending} type="submit">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
    {error && <p role="alert">Unable to sign in. Check your demo credentials and try again.</p>}
    {!error && !signedIn && callbackError && <p role="alert">Unable to complete sign-in. Please try again.</p>}
    {signedIn && <p role="status">Signed in. Opening your overview…</p>}
    <Link href="/">Open local demo</Link><p><Link href="/register">Create a simulated banking account</Link></p>
  </main>;
}

export default function LoginPage() {
  return <Suspense fallback={<p role="status">Loading sign-in…</p>}><LoginForm /></Suspense>;
}
