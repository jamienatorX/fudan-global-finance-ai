'use client';
import { createElement, type ComponentProps, type JSX, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useLanguage } from './language-provider';
import { translateText, type Language } from './translate';

// Localized primitives keep React in charge of text and accessibility attributes.
// We never rewrite the DOM, input values, event handlers, URLs or financial data.
export function localizeChildren(children: ReactNode, language: Language): ReactNode {
  if (language === 'en') return children;
  if (typeof children === 'string') return translateText(children,language);
  if (!Array.isArray(children)) return children;
  const translated: ReactNode[]=[];
  let run: ReactNode[]=[];
  function flush() {
    if (!run.length) return;
    const joined=run.join('');
    const value=translateText(joined,language);
    // Keep child slots stable so translating a label cannot remount its input.
    if(value!==joined) translated.push(value,...run.slice(1).map(()=>null));
    else translated.push(...run.map(item=>typeof item==='string'?translateText(item,language):item));
    run=[];
  }
  for (const child of children) {
    if(typeof child==='string'||typeof child==='number')run.push(child);
    else {flush();translated.push(Array.isArray(child)?localizeChildren(child,language):child);}
  }
  flush();return translated;
}
export function localizeProps<P extends object>(props:P,language:Language):P {
  if ('translate' in props && props.translate === 'no') return props;
  const result={...props} as Record<string,unknown>;
  for(const name of ['aria-label','aria-description','aria-valuetext','title','placeholder','alt']){
    if(typeof result[name]==='string')result[name]=translateText(result[name] as string,language);
  }
  if('children' in result) result.children=localizeChildren(result.children as ReactNode,language);
  return result as P;
}
function tag<K extends keyof JSX.IntrinsicElements>(name:K) {
  return function LocalizedTag(props:JSX.IntrinsicElements[K]) {
    const {language}=useLanguage();
    return createElement(name,localizeProps(props,language));
  };
}

export const LocalizedA = tag('a');
export const LocalizedArticle = tag('article');
export const LocalizedAside = tag('aside');
export const LocalizedBr = tag('br');
export const LocalizedButton = tag('button');
export const LocalizedCode = tag('code');
export const LocalizedDd = tag('dd');
export const LocalizedDetails = tag('details');
export const LocalizedDiv = tag('div');
export const LocalizedDl = tag('dl');
export const LocalizedDt = tag('dt');
export const LocalizedFooter = tag('footer');
export const LocalizedForm = tag('form');
export const LocalizedH1 = tag('h1');
export const LocalizedH2 = tag('h2');
export const LocalizedH3 = tag('h3');
export const LocalizedHeader = tag('header');
export const LocalizedI = tag('i');
export const LocalizedInput = tag('input');
export const LocalizedLabel = tag('label');
export const LocalizedLi = tag('li');
export const LocalizedMain = tag('main');
export const LocalizedNav = tag('nav');
export const LocalizedOl = tag('ol');
export const LocalizedOption = tag('option');
export const LocalizedP = tag('p');
export const LocalizedProgress = tag('progress');
export const LocalizedSection = tag('section');
export const LocalizedSelect = tag('select');
export const LocalizedSmall = tag('small');
export const LocalizedSpan = tag('span');
export const LocalizedStrong = tag('strong');
export const LocalizedSummary = tag('summary');
export const LocalizedTable = tag('table');
export const LocalizedTbody = tag('tbody');
export const LocalizedTd = tag('td');
export const LocalizedText = tag('text');
export const LocalizedTextarea = tag('textarea');
export const LocalizedTfoot = tag('tfoot');
export const LocalizedTh = tag('th');
export const LocalizedThead = tag('thead');
export const LocalizedTime = tag('time');
export const LocalizedTr = tag('tr');
export const LocalizedUl = tag('ul');
export function LocalizedLink(props: ComponentProps<typeof NextLink>) {
 const {language}=useLanguage();return createElement(NextLink,localizeProps(props,language));
}

export function LocalizedCopy({children}: {children:ReactNode}) { const {language}=useLanguage(); return localizeChildren(children,language); }
