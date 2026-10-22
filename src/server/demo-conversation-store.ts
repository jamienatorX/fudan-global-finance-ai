import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {newConversation,type ConversationState} from '../agent/conversation-contracts';
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
export class DemoConversationStore{
 private db:DatabaseSync;
 constructor(path:string){this.db=new DatabaseSync(path);this.db.exec(`pragma busy_timeout=5000;create table if not exists conversations(token text primary key,state text not null,revision integer not null,expires integer not null);create table if not exists quota(scope text not null,bucket text not null,calls integer not null,primary key(scope,bucket));`);}
 open(token?:string):{token:string;state:ConversationState}{
  if(token&&!/^[a-f0-9]{64}$/.test(token))throw new Error('INVALID_SESSION');
  const now=Date.now();this.db.prepare('delete from conversations where expires<?').run(now);
  this.db.prepare('delete from quota where bucket<?').run(new Date(now-172800000).toISOString().slice(0,10));
  if(token){const row=this.db.prepare('select state from conversations where token=?').get(hash(token)) as {state:string}|undefined;if(!row)throw new Error('CONVERSATION_EXPIRED');return{token,state:JSON.parse(row.state)};}
  const count=this.db.prepare('select count(*) as n from conversations').get() as {n:number};if(count.n>=100)throw new Error('RATE_LIMITED');
  const nextToken=randomBytes(32).toString('hex'),state=newConversation('demo');this.db.prepare('insert into conversations values(?,?,?,?)').run(hash(nextToken),JSON.stringify(state),0,state.expiresAt);return{token:nextToken,state};
 }
 reserve(token:string){
  this.open(token);const now=new Date(),minute=now.toISOString().slice(0,16),day=now.toISOString().slice(0,10),scope=hash(token);
  this.db.exec('begin immediate');try{for(const [owner,bucket,limit] of [[scope,minute,10],[scope,day,50],['instance',day,100]] as const){const row=this.db.prepare('select calls from quota where scope=? and bucket=?').get(owner,bucket) as {calls:number}|undefined;if((row?.calls??0)>=limit)throw new Error('RATE_LIMITED');this.db.prepare('insert into quota values(?,?,1) on conflict(scope,bucket) do update set calls=calls+1').run(owner,bucket);}this.db.exec('commit');}catch(e){this.db.exec('rollback');throw e;}
 }
 save(token:string,state:ConversationState,revision:number){
  if(state.source!=='demo'||state.revision!==revision+1||state.messages.length>40||JSON.stringify(state).length>100000)throw new Error('INVALID_SESSION');
  const change=this.db.prepare('update conversations set state=?,revision=?,expires=? where token=? and revision=? and expires>=?').run(JSON.stringify(state),state.revision,state.expiresAt,hash(token),revision,Date.now());if(!change.changes)throw new Error('STALE_CONVERSATION');
 }
 close(){this.db.close();}
}
let store:DemoConversationStore|undefined;
export function localDemoStore(){if(!store){const folder=join(process.cwd(),'.data');mkdirSync(folder,{recursive:true});store=new DemoConversationStore(join(folder,'fufu-sessions.sqlite'));}return store;}
