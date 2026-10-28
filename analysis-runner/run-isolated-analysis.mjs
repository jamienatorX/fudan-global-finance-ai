/** Administrative analysis runner. Never exposes a banking mutation or accepts credentials. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {Sandbox} from '@vercel/sandbox';
import {pathToFileURL} from 'node:url';

export async function runIsolatedAnalysis(code, auditPath, createSandbox=options=>Sandbox.create(options)) {
  if(typeof code!=='string'||Buffer.byteLength(code)>8192)throw new Error('INVALID_CODE_SIZE');
  if(!auditPath)throw new Error('AUDIT_PATH_REQUIRED');
  const record={id:randomUUID(),startedAt:new Date().toISOString(),codeSha256:createHash('sha256').update(code).digest('hex'),network:'deny-all',persistent:false,status:'started'};
  await writeFile(auditPath,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
  let sandbox;
  try {
    sandbox=await createSandbox({timeout:30000,persistent:false,networkPolicy:'deny-all',resources:{vcpus:1},ports:[],env:{}});
    await sandbox.writeFiles([
      {path:'/tmp/fu-supervisor.py',content:await readFile(new URL('./isolated-analysis.py',import.meta.url)),mode:0o644},
      {path:'/tmp/fu-generated.py',content:Buffer.from(code),mode:0o644}]);
    const runner=await sandbox.createUser('analysis');
    const command=await runner.runCommand('env',['-i','PATH=/usr/bin:/bin','python3','-I','-S','/tmp/fu-supervisor.py','/tmp/fu-generated.py']);
    if(command.exitCode!==0)throw new Error('ANALYSIS_FAILED');
    const output=await command.stdout();
    if(Buffer.byteLength(output)>20000)throw new Error('INVALID_OUTPUT');
    const parsed=JSON.parse(output);
    if(parsed.codeSha256!==record.codeSha256||!['completed','failed','invalid_output'].includes(parsed.status))throw new Error('INVALID_OUTPUT');
    Object.assign(record,{status:parsed.status,exitCode:parsed.exitCode,timedOut:parsed.timedOut,durationMs:parsed.durationMs});
    return {runId:record.id,status:parsed.status,result:parsed.result,warning:'Untrusted analysis output; never approval or evidence of a banking action.'};
  } catch {record.status='failed';throw new Error('ISOLATED_ANALYSIS_FAILED');}
  finally {
    try {if(sandbox)await sandbox.stop();record.stopped=true;}
    finally {record.finishedAt=new Date().toISOString();await writeFile(auditPath,JSON.stringify(record,null,2),{mode:0o600});}
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const code=await readFile(process.argv[2],'utf8');
  console.log(JSON.stringify(await runIsolatedAnalysis(code,process.argv[3])));
}

