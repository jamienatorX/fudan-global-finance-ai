import {expect,it} from 'vitest';
import {Transcript} from '../../src/features/copilot/stream-transcript';
import {PcmResampler} from '../../src/features/copilot/stream-pcm';
it('replaces partial words and accumulates endpoints without duplicates',()=>{const t=new Transcript();expect(t.update('HELLO')).toBe('HELLO');expect(t.update('HELLO WORLD')).toBe('HELLO WORLD');t.endpoint('HELLO WORLD');expect(t.update('你好')).toBe('HELLO WORLD 你好');expect(t.update('')).toBe('HELLO WORLD');});
it('returns empty text for silence',()=>{expect(new Transcript().update('  ')).toBe('');});
it.each([44100,48000])('resamples %i Hz continuously across irregular chunks',rate=>{const s=new PcmResampler(rate),input=new Float32Array(rate).fill(.25),out:number[]=[];for(let i=0;i<input.length;i+=127)out.push(...s.push(input.subarray(i,i+127)));expect(out.length).toBeGreaterThanOrEqual(15999);expect(out.length).toBeLessThanOrEqual(16000);expect(out.every(x=>Math.abs(x-.25)<.00001)).toBe(true);});
