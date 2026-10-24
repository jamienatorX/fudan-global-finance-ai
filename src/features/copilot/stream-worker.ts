/// <reference lib="webworker" />
import {Transcript} from './stream-transcript';
import type {StreamRequest,StreamResponse} from './stream-protocol';
type Stream={acceptWaveform:(rate:number,pcm:Float32Array)=>void;inputFinished:()=>void;free:()=>void};
type Recognizer={createStream:()=>Stream;isReady:(s:Stream)=>boolean;decode:(s:Stream)=>void;getResult:(s:Stream)=>{text:string};isEndpoint:(s:Stream)=>boolean;reset:(s:Stream)=>void;free:()=>void};
const scope=self as unknown as DedicatedWorkerGlobalScope & {Module:Record<string,unknown>;createOnlineRecognizer:(m:unknown)=>Recognizer};
let recognizer:Recognizer|null=null,stream:Stream|null=null,session=0,transcript=new Transcript();
function send(m:StreamResponse){scope.postMessage(m);}
function clear(){stream?.free();stream=null;}
function decode(){if(!recognizer||!stream)return '';while(recognizer.isReady(stream))recognizer.decode(stream);return recognizer.getResult(stream).text;}
scope.onmessage=(event:MessageEvent<StreamRequest>)=>{
 const m=event.data;
 try{
  if(m.type==='prepare'){
   scope.Module={locateFile:(file:string)=>m.baseUrl+file,getPreloadedPackage:()=>m.model,onRuntimeInitialized:()=>{try{recognizer=scope.createOnlineRecognizer(scope.Module);send({type:'ready'});}catch(e){send({type:'error',message:String(e)});}},onAbort:()=>send({type:'error',message:'Live voice engine could not start on this device.'})};
   scope.importScripts(m.baseUrl+'sherpa-onnx-asr.js',m.baseUrl+'sherpa-onnx-wasm-main-asr.js');return;
  }
  if(m.type==='start'){if(!recognizer)throw new Error('Voice engine not ready.');clear();session=m.session;transcript=new Transcript();stream=recognizer.createStream();return;}
  if(m.session!==session||!stream||!recognizer)return;
  if(m.type==='cancel'){clear();return;}
  if(m.type==='audio'){
   stream.acceptWaveform(16000,m.pcm);const text=decode();send({type:'partial',session,text:transcript.update(text)});
   if(recognizer.isEndpoint(stream)){transcript.endpoint(text);recognizer.reset(stream);}
   send({type:'ack',session,samples:m.pcm.length});return;
  }
  stream.acceptWaveform(16000,new Float32Array(8000));stream.inputFinished();const text=transcript.update(decode());clear();send({type:'final',session,text});
 }catch(e){clear();send({type:'error',session:m.type==='prepare'?undefined:m.session,message:e instanceof Error?e.message:String(e)});}
};
