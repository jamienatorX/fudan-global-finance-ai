const BASE='/voice-stream/1.12.20/';
type Shard={file:string;bytes:number;sha256:string};
type Manifest={version:string;bytes:number;shards:Shard[]};
export function validateManifest(value:unknown):Manifest{
 const m=value as Manifest;
 if(!m||m.version!=='1.12.20'||!Number.isSafeInteger(m.bytes)||m.bytes<=0||m.bytes>250_000_000||!Array.isArray(m.shards)||m.shards.length<1||m.shards.length>16)throw new Error('Invalid voice model manifest.');
 let total=0;const names=new Set<string>();
 for(const s of m.shards){if(!s||!/^model-\d+\.bin$/.test(s.file)||names.has(s.file)||!Number.isSafeInteger(s.bytes)||s.bytes<=0||s.bytes>=32_000_000||!/^[a-f0-9]{64}$/.test(s.sha256))throw new Error('Invalid voice model shard.');names.add(s.file);total+=s.bytes;}
 if(total!==m.bytes)throw new Error('Invalid voice model size.');return m;
}
async function verified(bytes:ArrayBuffer,shard:Shard){
 if(bytes.byteLength!==shard.bytes)return false;
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')===shard.sha256;
}
export async function loadStreamAssets(signal:AbortSignal,onProgress:(percent:number)=>void):Promise<{baseUrl:string;model:ArrayBuffer}>{
 const response=await fetch(BASE+'manifest.json',{signal});if(!response.ok)throw new Error('Live voice files are unavailable. Please retry or use standard dictation.');
 const m=validateManifest(await response.json());
 let cache:Cache|undefined;try{cache=await globalThis.caches?.open('fufu-voice-'+m.version);}catch{/* Storage is optional. */}
 const model=new Uint8Array(m.bytes);let offset=0,done=0;
 // Sequential shards bound peak memory and keep progress deterministic on small devices.
 for(const shard of m.shards){
  signal.throwIfAborted();const url=BASE+shard.file;let bytes:ArrayBuffer|undefined;
  try{const saved=await cache?.match(url);if(saved){const b=await saved.arrayBuffer();if(await verified(b,shard))bytes=b;else await cache?.delete(url);}}catch{/* Retry without cache. */}
  if(!bytes){const r=await fetch(url,{signal});if(!r.ok)throw new Error('Live voice download failed. Please retry.');bytes=await r.arrayBuffer();if(!await verified(bytes,shard))throw new Error('Voice model integrity check failed. Please retry.');try{await cache?.put(url,new Response(bytes));}catch{/* Quota refusal must not break dictation. */}}
  signal.throwIfAborted();model.set(new Uint8Array(bytes),offset);offset+=bytes.byteLength;done+=bytes.byteLength;onProgress(Math.round(done/m.bytes*90));
 }
 return {baseUrl:new URL(BASE,location.origin).href,model:model.buffer};
}
