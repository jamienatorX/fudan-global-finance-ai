'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2,Square} from 'lucide-react';
import {playReplySpeech} from './reply-speech';
export function ReplyListen({text,disabled=false}:{text:string;disabled?:boolean}){
 const [playing,setPlaying]=useState(false),[error,setError]=useState('');const stop=useRef<(()=>void)|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;const halt=()=>stop.current?.();window.addEventListener('pagehide',halt);return()=>{mounted.current=false;halt();window.removeEventListener('pagehide',halt);};},[text]);
 function toggle(){if(playing){stop.current?.();return;}setError('');setPlaying(true);stop.current=playReplySpeech(text,()=>{if(mounted.current)setPlaying(false);},message=>{if(mounted.current){setPlaying(false);setError(message);}});}
 return <div className="mt-2"><button type="button" disabled={disabled||!text.trim()} aria-label={playing?'Stop reading reply':'Listen to Fufu reply'} aria-pressed={playing} onClick={toggle} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-50">{playing?<Square size={15} aria-hidden="true"/>:<Volume2 size={17} aria-hidden="true"/>}{playing?'Stop':'Listen'}</button>{error&&<p role="status" className="mt-1 text-xs text-[var(--color-text-muted)]">{error}</p>}</div>;
}
