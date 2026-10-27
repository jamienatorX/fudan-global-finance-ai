# Complete Banking Agent Scenarios Implementation Plan

Goal: complete the missing competition scenarios as authenticated fictional-money operations and produce honest security evidence, without deployment.
Architecture: extend the existing checked PostgreSQL action engine; retain owner/session checks, exact approvals, action-bound MFA, atomic writes, audit and locks. Add bounded deterministic planning and persisted scheduled workflows. No model-generated executable code, real payment rails or merchant credentials.
Stack: existing Next.js 16, React 19, TypeScript, Supabase PostgreSQL and PGlite/Vitest.

## Constraints
- No production deploy or database changes. All new migrations run in disposable local fixtures.
- Existing six operation types remain the execution allowlist. New card modes and transfer modes are validated in PostgreSQL.
- Scheduled payments have an exact mandate, recheck the Shanghai daily allowance, reservations, safety holds and original session revocation. Red payments wait for fresh interactive verification.
- Birthday orders are explicitly fictional fulfilment; no external purchase claims.
- No secrets in logs or evidence. Authentication fixtures are never described as physical MFA tests.

## Tasks
- [x] Add monthly/yearly reports, per-currency categories, historical median/MAD anomaly flags and questionnaire-based suitability. Test incomplete history, sparse/zero histories, malformed dates and mixed currencies.
- [x] Extend database transfers with seeded fictional verified beneficiaries, exact split-bill requests, scheduled mandates, holds, card issuing/loss/restrictions, reminders and audit evidence. Test direct RPC, owner isolation, replay, stale/expired approvals, insufficient available funds, red threshold and invalid payloads.
- [x] Add persistent birthday/scheduled workflows and an owner-independent privileged due-job function. Test dependencies, pause/cancel, duplicate ticks, session revocation, insufficient funds and daily escalation. Ship optional pg_cron setup separately, disabled until rollout.
- [x] Connect natural-language plans and authenticated UI to new tools, policy review, receipts, renewal notifications and detailed audit evidence. Existing conversation and operator workflows remain available.
- [x] Run full test suite with bounded workers, lint, typecheck and build. Document verified evidence and pending real Auth/PostgreSQL acceptance. Commit locally; no push, merge or deployment.

## Review focus
Replay cannot multiply effects; parallel paths serialize per owner; holds apply to every spending path; cron cannot impersonate a user; unknown extra payload keys fail closed. External providers and actual authenticator interaction require genuine acceptance rather than simulated claims.
