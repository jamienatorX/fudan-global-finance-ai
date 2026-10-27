import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const version='1.12.20',name=`sherpa-onnx-wasm-simd-v${version}-zh-en-asr-zipformer`,sha='e889207cd6a84973cbc028c05115cdd778ae8e277867b83169644be5b3a63c53';
const cache=path.resolve('.cache/fufu-stream'),out=path.resolve(`public/voice-stream/${version}`),archive=process.env.FUFU_VOICE_ARCHIVE||path.join(cache,'release.tar.bz2');
const hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(cache,{recursive:true});await mkdir(out,{recursive:true});
try{const m=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8'));let valid=m.version===version&&m.assets.some(s=>s.file==='THIRD-PARTY-NOTICES.txt');for(const s of [...m.shards,...m.assets])valid=valid&&hash(await readFile(path.join(out,s.file)))===s.sha256;if(valid){console.log('Verified streaming voice assets already prepared.');process.exit(0);}}catch{/* Generate verified files. */}
let data;try{data=await readFile(archive);}catch{const r=await fetch(`https://github.com/k2-fsa/sherpa-onnx/releases/download/v${version}/${name}.tar.bz2`,{signal:AbortSignal.timeout(240000)});if(!r.ok)throw new Error(`Voice archive download: ${r.status}`);data=Buffer.from(await r.arrayBuffer());await writeFile(archive,data);}
if(hash(data)!==sha)throw new Error('Voice archive SHA-256 mismatch');
const entries=execFileSync('tar',['-tf',archive],{encoding:'utf8'}).trim().split(/\r?\n/);for(const entry of entries){const e=entry.replace(/^\.\//,'');if(!e.startsWith(name+'/' )||e.split(/[\\/]/).includes('..')||e.includes('\\'))throw new Error('Unsafe archive entry');}
// Only regular expected release files are extracted; no archive links are followed.
const files=['sherpa-onnx-asr.js','sherpa-onnx-wasm-main-asr.js','sherpa-onnx-wasm-main-asr.wasm','sherpa-onnx-wasm-main-asr.data'];
execFileSync('tar',['--no-same-owner','-xf',archive,'-C',cache,...files.map(f=>'./'+name+'/'+f)]);
const source=path.join(cache,name),model=await readFile(path.join(source,files[3])),shards=[],assets=[];
for(let offset=0,i=0;offset<model.length;offset+=24*1024*1024,i++){const b=model.subarray(offset,offset+24*1024*1024),file=`model-${i}.bin`;await writeFile(path.join(out,file),b);shards.push({file,bytes:b.length,sha256:hash(b)});}
for(const file of files.slice(0,3)){await copyFile(path.join(source,file),path.join(out,file));const b=await readFile(path.join(out,file));assets.push({file,bytes:b.length,sha256:hash(b)});}
for(const [src,file] of [['voice-NOTICES.txt','NOTICES.txt'],['voice-LICENSE.txt','LICENSE.txt'],['voice-THIRD-PARTY-NOTICES.txt','THIRD-PARTY-NOTICES.txt']]){await copyFile('scripts/'+src,path.join(out,file));const b=await readFile(path.join(out,file));assets.push({file,bytes:b.length,sha256:hash(b)});}
await writeFile(path.join(out,'manifest.json'),JSON.stringify({version,bytes:model.length,shards,assets},null,2)+'\n');
console.log(`Prepared ${model.length} model bytes in ${shards.length} shards; ${await readdir(out).then(x=>x.length)} static files.`);
