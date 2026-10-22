// @vitest-environment node
import {it,expect,vi} from 'vitest';
import {newConversation} from '../../src/agent/conversation-contracts';
import type {SimClient} from '../../src/server/secure-banking';
vi.mock('../../src/server/secure-banking',()=>({readBankingState:vi.fn(async()=>({enrolled:true}))}));
vi.mock('../../src/server/agent-history',()=>({readAgentHistory:vi.fn(async()=>({transactions:[],cards:[],subscriptions:[],coverage:{from:'2026-10-01',to:'2026-10-22',truncated:false}}))}));
vi.mock('../../src/agent/context-adapters',()=>({privateAgentContext:vi.fn(()=>({source:'authenticated',version:0,asOf:'2026-10-22',transactions:[],cards:[],subscriptions:[],coverage:{from:'2026-10-01',to:'2026-10-22',truncated:false}}))}));
import {bankingConversation} from '../../src/server/banking-conversation';
it('allows an expired private panel to restart with a new scoped identity',async()=>{const fresh=newConversation('private');const rpc=vi.fn().mockResolvedValueOnce({error:{message:'CONVERSATION_EXPIRED'},data:null}).mockResolvedValueOnce({error:null,data:fresh}).mockImplementation(async(_name,args)=>({error:null,data:args.p_state}));const result=await bankingConversation({rpc} as unknown as SimClient,{operation:'reset',conversationId:'expired',revision:45});expect(rpc.mock.calls[1][1]).toEqual({p_id:null});expect('state' in result&&result.state.id).toBe(fresh.id);expect('state' in result&&result.state.revision).toBe(1);});

