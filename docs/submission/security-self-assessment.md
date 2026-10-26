# Security self-assessment and known risks

Assessment date: 27 October 2026. This is a developer self-assessment of a fictional banking prototype, **not** a bank licence, compliance certification, independent penetration test or proof that every hosted acceptance case has passed.

## Assets and trust boundaries

Protected assets include authenticated fictional balances/ledger, pending approvals, authenticator/session state, conversation ownership, support consent, operator membership and audit evidence. Untrusted inputs include user/model text, browser snapshots, imported files, merchant descriptions and voice transcripts. External model providers are a separate data-processing boundary. The public browser simulation intentionally allows local fictional state and must not be used as security evidence for the authenticated engine.

## Control and evidence matrix

| Threat / requirement | Implemented enforcement | Reproducible evidence | Remaining check |
|---|---|---|---|
| Cross-owner reads or writes | RLS, authenticated owner checks, scoped RPC wrappers and private helpers | `tests/integration/rls.test.ts`, `security-enforcement.test.ts`, `secure-banking-rpc.test.ts` | Hosted catalog review supplements fixtures; no unauthorised customer probing |
| Forged model instructions / prompt injection | Strict allowlisted intent schema, no authority flags, deterministic calculations, separate exact approval | `tests/unit/agent-conversation-model.test.ts`, `agent-conversation-controller.test.ts`, `fufu-repair-regressions.test.ts` | Semantic prompt injection may affect drafts/prose; cannot replace server authority |
| Approval bypass, replay or stale state | Stored canonical payload, owner/session binding, expiry, state/version and idempotent receipt | `tests/integration/agent-conversations.test.ts`, `banking-agent.test.ts`, `competition-adversarial.test.ts` | Actual browser reload/retry acceptance still needed |
| Daily transfer threshold bypass | Owner lock; cumulative CNY transfer/tuition usage; inclusive ¥1,000/day Yellow; greater/unknown FX Red | `permission-tiers.test.ts`, `competition-adversarial.test.ts` | Dedicated concurrent real PostgreSQL sessions not yet exercised |
| Reusing old MFA for Red action | One-use grant binds owner/session/action/payload hash/state/policy; authenticator event must postdate begin | `action-verification.test.ts`, `competition-adversarial.test.ts` | Verified TOTP enrollment exists; actual action-bound hosted execution remains pending |
| Repeated failures / tampering | Durable denied-event recording, failure threshold lock, suspicious hold | `safety-locks.test.ts`, `competition-adversarial.test.ts` | Controlled live lock acceptance belongs in disposable test environment |
| Broken workflow dependencies / retries | Persistent DAG, checkpoint, revision and owner locks, bounded one-node advance | `banking-workflows.test.ts` | Real pause/reload/resume demonstration pending |
| Unsafe rollback | New checked compensating action; original ledger preserved; conservative state validation | `workflow-recovery.test.ts` | Real approved compensation demonstration pending |
| Operator escalation | Private explicit membership, recent MFA, assignment/claim and consent scope; no customer approval privilege | `operator-inbox.test.ts`, `competition-adversarial.test.ts` | Team role configured; real customer → operator → customer exercise pending |
| CSRF / abusive request shape | Same-origin checks, bounded JSON requests, route guards and provider error handling | `tests/unit/banking-api-security.test.ts`, `competition-api.test.ts` | No claim of comprehensive load or penetration testing |
| Secret disclosure | Provider credentials server-only; public site key separate from Turnstile secret; no tokens/TOTP secrets in audit fields | `.env.example`, server adapters and repository tracked-file check | Repository/code review is not a complete historical secret scan; previously shared credentials should be replaced privately |
| Untrusted speech | On-device transcript, editable review, explicit Send, financial confirmation separate | Voice unit/component tests and live-dictation browser fixtures | Accuracy varies by accent/device/background noise; never infer financial consent from speech alone |

File names without a full prefix in the table refer to `tests/integration/`, except where stated. Current run counts and release evidence are in [verification.md](verification.md). Historical security implementation evidence is in [../competition-security-evidence.md](../competition-security-evidence.md).

## Hosted facts versus test facts

The read-only production review on 27 October confirmed a verified TOTP account, active operator membership, public-table RLS and restricted helper grants. It found no workflow or support-ticket records and no action-bound execution evidence in the security-event table at that time. Those facts demonstrate configuration, not completed end-to-end acceptance. PGlite tests use fixture JWT/MFA claims and disposable data; they do not prove physical authenticator interaction or real concurrent sessions.

## Known risks and unsupported capabilities

1. **Fictional finances only.** No real bank rails, merchant payment/cancellation API, actual securities or issuing service is connected. Public state is user-editable. Both public and private money remain simulated.
2. **Model availability and privacy.** Free providers can throttle, fail or collect permitted fictional messages. Supported deterministic reads/plans and forms reduce dependence but do not cover arbitrary language. Do not enter real customer information. No paid fallback is enabled.
3. **History quality.** Recurrence is a heuristic; merchant aliases, incomplete history and amount variability can produce false positives/negatives. Confidence is not a probability. Registered subscription records and labelled sample charges must remain distinguishable from bank ingestion.
4. **Bounded conversations.** Messages, drafts, payloads and evidence are bounded. Historical attachments are explanations, not tamper-proof execution receipts. Near the storage limit, a new conversation is required for new evidence.
5. **Limited orchestration.** No unattended future scheduler, real merchant checkout or universal rollback. Compensation can be unavailable after later state changes. Operators are a persisted queue, not a guaranteed staffed live chat.
6. **No arbitrary-code runtime.** The agent only invokes typed allowlisted tools. A separate restricted/monitored generated-code sandbox has not been built. Seek organiser interpretation rather than claiming this requirement fully satisfied.
7. **Acceptance gaps.** Real action-bound MFA/receipt, workflow/recovery, two-session operator handoff and genuine competing-session tests remain outstanding. Follow the runbook; do not create artificial production success records using administrative SQL or fixture authentication.
8. **Voice preparation.** First-use speech assets are approximately 211 MB; downloads and device performance affect startup/latency. Cache in advance and retain text input. Speech recognition is not an authenticator.
9. **Scope of assessment.** No independent security certification, full WCAG audit, sustained load test, disaster-recovery drill or formal regulatory assessment is claimed.

## Disclosure for the competition

Present implemented server enforcement and reproducible negative tests as engineering evidence. Label browser fixtures and public simulations clearly in the report/video. Capture actual private receipts only after real customer approval; redact account identifiers and never record QR setup secrets, passwords, bearer tokens or TOTP codes. Preserve known limitations in the submitted report even if the product UI uses concise language.
