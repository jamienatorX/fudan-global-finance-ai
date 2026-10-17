'use client';
import { useState,type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import { isSupabaseConfigured } from '../../src/lib/supabase/config';

export default function RegisterPage(){
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [pending,setPending]=useState(false);const [message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(pending||!isSupabaseConfigured())return;
  setPending(true);setMessage('');
  try{
   const client=createBrowserSupabaseClient();
   const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/auth/callback?next=/banking'}});
   setMessage(error?'Unable to create demo account. Check your inputs and try again.':
    'Account request received. Check your email for a confirmation link, then sign in. Only fictional demo accounts are provided.');
  }catch{setMessage('Registration could not be completed.');}finally{setPending(false)}
 }
 return <main className="mx-auto min-h-screen max-w-lg px-6 py-16">
  <Link href="/" className="text-sm font-semibold text-blue-700">← Public competition demo</Link>
  <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
  <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Authenticated banking sandbox</p>
  <h1 className="mt-2 text-3xl font-bold">Create a fictional banking account</h1>
  <p className="mt-3 text-sm text-slate-600">This is not a deposit account or a financial service. Never enter actual banking credentials or bank account numbers.</p>
  <form onSubmit={submit} className="mt-6 space-y-4">
   <label className="block text-sm font-semibold">Email<input type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label className="block text-sm font-semibold">Password (12+ characters)<input type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending||!isSupabaseConfigured()}>{pending?'Submitting…':'Register for sandbox'}</button>
  </form>
  {message&&<p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
  <p className="mt-5 text-sm text-slate-600">Already registered? <Link href="/login" className="font-semibold text-blue-700 underline">Sign in</Link>.</p>
  </div></main>;
}
