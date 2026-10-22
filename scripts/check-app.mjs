import { spawn } from 'node:child_process';
const port = 3137;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.argv.includes('--production')?'start':'dev', '--hostname', '127.0.0.1', '--port', String(port)], {stdio:['ignore','pipe','pipe']});
let logs=''; server.stdout.on('data',x=>logs+=x); server.stderr.on('data',x=>logs+=x);
try {
  let ready=false;
  for(let i=0;i<50;i++){try {const r=await fetch(`http://127.0.0.1:${port}/overview`); if(r.ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,300));}
  if(!ready)throw new Error('App did not start: '+logs.slice(-1800));
  for(const width of [375,800,1280]){const r=await fetch(`http://127.0.0.1:${port}/overview`,{headers:{'Sec-CH-Viewport-Width':String(width)}});if(!r.ok)throw new Error(`HTTP ${r.status}`);console.log(`HTTP smoke ${width}px: ${r.status} (not a rendered viewport check)`);}
  for(const path of ['/planner','/wealth','/cards','/transfers','/transactions','/subscriptions','/parent-summary']){const r=await fetch(`http://127.0.0.1:${port}${path}`);if(!r.ok)throw new Error(path+': '+r.status);console.log(path+': '+r.status);}
  console.log('Visual viewport checks require an available browser.');
}finally{server.kill('SIGTERM');}
