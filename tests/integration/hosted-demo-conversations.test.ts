// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import type {PGlite} from '@electric-sql/pglite';
import {createDatabase,asUser} from './database';
import {newConversation} from '../../src/agent/conversation-contracts';
let db:PGlite;const secret='a'.repeat(64),token='b'.repeat(64),hash=createHash('sha256').update(secret).digest('hex');
beforeAll(async()=>{db=await createDatabase();await db.query('insert into private.fufu_demo_access values(true,$1)',[hash]);},30000);afterAll(async()=>{await db?.close();});
const call=(op:string,state:unknown=null,revision:number|null=null,create=false,key=secret)=>db.query<{state:ReturnType<typeof newConversation>}>('select public.fufu_demo_conversation($1,$2,$3,$4::jsonb,$5,$6) as state',[key,op,token,state===null?null:JSON.stringify(state),revision,create]);
it('denies anonymous table access and guessed server credentials',async()=>{await asUser(db,null,'anon');await expect(db.exec('select * from private.fufu_demo_sessions')).rejects.toThrow(/permission denied/);await expect(call('open',newConversation('demo'),null,true,'c'.repeat(64))).rejects.toThrow(/INVALID_SESSION/);});
it('shares server-owned fictional state, prevents stale saves and caps quota atomically',async()=>{await asUser(db,null,'anon');const s=newConversation('demo');await call('open',s,null,true);const first=(await call('open')).rows[0].state;expect(first.id).toBe(s.id);const next={...first,revision:1};await call('save',next,0);await expect(call('save',next,0)).rejects.toThrow(/STALE_CONVERSATION/);for(let i=0;i<10;i++)await call('reserve');await expect(call('reserve')).rejects.toThrow(/RATE_LIMITED/);expect((await call('open')).rows[0].state.revision).toBe(1);});
