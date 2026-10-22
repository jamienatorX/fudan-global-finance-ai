// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {POST} from '../../app/api/banking/agent/route';
const mocks=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn()}));
vi.mock('../../src/server/secure-banking',async original=>({...await original<typeof import('../../src/server/secure-banking')>(),authenticatedBanking:mocks.auth}));
beforeEach(()=>{mocks.rpc.mockReset().mockResolvedValue({data:{},error:null});mocks.auth.mockReset().mockResolvedValue({client:{rpc:mocks.rpc},userId:'user'});});
const request=(body:unknown,origin='https://bank.example')=>new NextRequest('https://bank.example/api/banking/agent',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
it('rejects cross-origin and oversized requests before reading accounts',async()=>{expect((await POST(request({},'https://evil.example'))).status).toBe(403);expect((await POST(request({command:'x'.repeat(5000)}))).status).toBe(413);expect(mocks.auth).not.toHaveBeenCalled();});
it('requires authentication and security guard',async()=>{mocks.auth.mockResolvedValueOnce(null);expect((await POST(request({operation:'plan',command:'find subscriptions'}))).status).toBe(401);mocks.rpc.mockResolvedValueOnce({error:{message:'MFA_REQUIRED private details'}});const r=await POST(request({operation:'plan',command:'find subscriptions'}));expect(r.status).toBe(403);expect(await r.json()).toEqual({error:'MFA_REQUIRED'});});
it('prepares only a stored plan index, never a supplied payload',async()=>{const id=crypto.randomUUID();expect((await POST(request({operation:'prepare',planId:id,index:0,payload:{type:'transfer'}}))).status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('bank_agent_prepare',{p_plan_id:id,p_index:0});});
