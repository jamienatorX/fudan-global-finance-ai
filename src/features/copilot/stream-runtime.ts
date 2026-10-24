import {loadStreamAssets} from './stream-assets';
import {PcmResampler} from './stream-pcm';
import type {StreamRequest,StreamResponse} from './stream-protocol';
export type StreamRecording={stop:()=>Promise<string>;cancel:()=>void};
export type StreamEngine={start:(onPartial:(text:string)=>void,onError?:(error:Error)=>void)=>Promise<StreamRecording>;dispose:()=>void};
export async function prepareStream(signal:AbortSignal,onProgress:(percent:number)=>void):Promise<StreamEngine>{
 const worker=new Worker(new URL('./stream-worker.ts',import.meta.url));let disposed=false,nextSession=0,activeCleanup:(()=>void)|null=null;
 function dispose(){if(disposed)return;disposed=true;activeCleanup?.();worker.terminate();}
 function post(m:StreamRequest,transfer:Transferable[]=[]){if(disposed)throw new Error('Live voice session was closed.');worker.postMessage(m,transfer);}
 try{
  await new Promise<void>((resolve,reject)=>{
   const timeout=setTimeout(()=>fail(new Error('Live voice preparation timed out. Please retry or use standard dictation.')),300000);
   function clean(){clearTimeout(timeout);signal.removeEventListener('abort',abort);worker.removeEventListener('message',message);worker.removeEventListener('error',error);}
   function fail(e:unknown){clean();dispose();reject(e);}
   function abort(){fail(new DOMException('Voice preparation cancelled.','AbortError'));}
   function error(){fail(new Error('Live voice is unavailable in this browser. Try standard dictation.'));}
   function message(e:MessageEvent<StreamResponse>){if(e.data.type==='ready'){clean();onProgress(100);resolve();}else if(e.data.type==='error')fail(new Error(e.data.message));}
   worker.addEventListener('message',message);worker.addEventListener('error',error);signal.addEventListener('abort',abort,{once:true});
   if(signal.aborted){abort();return;}
   void loadStreamAssets(signal,onProgress).then(assets=>{signal.throwIfAborted();post({type:'prepare',...assets},[assets.model]);}).catch(fail);
  });
 }catch(e){dispose();throw e;}
 return {dispose,async start(onPartial,onError){
  if(disposed)throw new Error('Live voice session was closed.');if(activeCleanup)throw new Error('A microphone session is already active.');
  if(!navigator.mediaDevices?.getUserMedia||typeof AudioContext==='undefined'||typeof AudioWorkletNode==='undefined')throw new Error('Live microphone capture is unavailable in this browser.');
  const id=++nextSession;let media:MediaStream|null=null,context:AudioContext|null=null,node:AudioWorkletNode|null=null,source:MediaStreamAudioSourceNode|null=null,closed=false,stopping=false,pending=0;
  let finishResolve:((text:string)=>void)|null=null,finishReject:((e:Error)=>void)|null=null,finishTimer:ReturnType<typeof setTimeout>|null=null,flushResolve:(()=>void)|null=null;
  function cleanup(){if(closed)return;closed=true;source?.disconnect();node?.disconnect();if(node)node.port.onmessage=null;media?.getTracks().forEach(t=>{t.onended=null;t.stop();});void context?.close().catch(()=>{});worker.removeEventListener('message',message);worker.removeEventListener('error',workerError);if(finishTimer)clearTimeout(finishTimer);activeCleanup=null;}
  function fail(error:Error){if(closed)return;finishReject?.(error);cleanup();if(!disposed)post({type:'cancel',session:id});onError?.(error);}
  function workerError(){fail(new Error('Live recognition stopped. Please retry or use standard dictation.'));}
  function message(e:MessageEvent<StreamResponse>){const m=e.data;if(!('session'in m)||m.session!==id||closed)return;if(m.type==='ack')pending=Math.max(0,pending-m.samples);if(m.type==='partial')onPartial(m.text);if(m.type==='error')fail(new Error(m.message));if(m.type==='final'){finishResolve?.(m.text);cleanup();}}
  activeCleanup=()=>{finishReject?.(new DOMException('Voice input cancelled.','AbortError'));cleanup();};
  try{
   media=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});if(disposed||closed){media.getTracks().forEach(t=>t.stop());throw new DOMException('Voice input cancelled.','AbortError');}
   context=new AudioContext();await context.audioWorklet.addModule('/voice-pcm-worklet.js');if(disposed||closed)throw new DOMException('Voice input cancelled.','AbortError');
   const resampler=new PcmResampler(context.sampleRate);node=new AudioWorkletNode(context,'fufu-pcm');
   worker.addEventListener('message',message);worker.addEventListener('error',workerError);post({type:'start',session:id});
   node.port.onmessage=(e:MessageEvent<{pcm?:Float32Array;flushed?:boolean}>)=>{
    if(closed)return;if(e.data.flushed){flushResolve?.();return;}if(!e.data.pcm)return;const pcm=resampler.push(e.data.pcm);pending+=pcm.length;
    if(pending>80000){fail(new Error('This device cannot keep up with live voice. Please use standard dictation.'));return;}post({type:'audio',session:id,pcm},[pcm.buffer]);
   };
   media.getTracks().forEach(t=>{t.onended=()=>fail(new Error('The microphone disconnected. Please try again.'));});
   source=context.createMediaStreamSource(media);source.connect(node);node.connect(context.destination);await context.resume();if(closed||disposed)throw new DOMException('Voice input cancelled.','AbortError');
   return {cancel(){if(closed)return;finishReject?.(new DOMException('Voice input cancelled.','AbortError'));cleanup();if(!disposed)post({type:'cancel',session:id});},stop(){
    if(closed||stopping)return Promise.reject(new Error('Voice recording has ended.'));stopping=true;
    return new Promise<string>((resolve,reject)=>{finishResolve=resolve;finishReject=reject;finishTimer=setTimeout(()=>fail(new Error('Voice finalization timed out. Please retry.')),30000);
     source?.disconnect();media?.getTracks().forEach(t=>{t.onended=null;t.stop();});
     flushResolve=()=>{if(!closed)post({type:'finish',session:id});};node?.port.postMessage('flush');
    });
   }};
  }catch(e){cleanup();throw e;}
 }};
}
