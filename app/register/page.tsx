'use client';
import { useState,type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import { isSupabaseConfigured } from '../../src/lib/supabase/config';
import { ArrowRight, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../src/components/auth/auth-shell';
import { PasswordField } from '../../src/components/auth/password-field';

export default function RegisterPage(){
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [pending,setPending]=useState(false);const [message,setMessage]=useState('');
 const [failed,setFailed]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(pending||!isSupabaseConfigured())return;
  setPending(true);setMessage('');setFailed(false);
  try{
   const client=createBrowserSupabaseClient();
   const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/auth/callback?next=/banking'}});
   setFailed(Boolean(error));
   setMessage(error?'Unable to create demo account. Check your inputs and try again.':
    'Account request received. Check your email for a confirmation link, then sign in. Only fictional demo accounts are provided.');
  }catch{setFailed(true);setMessage('Registration could not be completed. Please try again.');}finally{setPending(false)}
 }
 return <AuthShell>
  <span className="auth-mode-label"><ShieldCheck size={15} aria-hidden />SIMULATED BANKING</span>
  <h1 className="auth-title">Make room for<br />what comes next.</h1>
  <p className="auth-intro">Create your fictional banking account and explore a clearer way to manage student life.</p>
  {!isSupabaseConfigured() && <p className="auth-notice">Hosted registration is not configured. You can still explore the local demo.</p>}
  <form onSubmit={submit} className="auth-form" aria-label="Create a simulated account" aria-busy={pending}>
   <div className="auth-field"><label htmlFor="email">Email</label><div className="auth-input-wrap"><Mail className="auth-input-icon" size={18} aria-hidden /><input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="auth-input" disabled={pending} value={email} onChange={e=>setEmail(e.target.value)}/></div></div>
   <div className="auth-field"><label htmlFor="password">Password</label><PasswordField id="password" name="password" required minLength={12} autoComplete="new-password" aria-describedby="password-help" placeholder="Create a password" disabled={pending} value={password} onChange={e=>setPassword(e.target.value)}/><p id="password-help" className="auth-field-help">Use at least 12 characters and a password unique to this demo.</p></div>
   <button type="submit" className="auth-submit" disabled={pending||!isSupabaseConfigured()}>{pending?<><LoaderCircle className="auth-spinner" size={18} aria-hidden />Submitting…</>:<>Register for sandbox<ArrowRight size={18} aria-hidden /></>}</button>
  </form>
  {message&&<p role={failed?'alert':'status'} className={`auth-feedback ${failed?'auth-feedback-error':'auth-feedback-success'}`}>{message}</p>}
  <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
  <div className="auth-divider"><span />JUST EXPLORING?<span /></div>
  <Link href="/" className="auth-secondary">Open local demo<ArrowRight size={16} aria-hidden /></Link>
  <p className="auth-disclosure">This is not a deposit account or a financial service. Never enter actual banking credentials or bank account numbers.</p>
 </AuthShell>;
}

