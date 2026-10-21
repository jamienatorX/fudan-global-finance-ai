import {Suspense} from 'react';
import {act} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {hydrateRoot} from 'react-dom/client';
import {expect,it} from 'vitest';
import {LanguageProvider,LANGUAGE_STORAGE_KEY} from '../../src/i18n/language-provider';
import {LocalizedP} from '../../src/i18n/localized';

it('hydrates server English markup before restoring the saved Chinese preference',async()=>{
 localStorage.setItem(LANGUAGE_STORAGE_KEY,'zh-CN');
 const tree=<LanguageProvider><LocalizedP>View transactions</LocalizedP></LanguageProvider>;
 const container=document.createElement('div');container.innerHTML=renderToString(tree);document.body.append(container);
 expect(container.textContent).toBe('View transactions');
 const errors:unknown[]=[];let root:ReturnType<typeof hydrateRoot>;
 await act(async()=>{root=hydrateRoot(container,tree,{onRecoverableError:error=>errors.push(error)});});
 expect(errors).toEqual([]);
 expect(container.textContent).toBe('查看交易');
 await act(async()=>root.unmount());container.remove();localStorage.clear();
});

it('restores a saved language without mismatching a delayed hydration boundary',async()=>{
 localStorage.setItem(LANGUAGE_STORAGE_KEY,'zh-CN');
 let client=false,ready=false,release:()=>void=()=>{};
 const pending=new Promise<void>(resolve=>{release=resolve;});
 function Deferred(){if(client&&!ready)throw pending;return <LocalizedP>View transactions</LocalizedP>;}
 const tree=<LanguageProvider><Suspense fallback={null}><Deferred/></Suspense></LanguageProvider>;
 const container=document.createElement('div');container.innerHTML=renderToString(tree);document.body.append(container);
 client=true;const errors:unknown[]=[];let root:ReturnType<typeof hydrateRoot>;
 await act(async()=>{root=hydrateRoot(container,tree,{onRecoverableError:error=>errors.push(error)});});
 await act(async()=>{ready=true;release();await pending;});
 expect(errors).toEqual([]);
 expect(container.textContent).toBe('查看交易');
 await act(async()=>root.unmount());container.remove();localStorage.clear();
});
