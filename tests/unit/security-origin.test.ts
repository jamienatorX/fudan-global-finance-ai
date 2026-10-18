import { describe,expect,it } from 'vitest';
import { NextRequest } from 'next/server';
import { sameOrigin } from '../../app/api/banking/action/route';
import { requestOrigin } from '../../src/lib/security/request-origin';
describe('security request origin',()=>{
  it('uses the actual host instead of an internal hostname and ignores forwarded-host spoofing',()=>{
    const request=new NextRequest('https://internal.example/banking',{headers:{host:'bank.example',origin:'https://bank.example','x-forwarded-host':'evil.example'}});
    expect(requestOrigin(request)).toBe('https://bank.example');expect(sameOrigin(request)).toBe(true);
    request.headers.set('origin','https://evil.example');expect(sameOrigin(request)).toBe(false);
  });
  it('does not accept missing, opaque, or credential-bearing redirect hosts',()=>{
    const request=new NextRequest('https://bank.example/banking',{headers:{host:'user@evil.example',origin:'null'}});
    expect(requestOrigin(request)).toBe('https://bank.example');expect(sameOrigin(request)).toBe(false);
    request.headers.delete('origin');expect(sameOrigin(request)).toBe(false);
  });
});
