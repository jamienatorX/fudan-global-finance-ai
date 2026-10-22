import type { NextRequest } from 'next/server';
import { updateSession } from './src/lib/supabase/middleware';
import { securityPolicy } from './src/lib/security/policy';

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const production = process.env.NODE_ENV === 'production';
  const csp = securityPolicy(nonce, production);
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', csp);
  const response = await updateSession(request);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (production) response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
