import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {runIsolatedAnalysis} from './run-isolated-analysis.mjs';
for(const failure of [false,true])test(`isolation options, audit and cleanup, failure=${failure}`,async()=>{
 const directory=await mkdtemp(join(tmpdir(),'fu-runner-test-'));let stopped=false;
 const code='print(2)',hash=createHash('sha256').update(code).digest('hex');
 const factory=async options=>{
  assert.deepEqual(options,{timeout:30000,persistent:false,networkPolicy:'deny-all',resources:{vcpus:1},ports:[],env:{}});
  return {writeFiles:async files=>assert.equal(files.length,2),createUser:async name=>{
   assert.equal(name,'analysis');return {runCommand:async(command,args)=>{
    assert.equal(command,'env');assert.equal(args[0],'-i');if(failure)throw Error('provider secret must not escape');
    return {exitCode:0,stdout:async()=>JSON.stringify({status:'completed',result:2,codeSha256:hash})};
   }};
  },stop:async()=>{stopped=true;}};
 };
 try {
  const audit=join(directory,'audit.json');
  if(failure)await assert.rejects(runIsolatedAnalysis(code,audit,factory),/ISOLATED_ANALYSIS_FAILED/);
  else assert.equal((await runIsolatedAnalysis(code,audit,factory)).result,2);
  assert.equal(stopped,true);const record=JSON.parse(await readFile(audit));assert.equal(record.stopped,true);assert.equal(record.codeSha256,hash);assert.equal(record.status,failure?'failed':'completed');
  assert.equal(JSON.stringify(record).includes('provider secret'),false);
 } finally {await rm(directory,{recursive:true,force:true});}
});

