# Competition Security and Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce competition permission tiers and deliver recoverable banking workflows, a genuine operator inbox and reproducible security evidence.

**Architecture:** Extend the existing Next.js/Supabase engine. PostgreSQL owns policy, approvals, locks, workflow checkpoints and support assignments; the model proposes typed intents only. Deliver the three subsystems in order, each with its own passing tests before integration.

**Tech Stack:** Existing Next.js 16, React 19, TypeScript, Supabase/PostgreSQL, Vitest/PGlite and Playwright. No new paid service or framework migration.

**Spec:** `docs/superpowers/specs/2026-10-25-competition-security-workflows-design.md` (approved 25 October 2026).

## Global Constraints

- Keep existing account records, balances, receipts, free-model configuration and authentication/RLS baseline.
- Yellow transfer limit: executed-plus-proposed daily CNY-equivalent total at most 100000 minor units; day is Asia/Shanghai.
- Red approval: fresh, one-use authenticator verification bound to owner, session, action, payload hash, state/policy version and expiry.
- Three failed sensitive operations in a rolling 10-minute window lock mutations for 15 minutes; tampering triggers an immediate hold.
- No model-generated code execution, invented receipts, simulated MFA success or fake support delivery.
- Recovery adds approved compensating effects; it never deletes ledger history.
- Generate migrations using `supabase migration new`; review concrete SQL before production application. Operator role provisioning needs the chosen account identity.
- Do not bulk-commit the existing dirty worktree. Stage only task-owned files; preserve all unrelated work.

## Review Focus

1. Simultaneous transfers must not both consume the same remaining Yellow allowance (Task 1).
2. A denied mutation must retain its safety event even though business writes roll back (Task 2).
3. A newer MFA JWT must not authorize a different action or bypass one-use verification (Task 3).
4. A request lost after commit must not execute a workflow node twice (Task 4).
5. A revoked operator or expired claim must immediately lose ticket authority and cannot release a handoff (Task 6).

## Delivery A: Permission enforcement and evidence

### Task 1: Inventory mutations and enforce daily permission policy

**Files:** Create `docs/security/mutation-inventory.md`, `src/server/banking-policy.ts`, `tests/integration/permission-tiers.test.ts`. Generate migration `competition_permission_policy`. Inspect all migrations, `src/server/banking-agent.ts`, `src/server/banking-conversation.ts`, `src/server/secure-banking.ts` and `app/api/banking/` entry points before wiring guards.

**Interfaces:** `bank_action_policy(action_id uuid) -> jsonb` returns `{tier, reason, policyVersion, actionHash, dailyCnyMinor, verificationRequired}` using only authenticated database records. Private `bank_enforce_action_policy` runs inside the same owner-serialized transaction as execution. Never accept a caller-supplied tier or conversion rate.

- [ ] Enumerate every mutation RPC, public execute grant and HTTP caller; record common enforcement boundary and any initialization exemption.
- [ ] Add failing tests asserting CNY 999/1000 are Yellow, 1000.01 is Red, cumulative 600+401 is Red, failure consumes zero allowance, replay counts once and Shanghai midnight resets the day.
- [ ] Add tests for two competing transfers, stale/missing FX escalation, non-CNY precision, unsupported action denial and direct-RPC calls. Use independent real PostgreSQL sessions for concurrency if PGlite cannot represent it; report the limitation otherwise.
- [ ] Run `npx vitest run tests/integration/permission-tiers.test.ts`; verify assertion failures before implementation.
- [ ] Add indexed executed-transfer policy records, trusted conversion provenance and per-owner serialization. Guard legacy single-action and agent execution alike. Preserve existing authentication requirements.
- [ ] Rerun the focused test plus `tests/integration/banking-agent.test.ts` and `tests/integration/agent-expanded.test.ts`; all must pass. Review/stage only task-owned files and commit.

### Task 2: Durable safety locks and audit

**Files:** Create `tests/integration/safety-locks.test.ts`, `src/server/banking-security.ts`; generate migration `competition_safety_locks`; modify mutation boundaries identified in Task 1 and `src/server/secure-banking.ts` error mapping.

**Interfaces:** `bank_security_status() -> jsonb` returns safe `{locked, reason, expiresAt, recoveryRequired}`. Private `bank_record_denial(category, action_id)` stores owner/session-correlated events. Mutation wrappers return `{ok:false, code}` after committing a denial; nested business blocks roll back effects. Public callers cannot inject identity, incident category or unlock authority.

- [ ] Write failing tests: third failure within 10 minutes locks for 15 minutes; expired ordinary locks clear; failed business transaction retains event; another owner's counter cannot be altered; reads remain available.
- [ ] Add tamper-hold, prompt-text-without-forbidden-operation, secret-free event, replay and unauthorized-unlock tests.
- [ ] Run `npx vitest run tests/integration/safety-locks.test.ts` and verify failures.
- [ ] Implement append-only events, lock state and consistent safe envelopes. Audit rejected and successful decisions without recording credentials or arbitrary raw payloads.
- [ ] Rerun focused tests and existing `security-enforcement.test.ts`/`rls.test.ts`; review exact changed files and commit.

### Task 3: Action-bound MFA and permission UI

**Files:** Create `src/server/action-verification.ts`, `src/features/banking/action-verification.tsx`, `tests/integration/action-verification.test.ts`, `tests/component/action-verification.test.tsx`; generate migration `competition_action_verification`; modify `src/features/copilot/conversation-task-card.tsx`, private banking confirmation UI and checked API routes.

**Interfaces:** `bank_action_verification_begin(action_id uuid) -> jsonb` binds a pending grant to the current session and current authenticator timestamp. `bank_action_verification_complete(grant_id uuid) -> jsonb` requires a verified Supabase MFA event strictly newer than the bound baseline, checks immutable state and binds the result to that action. Execution consumes that grant atomically; lifetime 5 minutes. One MFA event cannot complete multiple grants. Begin serializes pending verification per owner/session. Reject if Supabase claims cannot establish a distinct verified event; never fall back to a boolean.

- [ ] Write failing integration tests for missing/stale/replayed verification, altered amount, different action/session/owner, stale state and direct RPC bypass. Two grants cannot reuse one verified event.
- [ ] Write component tests: Red requires actual challenge/verify, canceled or failed verification leaves action pending, Yellow keeps exact confirmation, public browser mode directs to private sign-in.
- [ ] Run the focused integration/component files and verify failures.
- [ ] Implement Supabase challenge/verify and refresh verified session before completing the grant. Keep codes ephemeral in the verification form. Show tier/reason and readable denial in the existing chat log.
- [ ] Run focused files, `npm run typecheck` and banking API tests; commit only reviewed changes. Mark physical authenticator validation as pending until a person performs it.

## Delivery B: Recoverable workflows

### Task 4: Persist and advance dependency graphs

**Files:** Create `src/server/banking-workflows.ts`, `src/agent/workflow-contracts.ts`, `tests/integration/banking-workflows.test.ts`; generate migration `competition_workflows`; modify `src/server/banking-conversation.ts` and `src/server/agent-conversation-operations.ts`.

**Interfaces:** `bank_workflow_create(conversation_id uuid, expected_revision integer) -> jsonb` derives a graph from the stored validated draft. `bank_workflow_command(workflow_id uuid, expected_revision integer, command text) -> jsonb` accepts `advance|pause|resume|cancel_remaining`. Each call advances at most one ready node. Limit 20 nodes/40 edges; reject cycles, foreign/missing prerequisites and unsupported node types. Nodes bind existing immutable actions and stable idempotency keys; changes still use Tasks 1–3 policy.

- [ ] Write failing tests for cycles, graph limits, missing dependencies, failed prerequisite blocking, foreign ownership and stale workflow revisions.
- [ ] Test request loss after atomic node commit, reload and duplicate advance: exactly one ledger effect. Test pause/cancel between steps preserves prior receipts and never executes descendants.
- [ ] Run `npx vitest run tests/integration/banking-workflows.test.ts`; verify failures.
- [ ] Implement indexed owner-bound graph/checkpoint tables, checked RPCs and bounded advancement with row locking. Persist node result and effect in one transaction. Do not hold a database transaction across model/network calls.
- [ ] Run focused and existing conversation integration tests; review and commit task-owned files.

### Task 5: Approved compensation and conversation controls

**Files:** Create `src/server/workflow-recovery.ts`, `src/features/copilot/workflow-panel.tsx`, `tests/integration/workflow-recovery.test.ts`, `tests/component/workflow-panel.test.tsx`; generate migration `competition_workflow_recovery`; modify `src/features/copilot/conversation-panel.tsx` and private conversation client.

**Interfaces:** `bank_workflow_recovery_prepare(workflow_id uuid, expected_revision integer) -> jsonb` returns an immutable reverse-dependency compensation proposal with source receipts/preconditions. `bank_workflow_recovery_execute(action_id uuid) -> jsonb` uses the same exact approval, policy and MFA gates as other actions. Unsupported effects return `MANUAL_REVIEW_REQUIRED`.

- [ ] Write failing tests for reverse dependency order, duplicate recovery, later balance/state changes, insufficient funds, unknown effects, cross-owner receipts and unsafe external cancellation. Original ledger entries must remain.
- [ ] Component tests assert pause/resume/cancel/recovery controls, readable committed effects and recovery approvals stay attached to their chat turn without moving older cards.
- [ ] Run focused files and verify failures.
- [ ] Implement only compensation types whose inverse is proven against existing action semantics; all others require manual review. Revalidate every resume against current state and outstanding handoff.
- [ ] Run workflow, recovery and conversation component suites; typecheck; review and commit.

## Delivery C: Human takeover and final proof

### Task 6: Real operator inbox and handoff

**Files:** Create `src/server/operator-inbox.ts`, `src/features/support/operator-inbox.tsx`, `app/operator/page.tsx`, checked `app/api/support/` routes, `tests/integration/operator-inbox.test.ts`, `tests/component/operator-inbox.test.tsx`; generate migration `competition_operator_inbox`; modify `src/features/copilot/human-support.tsx`.

**Interfaces:** Owner RPCs `bank_support_create(workflow_id uuid, consent jsonb, message text)` and `bank_support_reply(ticket_id uuid, expected_revision integer, message text)` return durable ticket state. Operator RPC `bank_operator_command(ticket_id uuid, expected_revision integer, command text, message text)` accepts `claim|reply|propose|release|resolve`; requires MFA, role and active assignment. Claims expire after 30 minutes and explicit reclaim is audited. Inbox lists only redacted claimable summaries; ticket context requires assignment. Owners see only their tickets.

- [ ] Write failing tests for ticket persistence/reload, owner isolation, anonymous/self-role denial, unassigned context reads, competing claims, expired assignments, revoked roles and release after revocation.
- [ ] Test takeover pauses execution, operator proposals cannot execute customer actions, and only an explicit valid release permits customer resume after state validation.
- [ ] Run focused files and verify failures.
- [ ] Implement RLS/indexes, administrative role provisioning instructions and consent-filtered context. Do not grant any real account a role automatically. Replace local fake-success support submission with persisted result and truthful queue status.
- [ ] Run inbox/RLS/component tests and typecheck; review/commit changed files. Prepare staffing instructions with the actual account identity still required.

### Task 7: Submission evidence, integration and rollout package

**Files:** Create `docs/security/competition-evidence.md`, `docs/security/live-acceptance.md`, `docs/security/known-risks.md`, `tests/e2e/competition-security.spec.ts`; update submission README/architecture references and approved spec status.

**Interfaces:** Evidence matrix contains requirement, enforcing file/RPC, test name/result, environment, timestamp and outstanding live check. Do not describe mocked JWT tests as completed authenticator verification or a certified penetration test.

- [ ] Add end-to-end judge flows: Green query, Yellow exact confirmation, Red challenge, lock/recovery and customer/operator handoff. Use dedicated fictional accounts; never brute-force production or request secrets in chat.
- [ ] Run focused suites, then `npm test`, `npm run typecheck`, lint changed code and `npm run build`. Save machine-readable Vitest results; distinguish PostgreSQL fixture tests from hosted checks. Run migration lint in a disposable local database when available; explicitly record unavailable concurrency/hosted checks.
- [ ] Check desktop/mobile light and dark confirmation, locked-state, workflow and operator screens. Check existing voice/chat behaviour and old replies remain stable.
- [ ] Compile additive SQL review, permission/grant diff, rollback/recovery instructions and migration order. Request final production-migration approval with the concrete package; no production reset or silent role grant.
- [ ] After authorization apply approved migrations, publish only reviewed feature files using the current remote main head with a lease, verify Vercel READY and controlled hosted smoke. Ask the user to perform actual MFA and the chosen team operator to exercise takeover. Record only nonsensitive outcomes.
- [ ] Complete final evidence matrix with remaining gaps stated plainly; do not claim staffed support, real merchant payments or unattended scheduling unless actually configured and verified.

## Self-review

All approved design sections map to Tasks 1–7. The five review-focus cases each have explicit tests. New RPC contracts are defined above; existing action semantics and RLS remain authoritative. No extra provider, model key, framework or paid service is introduced. Plan review precedes implementation; final concrete production schema approval remains separate.
