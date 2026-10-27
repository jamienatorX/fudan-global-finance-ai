# FU Bank scenario completion — 27 October 2026

This change extends the authenticated fictional-money prototype. It has not been deployed and no production database was changed. The previous public-browser review could not establish what the private engine already implemented; source inspection confirmed existing permission tiers, action-bound MFA, safety locks, persistent workflows and operator support.

## Added behavior

| Area | Implementation | Boundary |
| --- | --- | --- |
| Smart transfers | Verified fictional contacts resolved by name, fictional phone or remark; immediate recipient transfers; exact scheduled mandates; integer split-bill requests | No real payment rail or outbound request messages. Split requests never imply collection. |
| Bill analysis | Shanghai-calendar YYYY/YYYY-MM reports, separate currency/category totals, transaction IDs, coverage warnings, historical median/MAD flags | Purchase history only; a flag is a review prompt, not proof of fraud. Sparse baselines produce no statistical claim. |
| Wealth | Educational risk questionnaire using horizon, loss tolerance, emergency liquidity and experience; side-by-side fictional product comparison | Not regulated advice or certified suitability; product terms absent from the source stay explicitly unknown. Existing checked buy/redeem remains in place. |
| Cards | Masked virtual card application, lost reporting, lost-status restoration, channel controls and daily limits | Fictional card records, no card issuing or real authorisation network. Restoration keeps a card frozen. Security changes require Red verification. |
| Subscriptions | Existing verified simulated cancellation plus dated fictional renewals and durable, deduplicated in-app notices | No merchant connection, real cancellation, SMS or email delivery. Explicit fictional initialization provides sample dates. |
| Cross-scenario | Birthday reservation plus separate flowers/cake tasks; saved schedules; pause/resume/cancel; due-payment review | Reserve now after exact approval. Fulfilment is fictional. A trusted worker must be configured before unattended tasks execute. |
| Evidence | Canonical payload, permission tier/reason/hash, decision, MFA grant reference, timestamp, immutable terminal result, linked audit/security events | Records contain structured decisions and tool results, not hidden model reasoning or authentication secrets. |

## Security design

Every new mutation enters the existing stored-action and checked-execution boundary. PostgreSQL validates operation fields and modes. The established owner/session checks, state version, expiry, explicit confirmation and action-bound MFA still apply. New privileged helpers are private, use an empty search path and have explicit execution grants. Public RPCs are invoker wrappers. All six new tables have RLS and read-only owner/session grants; foreign keys are indexed.

Reservations reduce available funds across **every** debit path, including legacy transfers, tuition, investments, agent execution and scheduled jobs. The original balance remains visible separately. The scheduler and interactive operations acquire the same owner profile lock first. A scheduled action is not counted as money transferred until actual execution.

The trusted database worker accepts no caller user ID, JWT or arbitrary code. It rechecks the original mandate, session revocation, safety holds, originating workflow takeover/pause, available funds and Shanghai-day cumulative allowance. Only exact approved CNY jobs within the current ¥1,000 Yellow allowance execute unattended. Unknown FX or a higher daily total changes the job to `needs_verification`; the user reviews a new exact action through the normal MFA flow. No stored MFA event is reused by cron.

Completed jobs cannot run twice. Failed jobs do not automatically retry indefinitely. Owners can review a due failed job or cancel its unspent part. Cancelling a birthday item releases only its remaining allocation; it does not undo a completed payment. Existing workflow/operator recovery remains conservative, with manual review for effects that cannot safely be reversed. Human takeover of an originating workflow blocks both the background worker and direct due-payment execution.

Invalid operation/code/authority fields cannot become executable tools. **No model-generated code is accepted or executed.** This removes an arbitrary-code execution path; it is not a claim to have built or certified a general-purpose code sandbox.

## How to review the source locally

1. Use Node 24 and run `npm ci`.
2. Run `npx vitest run --maxWorkers=2 --testTimeout=20000`, `npm run lint`, `npm run typecheck`, and `npm run build`.
3. For a disposable Supabase environment, apply the repository's migrations including `20261027110431_complete_agent_scenarios.sql`. Do not apply them to production as part of review.
4. Configure the existing publishable client settings and sign in through genuine Supabase Auth. Complete real authenticator setup in Security; never paste its secrets into chat.
5. Open signed-in banking, choose **Automations & tools**, and explicitly load fictional contacts/renewal dates. Fufu remains the single conversation and confirmation surface.
6. The optional trusted-administrator script `supabase/operations/enable_sandbox_scheduler.sql` registers the worker only after pg_cron has been enabled and rollout has been authorised. It was not executed here. The UI reports whether automatic execution is configured; it does not claim worker health from configuration alone.

Example requests, using the exact account/card names in the signed-in workspace:

- `Transfer CNY 10 from Daily CNY to Zhang Wei`
- `Transfer CNY 10 from Daily CNY to 13800000001`
- `Transfer CNY 10 from Daily CNY to Savings CNY on 2027-01-01T12:00+08:00`
- `Show spending report 2026` or `Show spending report 2026-10`
- `Cancel QQ Music Green Diamond`
- `Apply virtual card Travel with CNY 300 monthly limit`
- `Report Daily virtual lost`
- `Set Daily virtual restrictions online false international false daily CNY 100`
- `Split CNY 100 from Daily CNY between Alice, Bob, Chen for Dinner`
- `Plan birthday 2027-01-10 from Daily CNY with CNY 300 flowers and CNY 700 cake`

Dates must be future dates within one year; birthday fulfilment must be more than two days ahead. Examples create drafts, not approvals. A chat “yes” never substitutes for the confirmation button.

## Verification and remaining acceptance

Final local results: **614/614 tests in 115 files passed**, production build passed (including TypeScript and speech-asset integrity verification), and lint passed with zero errors and three existing warnings. A separate security review found no actionable critical or important issues. See [machine-readable verification](complete-agent-scenarios-verification.json). Tests exercise real migrations in PGlite, actual database effects/RLS, deterministic plans, permission boundaries, session-revoked mandates, idempotent jobs/notices, reservation coverage, takeover, code-field rejection and source-backed reports. A separate acceptance test covers transfer → report → subscription cancellation through stored plans, policy checks, verified effects and evidence.

Follow-up verification closed both environment gaps. **All four actual-browser checks passed** at 1440px/390px in light/dark, including draft-to-confirmation controls, Red verification blocking, reports and horizontal overflow. The browser ran in an isolated non-root test VM with fictional transport fixtures. **Eight real PostgreSQL 17.10 acceptance checks passed** using independent connections, including concurrent transfers, duplicate approvals, reservation races, worker/interactive races, duplicate workers, cancellation races, forbidden worker access and customer/operator takeover/release. See [native PostgreSQL evidence](complete-agent-postgres-concurrency.json). The temporary test environment was stopped; it contained no production credentials or customer records.

Still requires genuine acceptance in a dedicated hosted test environment:

- Real Supabase sign-in, physical authenticator challenge and action-bound MFA.
- Authorised hosted cron installation, a due-time run and worker monitoring. The separate-session customer/operator SQL flow already passed in the disposable PostgreSQL environment; hosted Auth-backed acceptance is still separate.
- Organiser acceptance of the fixed-tool/no-generated-code design.
- Provider agreements, credentials and integrations for real bank transfers, card issuing, merchant purchases/cancellations and external reminders, if real-world execution is intended.

The local SQL fixture creates controlled JWT/MFA claims solely to test enforcement. It does not prove that a real authenticator was used. No user was impersonated, no production success evidence was inserted, and no deployment was triggered.


## Reproducing the follow-up checks

Browser verification can use a system Chromium executable with `FU_BANK_CHROMIUM_PATH=/absolute/path/to/chrome`. Leave this variable unset for the normal Playwright-managed browser. In a minimal Ubuntu test VM, Chromium also needs `libnspr4` and `libnss3`.

The native concurrency runner starts and destroys its own database. It does not accept a hosted database connection string and refuses to run as root. On a disposable non-root Linux environment:

```bash
npm install --prefix /tmp/fubank-test-tools --save-exact pg@8.19.0 embedded-postgres@17.10.0-beta.17
# If your npm policy blocked this package's install script, review and run its supplied symlink hydration:
node /tmp/fubank-test-tools/node_modules/@embedded-postgres/linux-x64/scripts/hydrate-symlinks.js
FU_BANK_TEST_TOOLS=/tmp/fubank-test-tools node scripts/verify-postgres-concurrency.mjs
```

Controlled SQL claims test database enforcement; they are not physical MFA evidence. The hosted database was inspected read-only: one verified MFA factor exists, while this branch's migration and worker are not installed. The original no-deployment instruction is the remaining activation gate. No production changes were made. The hosted security advisor also reports disabled leaked-password protection; this is an Auth configuration item for the project owner, not evidence of an RLS failure. Its [Supabase remediation guide](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) explains the setting.
