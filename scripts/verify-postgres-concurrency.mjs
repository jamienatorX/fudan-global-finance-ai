/** Disposable real PostgreSQL acceptance. Never connects to a hosted/customer database. */
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
const tools=createRequire(process.env.FU_BANK_TEST_TOOLS?resolve(process.env.FU_BANK_TEST_TOOLS,'package.json'):import.meta.url);
const {Client}=tools('pg');
const {default:EmbeddedPostgres}=await import(tools.resolve('embedded-postgres'));
assert(process.getuid?.()!==0,'Run this disposable PostgreSQL test as a non-root OS user.');
const root=await mkdtemp(join(tmpdir(),'fu-bank-postgres-'));
const port=Number(process.env.FU_BANK_TEST_PG_PORT??15679);
const password=crypto.randomUUID();
const server=new EmbeddedPostgres({databaseDir:join(root,'data'),user:'postgres',password,port,persistent:false,onLog:()=>{},onError:()=>{}});
const connections=[];const results=[];
const rpc=async(c,name,args=[])=>{const r=await c.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args);return r.rows[0].value;};
const check=(name,details)=>{results.push({name,status:'passed',details});};
let admin;
async function connection(owner){const c=new Client({host:'127.0.0.1',port,user:'postgres',password,database:'postgres'});await c.connect();connections.push(c);if(owner)await claims(c,owner);return c;}
async function claims(c,owner){await c.query('reset role');await c.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[owner,JSON.stringify({sub:owner,session_id:owner,aal:'aal2',amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]})]);await c.query('set role authenticated');}
async function owner(n,balance){const id=`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;await admin.query('insert into auth.users(id) values($1);',[id]);await admin.query('insert into auth.sessions(id,user_id) values($1,$1)',[id]);const c=await connection(id);await rpc(c,'sim_initialize');await rpc(c,'bank_scenario_initialize');const accounts=(await c.query("select id,label,balance_minor from public.sim_accounts where currency='CNY' order by label")).rows;if(balance)await admin.query('update public.sim_accounts set balance_minor=$1 where id=$2',[balance,accounts[0].id]);return{id,c,a:accounts[0],b:accounts[1]};}
const prepare=(u,amount,extra={})=>rpc(u.c,'sim_prepare',[{type:'transfer',sourceId:u.a.id,destinationId:u.b.id,amountMinor:String(amount),...extra}]);
const execute=(c,a)=>rpc(c,'sim_execute',[a.id,true]);
async function ledger(id){return (await admin.query('select action_id,direction,amount_minor::text from public.sim_ledger where user_id=$1',[id])).rows;}
try{
 await server.initialise();await server.start();admin=await connection();
 const fixture=await readFile('tests/integration/database.ts','utf8');const bootstrap=fixture.match(/await db\.exec\(`(create role anon;[\s\S]*?)`\);/);assert(bootstrap,'Auth fixture bootstrap was not found');await admin.query(bootstrap[1]);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await admin.query(await readFile('supabase/migrations/'+file,'utf8'));
 const version=(await admin.query('select version()')).rows[0].version;
 const u=await owner(101);const second=await connection(u.id);const p1=await prepare(u,60000),p2=await prepare(u,60000);
 const race=await Promise.all([execute(u.c,p1),execute(second,p2)]);
 assert.equal(race.filter(r=>r.status==='executed').length,1);assert(race.some(r=>r.code==='ACTION_VERIFICATION_REQUIRED'));assert.equal((await ledger(u.id)).length,2);
 check('Concurrent transfers enforce the cumulative daily threshold',{connections:2,executed:1,blocked:1});
 const replay=await prepare(u,100);const duplicate=await Promise.all([execute(u.c,replay),execute(second,replay)]);assert.deepEqual(duplicate[0],duplicate[1]);assert.equal((await ledger(u.id)).filter(r=>r.action_id===replay.id).length,2);
 check('Concurrent duplicate confirmations produce one two-sided ledger effect',{connections:2,ledgerEntries:2});
 const v=await owner(102,150000);const v2=await connection(v.id);let r=await rpc(v.c,'sim_prepare',[{type:'transfer',mode:'birthday',sourceId:v.a.id,amountMinor:'100000',flowerMinor:'30000',cakeMinor:'70000',birthday:new Date(Date.now()+10*86400000).toISOString().slice(0,10),label:'Race fixture'}]);assert.equal((await execute(v.c,r)).status,'executed');
 const s1=await prepare(v,40000),s2=await prepare(v,40000);const spending=await Promise.all([execute(v.c,s1),execute(v2,s2)]);assert.equal(spending.filter(x=>x.status==='executed').length,1);
 assert.equal((await admin.query('select balance_minor::text from public.sim_accounts where id=$1',[v.a.id])).rows[0].balance_minor,'110000');assert.equal((await admin.query('select sum(remaining_minor)::text as n from public.bank_reservations where user_id=$1',[v.id])).rows[0].n,'100000');
 check('Concurrent spending cannot consume birthday reservations',{connections:2,balanceMinor:'110000',reservedMinor:'100000'});
 const w=await owner(103);let schedule=await prepare(w,60000,{mode:'schedule',scheduledAt:new Date(Date.now()+3600000).toISOString()});assert.equal((await execute(w.c,schedule)).status,'executed');await admin.query("update public.bank_scheduled_jobs set due_at=clock_timestamp()-interval '1 second' where user_id=$1",[w.id]);const immediate=await prepare(w,60000);const worker=await connection();
 await Promise.all([worker.query('select private.bank_jobs_tick()'),execute(w.c,immediate)]);const debits=(await ledger(w.id)).filter(r=>r.direction==='debit');assert.equal(debits.length,1);assert.equal(debits[0].amount_minor,'60000');
 check('Background worker and interactive transfer share the same daily allowance',{connections:2,debitedMinor:'60000'});
 const x=await owner(104);schedule=await prepare(x,50000,{mode:'schedule',scheduledAt:new Date(Date.now()+3600000).toISOString()});assert.equal((await execute(x.c,schedule)).status,'executed');await admin.query("update public.bank_scheduled_jobs set due_at=clock_timestamp()-interval '1 second' where user_id=$1",[x.id]);const worker2=await connection();
 await Promise.all([worker.query('select private.bank_jobs_tick()'),worker2.query('select private.bank_jobs_tick()')]);assert.equal((await ledger(x.id)).length,2);assert.equal((await admin.query('select status from public.bank_scheduled_jobs where user_id=$1',[x.id])).rows[0].status,'completed');
 check('Concurrent workers execute an approved mandate once',{connections:2,ledgerEntries:2});
 const y=await owner(105);r=await rpc(y.c,'sim_prepare',[{type:'transfer',mode:'birthday',sourceId:y.a.id,amountMinor:'100000',flowerMinor:'30000',cakeMinor:'70000',birthday:new Date(Date.now()+10*86400000).toISOString().slice(0,10),label:'Cancel race'}]);assert.equal((await execute(y.c,r)).status,'executed');const job=(await admin.query("select id from public.bank_scheduled_jobs where user_id=$1 and label='Fictional flowers'",[y.id])).rows[0];await admin.query("update public.bank_scheduled_jobs set due_at=clock_timestamp()-interval '1 second' where id=$1",[job.id]);
 await Promise.all([worker.query('select private.bank_jobs_tick()'),rpc(y.c,'bank_job_command',[job.id,'cancel'])]);const remaining=(await admin.query('select sum(remaining_minor)::text as n from public.bank_reservations where user_id=$1',[y.id])).rows[0].n;assert.equal(remaining,'70000');const yDebits=(await ledger(y.id)).filter(t=>t.direction==='debit');assert(yDebits.length<=1);if(yDebits.length)assert.equal(yDebits[0].amount_minor,'30000');
 check('Cancellation racing fulfilment releases or consumes an allocation exactly once',{connections:2,remainingMinor:remaining});
 await assert.rejects(x.c.query('select private.bank_jobs_tick()'),/permission denied/);check('Authenticated clients cannot invoke the trusted worker',{denied:true});
 const customer=await owner(106),operator=await owner(107);await admin.query('insert into private.bank_operators(user_id) values($1)',[operator.id]);
 const plan={id:crypto.randomUUID(),version:0,actions:[{payload:{type:'budget',category:'food',limitMinor:'90000'}}]};await rpc(customer.c,'bank_agent_store_plan',[plan]);const flow=await rpc(customer.c,'bank_workflow_create',[plan.id,null]);let ticket=await rpc(customer.c,'bank_support_create',[flow.id,{workflow:true},'Please review the fictional workflow']);
 assert.equal(ticket.status,'queued');assert.equal((await rpc(customer.c,'bank_workflow_get',[flow.id])).handoff,true);
 ticket=await rpc(operator.c,'bank_operator_command',[ticket.id,ticket.revision,'claim','']);assert.equal(ticket.status,'assigned');
 ticket=await rpc(operator.c,'bank_operator_command',[ticket.id,ticket.revision,'reply','Reviewed the fictional request; please check and approve your own next step.']);
 assert(JSON.stringify(await rpc(customer.c,'bank_support_get',[ticket.id])).includes('Reviewed the fictional request'));
 await assert.rejects(rpc(x.c,'bank_operator_command',[ticket.id,ticket.revision,'release','']),/OPERATOR_REQUIRED/);
 ticket=await rpc(operator.c,'bank_operator_command',[ticket.id,ticket.revision,'release','']);assert.equal(ticket.status,'released');assert.equal((await rpc(customer.c,'bank_workflow_get',[flow.id])).handoff,false);
 check('Independent customer/operator sessions complete consented takeover and release',{connections:2,operatorMembership:'explicit fixture provisioning',ticketStatus:'released'});
 const report={status:'passed',postgres:version,tests:results.length,results,authEvidence:'Controlled SQL claims only; this does not prove real Supabase Auth or a physical authenticator.',productionChanged:false};
 const path=process.env.FU_BANK_CONCURRENCY_REPORT??'/tmp/fu-bank-postgres-concurrency.json';await writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await Promise.allSettled(connections.map(c=>c.end()));await server.stop().catch(()=>{});await rm(root,{recursive:true,force:true});}
