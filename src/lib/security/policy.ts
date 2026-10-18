export const IDLE_TIMEOUT_MS = 15 * 60_000;
export const SESSION_TIMEOUT_MS = 8 * 60 * 60_000;
export const REAUTH_TIMEOUT_SECONDS = 5 * 60;
export function captchaRequired() { return process.env.NODE_ENV === 'production' || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY); }
export function recentMfa(claims: { aal?: unknown; amr?: unknown }, now = Date.now()) {
  return claims.aal === 'aal2' && Array.isArray(claims.amr) && claims.amr.some((a: {method?:unknown;timestamp?:unknown}) =>
    a?.method === 'totp' && typeof a.timestamp === 'number' && a.timestamp <= now / 1000 + 30 && now / 1000 - a.timestamp <= REAUTH_TIMEOUT_SECONDS);
}
export function securityPolicy(nonce: string, production: boolean) {
  let supabase = '';
  try { supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin; } catch {}
  return ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${production ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'", `connect-src 'self' ${supabase} https://challenges.cloudflare.com${production ? '' : ' ws: http://127.0.0.1:*'}`,
    "frame-src https://challenges.cloudflare.com", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", ...(production ? ['upgrade-insecure-requests'] : [])].join('; ');
}
