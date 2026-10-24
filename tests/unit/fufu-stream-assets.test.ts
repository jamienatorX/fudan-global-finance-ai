import {expect,it,vi} from 'vitest';
import {loadStreamAssets,validateManifest} from '../../src/features/copilot/stream-assets';
const hash='039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81';
const manifest={version:'1.12.20',bytes:3,shards:[{file:'model-0.bin',bytes:3,sha256:hash}]};
it('rejects manifest totals and unsafe shard URLs',()=>{
 expect(()=>validateManifest({...manifest,bytes:4})).toThrow();
 expect(()=>validateManifest({...manifest,shards:[{...manifest.shards[0],file:'../secret'}]})).toThrow();
});
it('reconstructs verified bytes even when cache writes fail',async()=>{
 const fetcher=vi.fn(async(url:RequestInfo|URL)=>new Response(String(url).endsWith('manifest.json')?JSON.stringify(manifest):new Uint8Array([1,2,3])));
 const cache={match:async()=>undefined,put:async()=>{throw new Error('quota');},delete:async()=>true};
 vi.stubGlobal('fetch',fetcher);vi.stubGlobal('caches',{open:async()=>cache});
 try{const result=await loadStreamAssets(new AbortController().signal,()=>{});expect([...new Uint8Array(result.model)]).toEqual([1,2,3]);}finally{vi.unstubAllGlobals();}
});
it('rejects corrupt downloaded bytes',async()=>{
 vi.stubGlobal('fetch',async(url:RequestInfo|URL)=>new Response(String(url).endsWith('manifest.json')?JSON.stringify(manifest):new Uint8Array([3,2,1])));vi.stubGlobal('caches',undefined);
 try{await expect(loadStreamAssets(new AbortController().signal,()=>{})).rejects.toThrow(/integrity/i);}finally{vi.unstubAllGlobals();}
});
