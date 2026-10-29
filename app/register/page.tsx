'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { registrationFeedback } from '../../src/components/auth/registration-feedback';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import { isSupabaseConfigured } from '../../src/lib/supabase/config';
import { ArrowRight, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { DemoEntry } from '../../src/components/auth/demo-entry';
import { AuthShell } from '../../src/components/auth/auth-shell';
import { Captcha } from '../../src/components/auth/captcha';
import { captchaRequired } from '../../src/lib/security/policy';
import { PasswordField } from '../../src/components/auth/password-field';

export default function RegisterPage(){
 const [captchaToken,setCaptchaToken]=useState(''); const [captchaAttempt,setCaptchaAttempt]=useState(0);
 const captchaReady=!captchaRequired()||Boolean(captchaToken);
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [pending,setPending]=useState(false);const [message,setMessage]=useState('');
 const [failed,setFailed]=useState(false);
 const emailInput=useRef<HTMLInputElement>(null);
 const [cooldown,setCooldown]=useState(0);
 useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
 async function resend(){
  if(pending||cooldown>0||!isSupabaseConfigured()||!captchaReady||!emailInput.current?.reportValidity())return;
  setPending(true);setMessage('');setFailed(false);
  try{
   const {error}=await createBrowserSupabaseClient().auth.resend({type:'signup',email,options:{captchaToken,emailRedirectTo:window.location.origin+'/auth/callback?next=/security'}});
   setFailed(Boolean(error));setMessage(registrationFeedback(error));setCooldown(60);
  }catch{setFailed(true);setMessage('The email request could not be completed. Check your connection and try again later.');}
  finally{setPending(false);setCaptchaToken('');setCaptchaAttempt(n=>n+1);}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(pending||cooldown>0||!isSupabaseConfigured()||!captchaReady)return;
  setPending(true);setMessage('');setFailed(false);
  try{
   const client=createBrowserSupabaseClient();
   const {error}=await client.auth.signUp({email,password,options:{captchaToken,emailRedirectTo:window.location.origin+'/auth/callback?next=/security'}});
   setFailed(Boolean(error));
   setMessage(registrationFeedback(error));
   if(!error||error.status===429)setCooldown(60);
  }catch{setFailed(true);setMessage('Registration could not be completed. Please try again.');}finally{setPending(false);setCaptchaToken('');setCaptchaAttempt(n=>n+1)}
 }
 return <AuthShell>
  <span className="auth-mode-label"><ShieldCheck size={15} aria-hidden />PERSONAL BANKING</span>
  <h1 className="auth-title">Make room for<br />what comes next.</h1>
  <p className="auth-intro">Create your account and explore a clearer way to manage student life.</p>
  {!isSupabaseConfigured() && <p className="auth-notice">Account registration is currently unavailable. Please try again later.</p>}
  <form onSubmit={submit} className="auth-form" aria-label="Create an account" aria-busy={pending}>
   <div className="auth-field"><label htmlFor="email">Email</label><div className="auth-input-wrap"><Mail className="auth-input-icon" size={18} aria-hidden /><input ref={emailInput} id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="auth-input" disabled={pending} value={email} onChange={e=>setEmail(e.target.value)}/></div></div>
   <div className="auth-field"><label htmlFor="password">Password</label><PasswordField id="password" name="password" required minLength={12} autoComplete="new-password" aria-describedby="password-help" placeholder="Create a password" disabled={pending} value={password} onChange={e=>setPassword(e.target.value)}/><p id="password-help" className="auth-field-help">Use at least 12 characters.</p></div>
   <Captcha key={captchaAttempt} onToken={setCaptchaToken}/>
   <button type="submit" className="auth-submit" disabled={pending||cooldown>0||!isSupabaseConfigured()||!captchaReady}>{pending?<><LoaderCircle className="auth-spinner" size={18} aria-hidden />Submitting…</>:<>Create account<ArrowRight size={18} aria-hidden /></>}</button>
   <button type="button" className="auth-submit" onClick={()=>void resend()} disabled={pending||cooldown>0||!isSupabaseConfigured()||!captchaReady}>Resend confirmation email</button>
   <p className="auth-field-help">Already requested an account? Resend uses only your email address. Complete security verification first.</p>
   {cooldown>0&&<p role="status" className="auth-field-help">Wait {cooldown} seconds before another request.</p>}
  </form>
  {message&&<p role={failed?'alert':'status'} className={`auth-feedback ${failed?'auth-feedback-error':'auth-feedback-success'}`}>{message}</p>}
  <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
  <div className="auth-divider"><span />YOUR NEXT STEP<span /></div>
  <DemoEntry/>

 </AuthShell>;
}


