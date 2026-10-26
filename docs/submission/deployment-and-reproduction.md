# Setup, tests and release reproduction

## Source and runtime

- Repository: https://github.com/jamienatorX/fudan-global-finance-ai
- Website: https://fudan-global-finance-ai.vercel.app/
- Runtime: Node.js **24.x**, npm lockfile, Next.js 16 / React 19 / TypeScript.
- Database: Supabase Auth/PostgreSQL; schema and policies in `supabase/migrations/`.

Clone the repository, copy `.env.example` to `.env.local`, and fill only the required settings privately. Never commit `.env.local`, provider keys, service-role keys, passwords or authenticator setup secrets.

```bash
npm ci
npm run lint
npm run typecheck
npx vitest run --maxWorkers=2 --testTimeout=15000
npm run build
npm run dev
```

`npm run build` prepares pinned local speech assets before building Next.js. First installation may need network access. If the environment cannot prepare voice assets, retain source and report the build failure; do not silently claim voice was tested.

For an unconfigured public local development session, set `PLAYWRIGHT_DEMO_MODE=1` in the development environment. Hosted public pages use `COMPETITION_PUBLIC_DEMO=1`. These options do not remove authentication from `/banking` or banking API routes.

## Environment settings

| Setting | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase connection; RLS and Auth remain required |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public widget key; matching secret belongs in Supabase Auth Bot and Abuse Protection |
| `BANK_AGENT_MODE=deterministic` | No-key supported pattern/form behavior |
| `BANK_AGENT_MODE=live`, `BANK_AGENT_PROVIDER=openrouter` | Optional model-assisted intent interpretation |
| `OPENROUTER_API_KEY`, `OPENROUTER_AGENT_MODEL` | Server-only configured model credentials/name; free availability is not guaranteed |
| `OPENROUTER_DEMO_ALLOW_DATA_COLLECTION` | Explicit policy for fictional public demo chat, not permission to submit real customer data |
| `FUFU_DEMO_SHARED_STORE`, `FUFU_DEMO_SERVER_SECRET` | Optional shared public conversation persistence; configure matching database secret hash privately |
| `FU_BANK_SUPPORT_URL` | Optional external support destination; private support/operator inbox remains in-app |

See `.env.example` and server provider code for other adapters. Visitors never need a model API key. Keep secret settings server-side, outside `NEXT_PUBLIC_*`.

## Database setup and migration safety

Use a disposable Supabase project or local Supabase environment for reproduction. Apply migrations chronologically. Do **not** reset or recreate the live database. `npm run db:reset` is explicitly local-only; inspect its target before use. PGlite integration tests create their own disposable databases and do not require production credentials.

The competition security additions are `20261025160007_competition_permission_policy.sql`, `20261025160008_competition_workflows.sql` and `20261025160009_competition_operator_inbox.sql`. They were approved and applied to the hosted project previously. The operator inbox was applied through separately recorded schema/function/grant steps because of connector request limits; inspect hosted migration history before comparing names or attempting any application. Do not rerun the full files over existing objects based on a name mismatch.

Operator membership must be granted by the project owner's trusted administrative path to a verified account UUID, never by browser metadata/email pattern. The team operator account is already provisioned; no new role grant is needed for this release. Set up actual TOTP per user and use the acceptance runbook.

## Automated verification

```bash
npx vitest run tests/unit/fufu-service-recovery.test.ts tests/component/fufu-conversation.test.tsx
npx vitest run tests/integration/permission-tiers.test.ts tests/integration/action-verification.test.ts tests/integration/safety-locks.test.ts tests/integration/banking-workflows.test.ts tests/integration/workflow-recovery.test.ts tests/integration/operator-inbox.test.ts --maxWorkers=2 --testTimeout=15000
npm run typecheck
npm run lint
npm run build
```

For browser tests install compatible Chromium with `npx playwright install chromium`, then use the repository's Playwright configuration and local test server. Security UI browser fixtures prove rendering and disabled/enabled behavior, not real Supabase MFA. Local browser speech tests also do not establish microphone quality on every device.

## Publishing and validation

Run the full regression suite, typecheck, changed-code lint and production build. Review a scoped diff, excluding secrets and unrelated work. Publish against the latest remote main with a lease; allow Vercel's existing Git integration to build the production commit. Verify the exact commit, READY state and primary alias before calling it deployed. No database migration is required for the conversation evidence repair; attachments use existing bounded conversation JSON.

After publication check the root, single composer, recurring question without a model call, explicit sample-history loader, evidence location after a follow-up, direct review button, mobile/light/dark layouts and anonymous redirects for private routes. Perform genuine authenticated acceptance separately. The dated [verification record](verification.md) is the release evidence; this guide alone is not proof that a release ran successfully.
