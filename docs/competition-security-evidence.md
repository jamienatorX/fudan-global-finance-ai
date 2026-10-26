# Competition security evidence — 26 October 2026

Current submission status is tracked in [the submission verification record](submission/verification.md). The runs below are historical implementation evidence. Real TOTP enrollment and operator provisioning are configured; execution and handoff acceptance remain separate.

## What is implemented

The authenticated banking engine enforces permissions in PostgreSQL, not in model text or hidden buttons. Green read paths retain the existing AAL2/owner/session baseline. Yellow actions need exact confirmation. Transfers and tuition use an inclusive CNY 1000 daily threshold in Asia/Shanghai; unknown FX evidence escalates to Red. Investments and card freeze/unfreeze are Red. Red actions require a one-use, session/action/payload/state-bound MFA event newer than server grant creation. No arbitrary generated code is executed.

## Evidence matrix

| Requirement | Enforcement | Reproducible evidence | Boundary |
|---|---|---|---|
| Daily tiers and cumulative allowance | competition_permission_policy: bank_policy, bank_checked_execute, bank_transfer_usage | permission-tiers.test.ts; competition-adversarial.test.ts | Same-owner profile row lock serializes decisions. Multiple real PostgreSQL sessions have not been exercised locally; PGlite is single-connection. |
| Fresh exact MFA | bank_action_verification_begin/complete and checked execution | action-verification.test.ts; adversarial expired/cross-session/pre-existing JWT/reuse cases | JWTs in these tests are fixtures. Real Supabase authenticator acceptance remains a human check. |
| Durable failure lock | nested business rollback, durable denial events, bank_safety_locks | safety-locks.test.ts; three missing-approval attempts; forbidden operation hold | Supabase Auth itself validates/rate-limits failed TOTP codes; application evidence covers checked RPC denials, not Auth-provider internals. |
| Owner/RPC isolation | private fixed-path helpers, invoker public wrappers, RLS and grants | rls.test.ts; banking-api-security.test.ts; competition-api.test.ts; adversarial role/direct helper denial | Dedicated fictional identities only; no live brute force or cross-customer probing. |
| DAG/checkpoints/retry | bank_workflow_create/command; stable action IDs and owner/revision locks | banking-workflows.test.ts | Topologically indexed DAG, default sequential dependencies; bounded request advances one node. No unattended scheduler. |
| Safe recovery | bank_workflow_recovery_prepare plus shared action policy | workflow-recovery.test.ts; original and compensating ledger entries remain | Only supported own-account transfer/budget/card inverse proposals; later state, unknown and irreversible effects require manual review. |
| Real human takeover | bank_support_create/get/list/reply; bank_operator_command; role and claim checks | operator-inbox.test.ts; adversarial expired/revoked role tests | Queue is real persistence. The team operator account is provisioned; a real team exercise is still needed. Operators cannot execute customer approvals. |
| Chat and accessible review | ActionVerification, WorkflowPanel, OperatorInbox | component tests and competition-security.spec.ts: desktop/mobile × light/dark | Browser checks use mocked API fixtures. They prove UI state, not real authentication. |
| Audit evidence | bank_security_events, sim_audit, immutable receipts | SQL tests and owner-only JSON download | No codes, bearer tokens or authenticator secrets in audit schema. User support messages are explicitly supplied content. |

## Runs in this session

- Full Vitest regression: **525/525 passed**, using `vitest run --maxWorkers=2 --testTimeout=15000 --reporter=json`.
- Browser review: **4/4 passed**, 1440px/390px, light/dark. Red confirmation stays disabled, canonical card details are visible, support status/message render and mobile support has no horizontal overflow.
- TypeScript: passed. Changed-code ESLint: no errors; one pre-existing sign-out navigation warning in BankingWorkspace.
- Production webpack build: passed; final release rebuild and hosted status recorded in the release report.
- First failing runs for new security, workflow, support and UI behavior were observed before their implementations. Independent review found MFA freshness, tuition accounting, card tiers, denial auditing and canonical-review gaps; fixes received regression coverage.

Machine-readable results and screenshots are retained in the plan workspace `.superpowers/sdd/2026-10-25-competition-security-workflows/`. This is engineering test evidence, not a formal penetration-test certificate or a claim of complete regulatory compliance.

## Reproduce

Use Node 24, `npm ci`, then `npx vitest run --maxWorkers=2 --testTimeout=15000`, `npm run typecheck`, and `npm run build`. Database integration tests create disposable PGlite databases and apply every local migration. Do not run reset against production. For browser UI fixtures, start a local development server with public Supabase URL/key empty and PLAYWRIGHT_DEMO_MODE=1, then run competition-security.spec.ts with Chromium. Keep that fixture setup local; production middleware does not enable it.
