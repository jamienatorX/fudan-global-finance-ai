// @vitest-environment node
import {it,expect} from 'vitest';
import {DemoConversationStore} from '../../src/server/demo-conversation-store';
import {newConversation} from '../../src/agent/conversation-contracts';
it('isolates opaque demo sessions, persists revisions and rejects races/quotas',()=>{const store=new DemoConversationStore(':memory:');try{const a=store.open(),b=store.open();expect(a.token).not.toBe(b.token);const next={...a.state,revision:1};store.save(a.token,next,0);expect(store.open(a.token).state.revision).toBe(1);expect(store.open(b.token).state.revision).toBe(0);expect(()=>store.save(a.token,next,0)).toThrow('STALE_CONVERSATION');for(let i=0;i<10;i++)store.reserve(a.token);expect(()=>store.reserve(a.token)).toThrow('RATE_LIMITED');expect(()=>store.open('invalid')).toThrow('INVALID_SESSION');expect(()=>store.save(a.token,newConversation('private'),1)).toThrow('INVALID_SESSION');}finally{store.close();}});
