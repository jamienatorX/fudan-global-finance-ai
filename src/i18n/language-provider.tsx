'use client';
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { translateText, type Language } from './translate';

export const LANGUAGE_STORAGE_KEY = 'fu-bank-language';
const eventName = 'fu-bank-language-change';
function readLanguage(): Language {
  if (memoryLanguage !== null) return memoryLanguage;
  try { return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'zh-CN' ? 'zh-CN' : 'en'; } catch { return 'en'; }
}
function subscribe(callback: () => void) {
  const onStorage=()=>{memoryLanguage=null;callback();};
  window.addEventListener('storage', onStorage);
  window.addEventListener(eventName, callback);
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(eventName, callback); };
}
const LanguageContext = createContext<{language: Language; setLanguage: (language: Language) => void}>({language:'en', setLanguage:()=>{}});

export function LanguageProvider({children}: {children: ReactNode}) {
  const language = useSyncExternalStore(subscribe, readLanguage, () => 'en' as Language);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function setLanguage(next: Language) {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); memoryLanguage=null; } catch { memoryLanguage=next; }
    window.dispatchEvent(new Event(eventName));
  }
  return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
let memoryLanguage: Language | null = null;
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;
export function useLanguage() {
  const context = useContext(LanguageContext);
  // Each streamed/Suspense boundary must first match its English server text,
  // even if the parent has already restored a different saved language.
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  return {...context, language: hydrated ? context.language : 'en' as Language};
}
export function useTranslation() { const {language}=useLanguage(); return (value:string)=>translateText(value,language); }

export function LanguageSwitcher() {
  const {language,setLanguage}=useLanguage();
  return <div className="language-switcher" role="group" aria-label="Language / 语言">
    <button type="button" lang="en" aria-label="English" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button>
    <button type="button" lang="zh-CN" aria-label="简体中文" aria-pressed={language==='zh-CN'} onClick={()=>setLanguage('zh-CN')}>中文</button>
  </div>;
}
