import {expect,it,vi} from 'vitest';
import {prepareStream} from '../../src/features/copilot/stream-runtime';
vi.mock('../../src/features/copilot/stream-assets',()=>({loadStreamAssets:async()=>({baseUrl:'http://localhost/voice-stream/1.12.20/',model:new ArrayBuffer(3)})}));
class FakeWorker extends EventTarget{
 static latest:FakeWorker;terminated=false;
 constructor(){super();FakeWorker.latest=this;}
 postMessage(m:{type:string;session?:number}){if(m.type==='prepare')queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:{type:'ready'}})));}
 terminate(){this.terminated=true;}
}
it('terminates preparation on cancellation instead of accepting late readiness',async()=>{
 vi.stubGlobal('Worker',FakeWorker);const c=new AbortController(),p=prepareStream(c.signal,()=>{});c.abort();await expect(p).rejects.toThrow();expect(FakeWorker.latest.terminated).toBe(true);vi.unstubAllGlobals();
});
it('reports unavailable audio capture without leaving a prepared engine stuck',async()=>{
 vi.stubGlobal('Worker',FakeWorker);const engine=await prepareStream(new AbortController().signal,()=>{});await expect(engine.start(()=>{})).rejects.toThrow(/microphone|browser/i);engine.dispose();expect(FakeWorker.latest.terminated).toBe(true);vi.unstubAllGlobals();
});
class FakeNode{
 static latest:FakeNode;port={onmessage:null as ((e:MessageEvent)=>void)|null,postMessage:vi.fn()};
 constructor(){FakeNode.latest=this;}connect(){}disconnect(){}
}
class FakeContext{
 sampleRate=16000;audioWorklet={addModule:async()=>{}};close=vi.fn(async()=>{});resume=async()=>{};createMediaStreamSource(){return{connect(){},disconnect(){}};}
}
function captureSetup(){const track={stop:vi.fn(),onended:null};vi.stubGlobal('Worker',FakeWorker);vi.stubGlobal('AudioContext',FakeContext);vi.stubGlobal('AudioWorkletNode',FakeNode);Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[track]})},configurable:true});return track;}
it('stops microphone capture and reports overload instead of dropping audio',async()=>{
 const track=captureSetup(),error=vi.fn(),engine=await prepareStream(new AbortController().signal,()=>{});await engine.start(()=>{},error);for(let i=0;i<6;i++)FakeNode.latest.port.onmessage?.(new MessageEvent('message',{data:{pcm:new Float32Array(16000)}}));expect(error).toHaveBeenCalledWith(expect.objectContaining({message:expect.stringContaining('cannot keep up')}));expect(track.stop).toHaveBeenCalledOnce();engine.dispose();vi.unstubAllGlobals();
});
it('rejects pending Stop when disposed and ignores a stale final result',async()=>{
 const track=captureSetup(),engine=await prepareStream(new AbortController().signal,()=>{}),partial=vi.fn(),recording=await engine.start(partial);const stopped=recording.stop();const rejection=expect(stopped).rejects.toThrow(/cancelled/i);engine.dispose();await rejection;FakeWorker.latest.dispatchEvent(new MessageEvent('message',{data:{type:'final',session:1,text:'late'}}));expect(partial).not.toHaveBeenCalled();expect(track.stop).toHaveBeenCalled();vi.unstubAllGlobals();
});
