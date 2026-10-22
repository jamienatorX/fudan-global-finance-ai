// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/banking/action/route';
const state=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn()}));
vi.mock('../../src/server/secure-banking',async(importOriginal)=>({
  ...await importOriginal<typeof import('../../src/server/secure-banking')>(),authenticatedBanking:state.auth,
}));
beforeEach(()=>{state.rpc.mockReset().mockResolvedValue({data:{status:'ok'},error:null});state.auth.mockReset().mockResolvedValue({client:{rpc:state.rpc},userId:'user'});});
function request(body:unknown,origin='https://bank.example'){
  return new NextRequest('https://bank.example/api/banking/action',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
}
describe('banking API security',()=>{
  it('rejects cross-origin requests before accessing authentication or banking',async()=>{
    expect((await POST(request({operation:'initialize'},'https://evil.example'))).status).toBe(403);
    expect(state.auth).not.toHaveBeenCalled();
  });
  it('caps streamed bodies before parsing or accessing authentication',async()=>{
    expect((await POST(request({payload:'x'.repeat(5000)}))).status).toBe(413);
    expect(state.auth).not.toHaveBeenCalled();
  });
  it.each([['MFA_REQUIRED',403],['SESSION_EXPIRED',401],['RATE_LIMITED',429]])('enforces %s before calling action RPCs',async(code,status)=>{
    state.rpc.mockResolvedValue({data:null,error:{message:code+' private details'}});
    const response=await POST(request({operation:'initialize'}));
    expect(response.status).toBe(status);expect(await response.json()).toEqual({error:code});
    expect(state.rpc).toHaveBeenCalledTimes(1);expect(state.rpc).toHaveBeenCalledWith('bank_security_guard');
    if(status===429)expect(response.headers.get('retry-after')).toBe('60');
  });
  it('does not disclose database errors from rejected actions',async()=>{
    state.rpc.mockResolvedValueOnce({data:{},error:null}).mockResolvedValueOnce({data:null,error:{message:'SQL secret database details'}});
    const response=await POST(request({operation:'initialize'}));
    expect(response.status).toBe(409);expect(await response.json()).toEqual({error:'ACTION_REJECTED'});
  });
});
