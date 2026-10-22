import { afterEach,describe,expect,it,vi } from 'vitest';
import { captchaRequired,recentMfa,securityPolicy } from '../../src/lib/security/policy';
afterEach(()=>vi.unstubAllEnvs());
describe('security policy',()=>{
  it('rejects weak, missing, stale and future MFA evidence',()=>{
    const now=1_800_000_000_000;
    expect(recentMfa({aal:'aal2',amr:[{method:'totp',timestamp:now/1000}]},now)).toBe(true);
    expect(recentMfa({aal:'aal1',amr:[{method:'totp',timestamp:now/1000}]},now)).toBe(false);
    expect(recentMfa({aal:'aal2',amr:[{method:'password',timestamp:now/1000}]},now)).toBe(false);
    expect(recentMfa({aal:'aal2',amr:[{method:'totp',timestamp:now/1000-301}]},now)).toBe(false);
    expect(recentMfa({aal:'aal2',amr:[{method:'totp',timestamp:now/1000+60}]},now)).toBe(false);
  });
  it('uses nonce-bound scripts and blocks framing and objects',()=>{
    const policy=securityPolicy('unique-nonce',true);
    expect(policy).toContain("'nonce-unique-nonce'");
    expect(policy.split(';')[1]).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });
  it('never silently skips production CAPTCHA when keys are missing',()=>{
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY','');
    expect(captchaRequired()).toBe(true);
  });
});
