// @vitest-environment node
import {it,expect,vi,afterEach} from 'vitest';
import {NextRequest} from 'next/server';
import {newConversation} from '../../src/agent/conversation-contracts';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {createSeedSnapshot} from '../../src/demo/seed';
const mocks=vi.hoisted(()=>({open:vi.fn(),save:vi.fn(),reserve:vi.fn()}));
vi.mock('../../src/server/demo-conversation-store',()=>({localDemoStore:()=>mocks}));
import {POST} from '../../app/api/agent/demo-conversation/route';
afterEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();});
const request=(body:unknown,origin='http://127.0.0.1:3000')=>new NextRequest('http://127.0.0.1:3000/api/agent/demo-conversation',{method:'POST',headers:{origin,host:'127.0.0.1:3000','content-type':'application/json'},body:JSON.stringify(body)});
it('rejects wrong origins, oversized bodies and private-context selection before opening a session',async()=>{const c=demoAgentContext(createSeedSnapshot('v1'),0);expect((await POST(request({operation:'load',context:c},'https://evil.example'))).status).toBe(403);expect((await POST(request({operation:'load',message:'x'.repeat(140000),context:c}))).status).toBe(413);expect((await POST(request({operation:'load',context:{...c,source:'authenticated'}}))).status).toBeGreaterThanOrEqual(400);expect(mocks.open).not.toHaveBeenCalled();});
it('allows only local fictional read planning and never accepts approve on its anonymous endpoint',async()=>{vi.stubEnv('NODE_ENV','development');const c=demoAgentContext(createSeedSnapshot('v1'),0);mocks.open.mockReturnValue({token:'a'.repeat(64),state:newConversation('demo')});const response=await POST(request({operation:'load',context:c}));expect(response.status).toBe(200);expect(response.cookies.get('fufu-demo-session')?.httpOnly).toBe(true);expect((await POST(request({operation:'execute',approve:true,context:c}))).status).toBeGreaterThanOrEqual(400);expect(mocks.reserve).not.toHaveBeenCalled();});
it('does not expose the anonymous model endpoint in production',async()=>{vi.stubEnv('NODE_ENV','production');expect((await POST(request({operation:'load'}))).status).toBe(409);expect(mocks.open).not.toHaveBeenCalled();});
it('restarts an expired demo session despite the old panel revision',async()=>{vi.stubEnv('NODE_ENV','development');mocks.open.mockReset();mocks.open.mockImplementationOnce(()=>{throw new Error('CONVERSATION_EXPIRED');}).mockReturnValue({token:'b'.repeat(64),state:newConversation('demo')});const response=await POST(request({operation:'reset',revision:99,conversationId:'old',context:demoAgentContext(createSeedSnapshot('v1'),0)}));expect(response.status).toBe(200);expect((await response.json()).state.revision).toBe(1);});
it('restarts when an expired cookie has already disappeared',async()=>{vi.stubEnv('NODE_ENV','development');mocks.open.mockReset();mocks.open.mockReturnValue({token:'c'.repeat(64),state:newConversation('demo')});const response=await POST(request({operation:'reset',revision:99,conversationId:'expired',context:demoAgentContext(createSeedSnapshot('v1'),0)}));expect(response.status).toBe(200);});
