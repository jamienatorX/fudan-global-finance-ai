'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Square,X} from 'lucide-react';
import {recordVoice,transcribeVoice,type VoiceRecording} from './voice-runtime';
import {MAX_VOICE_SECONDS} from './voice-limits';
import {stopReplySpeech} from './reply-speech';
export function VoiceInput({disabled,onText,onBusyChange}:{disabled:boolean;onText:(text:string)=>void;onBusyChange?:(busy:boolean)=>void}){
 const [phase,setPhase]=useState<'idle'|'starting'|'recording'|'transcribing'>('idle'),[status,setStatus]=useState(''),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0);
 const recording=useRef<VoiceRecording|null>(null),controller=useRef<AbortController|null>(null),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),busy=useRef(false),callbacks=useRef({onText,onBusyChange});
 useEffect(()=>{callbacks.current={onText,onBusyChange};},[onText,onBusyChange]);
 useEffect(()=>{if(phase!=='recording')return;const started=Date.now();const interval=setInterval(()=>setElapsed(Math.min(MAX_VOICE_SECONDS,Math.floor((Date.now()-started)/1000))),1000);return()=>clearInterval(interval);},[phase]);
 function cleanup(){if(timer.current)clearTimeout(timer.current);recording.current?.cancel();recording.current=null;controller.current?.abort();controller.current=null;}
 useEffect(()=>()=>{generation.current++;cleanup();},[]);
 function cancel(){generation.current++;cleanup();busy.current=false;setPhase('idle');setStatus('');callbacks.current.onBusyChange?.(false);}
 async function stop(){
  const session=recording.current;if(!session)return;recording.current=null;if(timer.current)clearTimeout(timer.current);
  const id=generation.current,abort=new AbortController();controller.current=abort;setPhase('transcribing');setStatus('Transcribing…');
  try{const pcm=await session.stop();if(id!==generation.current)return;const text=await transcribeVoice(pcm,abort.signal,text=>{if(id===generation.current)setStatus(text);});if(id!==generation.current)return;if(!text.trim())throw new Error('I did not catch that. Please try again.');callbacks.current.onText(text.trim());setStatus('Added to your message. Review it before sending.');}
  catch(e){if(id===generation.current)setError(e instanceof Error?e.message:'Voice input failed. Please try again.');}
  finally{session.cancel();if(id===generation.current){busy.current=false;setPhase('idle');controller.current=null;callbacks.current.onBusyChange?.(false);}}
 }
 async function start(){
  if(disabled||busy.current)return;stopReplySpeech();busy.current=true;const id=++generation.current;setElapsed(0);setError('');setStatus('Allow microphone access to speak.');setPhase('starting');callbacks.current.onBusyChange?.(true);
  try{const session=await recordVoice();if(id!==generation.current){session.cancel();return;}recording.current=session;setPhase('recording');setStatus('Listening… Speak naturally, then press stop. Up to 2 minutes.');timer.current=setTimeout(()=>void stop(),MAX_VOICE_SECONDS*1000);}
  catch(e){if(id!==generation.current)return;busy.current=false;setPhase('idle');setStatus('');setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser settings, or type your message.':e instanceof Error?e.message:'Microphone unavailable. You can still type your message.');callbacks.current.onBusyChange?.(false);}
 }
 const active=phase!=='idle';
 return <div className="mt-3"><div className="flex flex-wrap items-center gap-2"><button type="button" aria-label={phase==='recording'?'Stop recording':'Dictate message'} aria-pressed={phase==='recording'} disabled={disabled||phase==='starting'||phase==='transcribing'} onClick={()=>void (phase==='recording'?stop():start())} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50">{phase==='recording'?<Square size={16} aria-hidden="true"/>:<Mic size={18} aria-hidden="true"/>}{phase==='recording'?'Stop recording':phase==='transcribing'?'Transcribing…':'Speak to Fufu'}</button>{active&&<button type="button" aria-label="Cancel voice input" onClick={cancel} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm"><X size={16} aria-hidden="true"/>Cancel</button>}{phase==='recording'&&<span role="timer" aria-label="Recording time" className="text-sm tabular-nums text-[var(--color-text-muted)]">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')} / 2:00</span>}</div><p className="mt-2 text-xs text-[var(--color-text-muted)]">Voice is processed on your device. Language is detected automatically. Review names and amounts before sending.</p>{status&&<p role="status" className="mt-2 text-sm">{status}</p>}{error&&<p role="alert" className="mt-2 text-sm text-[var(--color-text)]">{error}</p>}</div>;
}
