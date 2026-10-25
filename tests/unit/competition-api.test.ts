// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {POST} from '../../app/api/banking/policy/route';
const mock=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn()}));
vi.mock('../../src/server/secure-banking',()=>({authenticatedBanking:mock.auth}));
beforeEach(()=>{mock.auth.mockResolvedValue({client:{rpc:mock.rpc}});mock.rpc.mockResolvedValue({data:{tier:'Yellow'},error:null});});
const req=(body:unknown,origin='https://bank.example')=>new NextRequest('https://bank.example/api/banking/policy',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
it('rejects cross-origin, oversized requests and caller-supplied approval authority',async()=>{
 expect((await POST(req({operation:'policy'},'https://evil.example'))).status).toBe(403);
 expect((await POST(req({operation:'policy',message:'a'.repeat(20000)}))).status).toBe(413);
 expect((await POST(req({operation:'policy',actionId:crypto.randomUUID(),verified:true}))).status).toBe(400);
});
