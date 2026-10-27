// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {POST} from '../../app/api/banking/scenarios/route';
const mocks=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn()}));
vi.mock('../../src/server/secure-banking',async original=>({...await original<typeof import('../../src/server/secure-banking')>(),authenticatedBanking:mocks.auth}));
beforeEach(()=>{mocks.rpc.mockReset().mockResolvedValue({data:{},error:null});mocks.auth.mockReset().mockResolvedValue({client:{rpc:mocks.rpc},userId:'owner'});});
const request=(body:unknown,origin='https://bank.example')=>new NextRequest('https://bank.example/api/banking/scenarios',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
it('rejects caller authority, cross-origin and oversized requests',async()=>{
 expect((await POST(request({operation:'job',userId:'other'}))).status).toBe(400);
 expect((await POST(request({operation:'state'},'https://evil.example'))).status).toBe(403);
 expect((await POST(request({operation:'state',command:'x'.repeat(9000)}))).status).toBe(413);
 expect(mocks.auth).not.toHaveBeenCalled();
});
it('requires an authenticated session and DB security guard',async()=>{
 mocks.auth.mockResolvedValueOnce(null);expect((await POST(request({operation:'state'}))).status).toBe(401);
 mocks.rpc.mockResolvedValueOnce({error:{message:'MFA_REQUIRED'}});expect((await POST(request({operation:'state'}))).status).toBe(403);
});
it('routes job commands only by owned ID and never accepts a new payment payload',async()=>{
 const id=crypto.randomUUID();expect((await POST(request({operation:'job',jobId:id,command:'review'}))).status).toBe(200);
 expect(mocks.rpc).toHaveBeenCalledWith('bank_job_command',{p_id:id,p_command:'review'});
 expect((await POST(request({operation:'job',jobId:id,command:'execute',payload:{amountMinor:'1'}}))).status).toBe(400);
});
