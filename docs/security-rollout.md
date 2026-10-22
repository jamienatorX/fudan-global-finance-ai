# 福 bank security rollout

Status: implemented and locally verified; not activated on the hosted database or live website.

This change protects the authenticated banking simulation. It does not turn the project into a licensed bank or connect real payment rails.

## Implemented controls

- `/` opens sign-in. Password sign-in and PKCE callbacks lead to `/security` for authenticator enrollment or challenge, before `/banking`.
- Banking RPCs require verified AAL2 claims and an existing, unexpired Supabase session. Mutations require TOTP evidence within five minutes. Refreshing an access token does not reset the MFA timestamp requirement.
- Database session tracking enforces 15 minutes of inactivity and an eight-hour absolute lifetime. A user cannot restore an expired tracked session by calling the heartbeat; sign-in creates a new session. The UI locks on idle as well. Sign-out of other devices revokes their Supabase sessions; database guards and RLS check that those session rows still exist.
- The API calls a separately committed database guard before actions: 120 requests per user per minute. Mutation functions also enforce 20 committed write admissions per user per minute. A SQL exception rolls back that transaction's write counter; API-level admission accounting is separate. Provider/network-level abuse prevention remains important for direct database API abuse.
- `sim_*` owner-read policies additionally require a valid MFA banking session. Direct calls to private or public simulation mutation functions enforce the same guard. No service-role key is introduced.
- Requests require a same-origin browser Origin and JSON. Banking bodies are read with a 4096-byte streaming cap. Database error details are not returned to customers.
- Per-request nonce CSP, anti-framing, MIME sniff protection, referrer policy, permission restrictions and HTTPS HSTS are included. Scripts do not use `unsafe-inline`; development-only eval is excluded from production. Inline styles remain allowed for current chart/layout compatibility.
- Demo entry uses an explicit same-origin POST, so link prefetch cannot activate it. Its one-hour HttpOnly/SameSite cookie grants access only to fictional demo pages, never private APIs. The demo shell displays a clear label.
- Production sign-in/sign-up stays disabled when CAPTCHA configuration is missing. No public test key or bypass flag is used in production.

## Cloudflare and Supabase configuration required

1. Create a free Cloudflare Turnstile widget in https://dash.cloudflare.com/ under Turnstile. Add `fudan-global-finance-ai.vercel.app` and any exact preview/custom domains you intend to test. Use managed mode.
2. Add the **public site key** to Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, for the environments that will use the widget. A new build is required for this public variable.
3. Keep the **secret key** out of chat, Git, screenshots and browser JavaScript. During cutover, configure it in Supabase project `geqamggjfmkcvjuaokzz` > Authentication > Bot and Abuse Protection, select Turnstile, and enable CAPTCHA. Tokens are verified by Supabase, not by trusting the browser widget.
4. Verify hosted Auth settings: TOTP enrollment and verification enabled, email confirmation enabled, minimum password length 12, secure password changes enabled, and appropriate sign-in/sign-up and verification rate limits. Enable leaked-password protection if the current plan supports it. `supabase/config.toml` only describes local settings; it does not change the hosted project automatically.
5. Keep a tested support procedure for identity-verified authenticator recovery. Do not add an unauthenticated endpoint that removes MFA factors.

References:
- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/auth/auth-mfa/totp
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/rate-limits
- https://nextjs.org/docs/app/guides/content-security-policy

## Coordinated release

Do not apply the new database policies to the old app: the current deployed interface cannot complete MFA and would lock users out.

1. Wait for Vercel's deployment allowance to return. Prepare the Turnstile widget and public environment variable first.
2. In a controlled maintenance window, deploy the new application, enable Supabase CAPTCHA with its matching secret, and apply `supabase/migrations/20261019000000_banking_security.sql` to the matching hosted project. The new app rejects private banking access if the security RPC is absent, so the short transition is closed to private banking actions.
3. Run database security advisors and resolve relevant findings. Verify only intended schemas are exposed.
4. Test with a fictional test account: confirmed email, password, MFA enrollment, wrong code, correct code, account setup, transfer review, reauthentication after five minutes, idle expiry, sign-out of other devices, and cross-user record isolation.
5. In a fresh browser context, verify `/` goes to sign-in; `/overview` without demo entry does not enter the demo; Try the demo works only after submission; its cookie does not open `/banking` or banking APIs. Check the real production CSP in the browser console.
6. Confirm missing/expired CAPTCHA is rejected by Supabase itself, including direct authentication API calls. Merely disabling a browser button is not sufficient.
7. Keep the change in draft until the provider settings, application and database migration can be released together. Do not describe these protections as live before that verification.

## Verification evidence

PostgreSQL/PGlite tests exercise actual migrations and policies, including direct-RPC bypass attempts, AAL1 read denial, stale MFA, idle expiry, absolute expiry, revoked sessions, owner isolation, rate caps and denied direct writes. Component tests cover enrollment/challenge, invalid codes, idle sign-out and sign-out of other devices. Browser checks cover explicit demo entry and nonce CSP in development and a separately launched production server. Hosted authentication and CAPTCHA still require the cutover smoke tests above.
