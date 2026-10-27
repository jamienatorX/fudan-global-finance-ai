# Complete Banking Agent Scenarios

The user authorised implementation of the six previously listed workstreams. Extend the current authenticated sandbox in a local branch, without deploying. The public overview remains a fictional local-data preview.

## Approach
Reuse the checked PostgreSQL executor instead of creating a parallel privileged API. All new mutations use the existing six action types with explicit modes. PostgreSQL validates fields; exact approval, daily limits, action-bound MFA, owner/session isolation, stale/expiry checks and safety locks still apply.

A separate implementation would duplicate the security boundary. Live financial/merchant integrations require provider agreements and credentials, so the implementation uses labelled fictional beneficiaries, cards and birthday fulfilment. No external purchase or cancellation is claimed.

## Deliverables
- Private verified fictional beneficiaries resolved by name, fictional phone or remark; exact split-bill requests with integer remainder allocation.
- Monthly/annual currency-separated reports; median/MAD review flags using at least 10 prior same-account/currency/category observations within 90 days; evidence IDs and incomplete-history warnings.
- Educational suitability questionnaire alongside fictional product comparison.
- Virtual card application, loss/restoration, channel restrictions and daily limits, with red security changes requiring step-up verification.
- Recorded subscription renewal dates, idempotent inbox notices and existing checked cancellation.
- Persisted dated transfer mandates and birthday reservations with separate flowers/cake jobs. Owner-wide lock order serializes interactive and worker spending. Reservations apply to every money-debit path.
- Trusted database worker only: no caller-supplied user/JWT, no client execution grant. It may execute only exact previously approved CNY mandates within the current daily Yellow allowance; otherwise fresh interactive verification is required. Revoked origin sessions and safety holds block execution.
- Scheduled pause/resume/cancel; cancellation releases unspent reservations and cannot undo completed payments. Existing workflow recovery/operator handoff remains available for supported actions.
- Detailed immutable terminal authorization evidence with canonical payload, policy, approval decision, verification reference, timestamps and actual result. Denied attempts remain separately logged.

## Limits and acceptance
No arbitrary generated code is executed. The runtime accepts fixed typed tools only; code/authority fields are rejected. This prevents a code-execution path but does not claim an arbitrary-code sandbox.

PGlite is functional SQL/RLS evidence, not simultaneous PostgreSQL session or real Supabase Auth evidence. Physical MFA, hosted cross-session acceptance, staffing, cron installation and provider integrations remain labelled separately. No production database is altered by this change.
