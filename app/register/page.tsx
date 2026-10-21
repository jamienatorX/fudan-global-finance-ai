'use client';
import { LocalizedBr, LocalizedButton, LocalizedDiv, LocalizedForm, LocalizedH1, LocalizedInput, LocalizedLabel, LocalizedP, LocalizedSpan } from '../../src/i18n/localized';
import { useState,type FormEvent } from 'react';
import { LocalizedLink as Link } from '../../src/i18n/localized';
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
   setMessage(error?'Unable to create account. Check your inputs and try again.':
    'Account request received. Check your email for a confirmation link, then sign in. ');
  }catch{setFailed(true);setMessage('Registration could not be completed. Please try again.');}finally{setPending(false)}
 }
 return <AuthShell>
  <LocalizedSpan className="auth-mode-label"><ShieldCheck size={15} aria-hidden />PERSONAL BANKING</LocalizedSpan>
  <LocalizedH1 className="auth-title">Make room for<LocalizedBr />what comes next.</LocalizedH1>
  <LocalizedP className="auth-intro">Create your account and explore a clearer way to manage student life.</LocalizedP>
  {!isSupabaseConfigured() && <LocalizedP className="auth-notice">Account registration is currently unavailable. Please try again later.</LocalizedP>}
  <LocalizedForm onSubmit={submit} className="auth-form" aria-label="Create an account" aria-busy={pending}>
   <LocalizedDiv className="auth-field"><LocalizedLabel htmlFor="email">Email</LocalizedLabel><LocalizedDiv className="auth-input-wrap"><Mail className="auth-input-icon" size={18} aria-hidden /><LocalizedInput id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="auth-input" disabled={pending} value={email} onChange={e=>setEmail(e.target.value)}/></LocalizedDiv></LocalizedDiv>
   <LocalizedDiv className="auth-field"><LocalizedLabel htmlFor="password">Password</LocalizedLabel><PasswordField id="password" name="password" required minLength={12} autoComplete="new-password" aria-describedby="password-help" placeholder="Create a password" disabled={pending} value={password} onChange={e=>setPassword(e.target.value)}/><LocalizedP id="password-help" className="auth-field-help">Use at least 12 characters.</LocalizedP></LocalizedDiv>
   <LocalizedButton type="submit" className="auth-submit" disabled={pending||!isSupabaseConfigured()}>{pending?<><LoaderCircle className="auth-spinner" size={18} aria-hidden />Submitting…</>:<>Create account<ArrowRight size={18} aria-hidden /></>}</LocalizedButton>
  </LocalizedForm>
  {message&&<LocalizedP role={failed?'alert':'status'} className={`auth-feedback ${failed?'auth-feedback-error':'auth-feedback-success'}`}>{message}</LocalizedP>}
  <LocalizedP className="auth-switch">Already registered? <Link href="/login">Sign in</Link></LocalizedP>
  <LocalizedDiv className="auth-divider"><LocalizedSpan />YOUR NEXT STEP<LocalizedSpan /></LocalizedDiv>
  <Link href="/" className="auth-secondary">Explore overview<ArrowRight size={16} aria-hidden /></Link>

 </AuthShell>;
}

