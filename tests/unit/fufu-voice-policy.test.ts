// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {proxy} from '../../proxy';
vi.mock('../../src/lib/supabase/middleware',()=>({updateSession:async()=>new Response(null)}));
it('allows same-origin microphone capture and WASM workers without enabling arbitrary script evaluation',async()=>{
 const r=await proxy(new NextRequest('https://app.example/overview'));expect(r.headers.get('Permissions-Policy')).toContain('microphone=(self)');expect(r.headers.get('Content-Security-Policy')).toContain("worker-src 'self'");expect(r.headers.get('Content-Security-Policy')).toContain("'wasm-unsafe-eval'");
});
