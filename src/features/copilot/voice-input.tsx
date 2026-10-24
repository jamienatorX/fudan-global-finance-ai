'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Square,X} from 'lucide-react';
import {recordVoice,transcribeVoice,type VoiceRecording} from './voice-runtime';
import {prepareStream,type StreamEngine,type StreamRecording} from './stream-runtime';
import {MAX_VOICE_SECONDS} from './voice-limits';
import {stopReplySpeech} from './reply-speech';
type Phase='idle'|'preparing'|'starting'|'recording'|'finalizing';
export function VoiceInput({disabled,onText,onBusyChange}:{disabled:boolean;onText:(text:string)=>void;onBusyChange?:(busy:boolean)=>void}){
 const [phase,setPhase]=useState<Phase>('idle'),[status,setStatus]=useState(''),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0),[partial,setPartial]=useState(''),[fallback,setFallback]=useState(false);
 const recording=useRef<VoiceRecording|StreamRecording|null>(null),engine=useRef<StreamEngine|null>(null),controller=useRef<AbortController|null>(null),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),busy=useRef(false),standard=useRef(false),callbacks=useRef({onText,onBusyChange});
 useEffect(()=>{callbacks.current={onText,onBusyChange};},[onText,onBusyChange]);
 useEffect(()=>{if(phase!=='recording')return;const started=Date.now(),interval=setInterval(()=>setElapsed(Math.min(MAX_VOICE_SECONDS,Math.floor((Date.now()-started)/1000))),1000);return()=>clearInterval(interval);},[phase]);
 function cleanup(dispose=false){if(timer.current)clearTimeout(timer.current);recording.current?.cancel();recording.current=null;controller.current?.abort();controller.current=null;if(dispose){engine.current?.dispose();engine.current=null;}}
 useEffect(()=>{const leave=()=>{generation.current++;cleanup(true);busy.current=false;setPhase('idle');setStatus('');setPartial('');callbacks.current.onBusyChange?.(false);};window.addEventListener('pagehide',leave);return()=>{window.removeEventListener('pagehide',leave);leave();};},[]);
 function cancel(){generation.current++;cleanup(true);busy.current=false;setPhase('idle');setStatus('');setPartial('');callbacks.current.onBusyChange?.(false);}
 function failed(e:unknown,id:number){if(id!==generation.current)return;generation.current++;cleanup(true);busy.current=false;setPhase('idle');setStatus('');setPartial('');setFallback(true);setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser settings, or type your message.':e instanceof Error?e.message:'Voice input failed. Please try again.');callbacks.current.onBusyChange?.(false);}
 async function stop(){
  const session=recording.current;if(!session)return;if(timer.current)clearTimeout(timer.current);const id=generation.current;setPhase('finalizing');setStatus(standard.current?'Transcribing…':'Finishing your words…');
  try{let text:string;if(standard.current){const abort=new AbortController();controller.current=abort;const pcm=await (session as VoiceRecording).stop();if(id!==generation.current)return;text=await transcribeVoice(pcm,abort.signal,value=>{if(id===generation.current)setStatus(value);});}else text=await (session as StreamRecording).stop();
   if(id!==generation.current)return;if(!text.trim())throw new Error('I did not catch that. Please try again.');callbacks.current.onText(text.trim());recording.current=null;setPartial('');setStatus('Added to your message. Review it before sending.');
  }catch(e){failed(e,id);}finally{session.cancel();if(id===generation.current){recording.current=null;busy.current=false;setPhase('idle');controller.current=null;callbacks.current.onBusyChange?.(false);}}
 }
 async function start(useStandard=false){
  if(disabled||busy.current)return;stopReplySpeech();busy.current=true;standard.current=useStandard;const id=++generation.current;setElapsed(0);setError('');setPartial('');callbacks.current.onBusyChange?.(true);
  try{
   if(!useStandard&&!engine.current){setPhase('preparing');setStatus('Preparing live voice… First use downloads about 211 MB; keep this tab open.');const abort=new AbortController();controller.current=abort;const ready=await prepareStream(abort.signal,percent=>{if(id===generation.current)setStatus(`Preparing live voice… ${percent}%`);});if(id!==generation.current){ready.dispose();return;}engine.current=ready;controller.current=null;}
   setPhase('starting');setStatus('Allow microphone access. Speak once Listening appears.');
   const session=useStandard?await recordVoice():await engine.current!.start(text=>{if(id===generation.current)setPartial(text);},e=>failed(e,id));
   if(id!==generation.current){session.cancel();return;}recording.current=session;setPhase('recording');setStatus(useStandard?'Listening… Standard dictation adds text after Stop. Up to 2 minutes.':'Listening… Speak now. Words appear as you talk. Up to 2 minutes.');timer.current=setTimeout(()=>void stop(),MAX_VOICE_SECONDS*1000);
  }catch(e){failed(e,id);}
 }
 const active=phase!=='idle';
 return <div className="fufu-voice-control"><div className="flex flex-wrap items-center gap-2"><button type="button" aria-label={phase==='recording'?'Stop recording':'Dictate message'} title="Chinese and English live dictation, processed on this device. Review names and amounts before sending." aria-pressed={phase==='recording'} disabled={disabled||(active&&phase!=='recording')} onClick={()=>void (phase==='recording'?stop():start())} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50">{phase==='recording'?<Square size={16} aria-hidden="true"/>:<Mic size={18} aria-hidden="true"/>}{phase==='recording'?'Stop recording':phase==='preparing'?'Preparing voice…':phase==='finalizing'?'Finishing…':'Speak to Fufu'}</button>{active&&<button type="button" aria-label="Cancel voice input" onClick={cancel} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm"><X size={16} aria-hidden="true"/>Cancel</button>}{phase==='recording'&&<span role="timer" aria-label="Recording time" className="text-sm tabular-nums text-[var(--color-text-muted)]">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')} / 2:00</span>}{fallback&&!active&&<button type="button" disabled={disabled} onClick={()=>void start(true)} className="min-h-11 rounded-xl border border-[var(--color-border)] px-3 text-sm">Use standard dictation</button>}</div>{status&&<p role="status" className="mt-2 text-sm">{status}</p>}{partial&&<div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"><p className="text-xs text-[var(--color-text-muted)]">Provisional · review after Stop</p><p className="mt-1 whitespace-pre-wrap break-words" aria-live="polite">{partial}</p></div>}{error&&<p role="alert" className="mt-2 text-sm text-[var(--color-text)]">{error}</p>}</div>;
}
