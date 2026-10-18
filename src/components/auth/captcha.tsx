'use client';
import { useEffect, useRef, useState } from 'react';
import { captchaRequired } from '../../lib/security/policy';
type Turnstile = { render: (el:HTMLElement, options:Record<string,unknown>)=>string; remove:(id:string)=>void };
declare global { interface Window { turnstile?: Turnstile } }
export function Captcha({onToken}:{onToken:(token:string)=>void}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  const [failed,setFailed] = useState(false);
  useEffect(() => { callback.current = onToken; },[onToken]);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!sitekey) return;
    let id: string | undefined;
    let stopped = false;
    const mount = () => {
      if (stopped || !container.current || !window.turnstile || id) return;
      id = window.turnstile.render(container.current, {sitekey, theme:'light', size:'flexible',
        callback:(token:string)=>{setFailed(false);callback.current(token)},
        'expired-callback':()=>callback.current(''),
        'error-callback':()=>{callback.current('');setFailed(true)}});
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-bank-captcha]');
    if (!script) {
      script = document.createElement('script'); script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true; script.dataset.bankCaptcha='true';
      script.nonce=document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ?? '';
      document.head.appendChild(script);
    }
    const fail = () => setFailed(true);
    script.addEventListener('load',mount);script.addEventListener('error',fail);mount();
    return () => {stopped=true;script.removeEventListener('load',mount);script.removeEventListener('error',fail);if(id)window.turnstile?.remove(id)};
  },[sitekey]);
  if (!captchaRequired()) return null;
  if (!sitekey) return <p role="alert" className="auth-notice">Secure sign-in is being configured. Please try again later.</p>;
  return <div><div ref={container} aria-label="Security verification"/>{failed&&<p role="alert">Security verification could not load. Refresh to try again.</p>}</div>;
}
