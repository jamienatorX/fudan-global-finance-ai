import {MAX_VOICE_SECONDS,VOICE_SAMPLE_RATE} from './voice-limits';
export type VoiceRecording={stop:()=>Promise<Float32Array>;cancel:()=>void};

// Capture stays in memory. Only the reviewed text enters the banking conversation.
export async function recordVoice():Promise<VoiceRecording>{
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Voice input is unavailable in this browser. You can still type your message.');
 const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
 let recorder:MediaRecorder;
 try{recorder=new MediaRecorder(stream);}catch(e){stream.getTracks().forEach(t=>t.stop());throw e;}
 const chunks:Blob[]=[];let cancelled=false,stopped=false;
 const release=()=>stream.getTracks().forEach(t=>t.stop());
 recorder.ondataavailable=e=>{if(!cancelled&&e.data.size)chunks.push(e.data);};
 const done=new Promise<Blob>((resolve,reject)=>{recorder.onstop=()=>{release();resolve(new Blob(chunks,{type:recorder.mimeType}));chunks.length=0;};recorder.onerror=()=>{release();reject(new Error('Recording failed. Please try again.'));};});
 // A cancelled recording must not create an unhandled rejection.
 void done.catch(()=>{});
 try{recorder.start();}catch(e){release();throw e;}
 return {cancel(){cancelled=true;chunks.length=0;if(recorder.state!=='inactive')recorder.stop();release();},async stop(){
  if(stopped||cancelled)throw new Error('Recording ended. Please try again.');stopped=true;if(recorder.state!=='inactive')recorder.stop();release();
  const blob=await done;if(cancelled)throw new Error('Recording cancelled.');
  const context=new AudioContext();
  try{
   const decoded=await context.decodeAudioData(await blob.arrayBuffer());
   const duration=Math.min(decoded.duration,MAX_VOICE_SECONDS);if(duration<.3)throw new Error('I did not hear enough speech. Please try again.');
   const offline=new OfflineAudioContext(1,Math.ceil(duration*VOICE_SAMPLE_RATE),VOICE_SAMPLE_RATE),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
   const pcm=(await offline.startRendering()).getChannelData(0);
   let energy=0;for(const n of pcm)energy+=n*n;if(Math.sqrt(energy/pcm.length)<.002)throw new Error('I could not hear speech. Please try again closer to the microphone.');
   return pcm;
  }finally{await context.close();}
 }};
}

export function transcribeVoice(audio:Float32Array,signal:AbortSignal,onProgress:(text:string)=>void):Promise<string>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./voice-worker.ts',import.meta.url),{type:'module'});
  const timeout=setTimeout(()=>finish(new Error('Voice input took too long. Please try again or type your message.')),300000);
  const finish=(error?:Error,text?:string)=>{clearTimeout(timeout);signal.removeEventListener('abort',abort);worker.terminate();if(error)reject(error);else resolve(text??'');};
  const abort=()=>finish(new DOMException('Cancelled','AbortError'));
  if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{if(data.type==='progress')onProgress(data.text);else if(data.type==='result')finish(undefined,data.text);else if(data.type==='error')finish(new Error('Speech recognition could not load or process the recording. Check your connection and try again.'));};
  worker.onerror=()=>finish(new Error('Speech recognition is unavailable on this device. You can still type your message.'));
  worker.postMessage({audio},[audio.buffer]);
 });
}
