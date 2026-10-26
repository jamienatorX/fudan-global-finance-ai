# Competition requirement coverage

Baseline: [official Domestic Banking AI Agent challenge](https://fintechathon.g-ican.com/), captured 27 October 2026. The official brief requires at least three core scenario families; it does not justify claiming every listed subfeature is complete.

| Requirement | Implemented prototype behavior | Remaining limit / evidence |
|---|---|---|
| Natural financial intent and context | English/Chinese intent drafts, follow-up edits, task picker, grounded answers, combined affordability | Supported patterns have deterministic fallback; broad language needs available provider |
| Smart transfers | Recipient simulation in public mode; private immediate own-account transfers, exact review and cumulative policy | Private external beneficiaries/phone transfer, automatic scheduling and split-bill collection not complete |
| Bill analysis | Recorded monthly consumption categories, budgets and cash scenarios | Annual reports and statistical anomaly detection not implemented; history annotations are not an anomaly model |
| Wealth operations | Fictional product/risk checks, approved buy/redeem and ledger effects | No real investment execution, suitability certification or market feed |
| Card management | Fictional freeze/unfreeze and monthly limits; private checked approvals | No physical issuing, real card application or full loss-reporting integration |
| Subscription/direct debit | Settled-transaction detection, confidence/reasons, projected renewal window, registered capability, supported simulated cancellation | No merchant purchase API, real merchant cancellation or background renewal notification delivery |
| Cross-scenario orchestration | Multiple editable tasks, stored dependency workflows, pause/reload, checked steps and conservative compensation | No unattended scheduler, external shopping or birthday order fulfilment |
| Green/Yellow/Red permissions | Database policy, inclusive cumulative ¥1,000 threshold, exact approval and action-bound MFA | Real hosted end-to-end action acceptance remains pending; automated fixture tests are separate evidence |
| Safe execution and audit | Atomic checked mutations, replay/stale guards, immutable receipts, durable security events | No formal audit certificate; competing real PostgreSQL sessions still need dedicated acceptance |
| Interruption/recovery | Stored checkpoints, pause/resume/cancel, inverse proposals for supported effects | Not arbitrary rollback; manual review for incompatible later state |
| Human takeover | Persistent customer queue, explicit operator membership, scoped claims, consent and release | Operator role configured; real two-session ticket exercise still pending |
| Suspicious behavior lock | Sensitive-failure threshold and tamper hold enforced in checked database path | Test controlled failures in a disposable project, not live login brute force |
| Generated-code sandbox | No generated code accepted or executed; fixed typed tool registry only | Separate monitored code runtime not built; organiser interpretation must be confirmed |
| Source/deployment/tests | Repository, Vercel site, migrations, reproducible tests and this package | Hosted release and dated test status in verification record |
| Brief, technical/security report | Included in this folder | Portal formatting/required fields must be checked by account holder |
| ≤10-minute presentation; ≤5-minute video | Assigned to team member | Not produced or uploaded by this package |

Recommended minimum judging scope: bill analysis, subscriptions and card controls. Wealth and transfers provide additional supported demonstrations when their limitations are explained. Treat all finances as fictional, including those persisted behind real authentication.
