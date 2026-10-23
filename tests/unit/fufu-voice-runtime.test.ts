import {afterEach,expect,it,vi} from 'vitest';
import {recordVoice,transcribeVoice} from '../../src/features/copilot/voice-runtime';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('releases a transcription worker immediately when cancelled',async()=>{
 const terminate=vi.fn(),postMessage=vi.fn();vi.stubGlobal('Worker',class {terminate=terminate;postMessage=postMessage;});
 const abort=new AbortController(),request=transcribeVoice(new Float32Array([.2]),abort.signal,vi.fn());abort.abort();await expect(request).rejects.toMatchObject({name:'AbortError'});expect(terminate).toHaveBeenCalledOnce();
});
it('times out a stalled download without retaining its worker',async()=>{
 vi.useFakeTimers();const terminate=vi.fn();vi.stubGlobal('Worker',class {terminate=terminate;postMessage=vi.fn();});
 const request=transcribeVoice(new Float32Array([.2]),new AbortController().signal,vi.fn());const assertion=expect(request).rejects.toThrow('took too long');await vi.advanceTimersByTimeAsync(300000);await assertion;expect(terminate).toHaveBeenCalledOnce();
});
it('releases microphone tracks if the browser cannot create a recorder',async()=>{
 const stop=vi.fn();vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn().mockResolvedValue({getTracks:()=>[{stop}]})}});vi.stubGlobal('MediaRecorder',class {constructor(){throw new Error('unsupported codec');}});await expect(recordVoice()).rejects.toThrow('unsupported codec');expect(stop).toHaveBeenCalledOnce();
});
