# Competition requirement coverage

Updated 29 October 2026. Historical test counts are release-specific. All financial effects remain fictional.

Baseline: [official Domestic Banking AI Agent challenge](https://fintechathon.g-ican.com/), captured 27 October 2026. The official brief requires at least three core scenario families; it does not justify claiming every listed subfeature is complete.

| Requirement | Implemented prototype behavior | Remaining limit / evidence |
|---|---|---|
| Natural financial intent and context | English/Chinese intent drafts, follow-up edits, task picker, grounded answers, combined affordability | Supported patterns have deterministic fallback; broad language needs available provider |
| Smart transfers | Verified fictional beneficiaries by name/phone/remark, immediate and scheduled transfers, split requests, exact review and cumulative policy | Split requests do not collect real payments; no real banking rails |
| Bill analysis | Monthly/yearly reports, transaction evidence, categories, budgets and cash scenarios; validated normalized CSV preview/import approval | Historical flags are not a certified anomaly model; not every Alipay/WeChat export format is supported |
| Wealth operations | Educational scored suitability, fictional product comparisons, approved buy/redeem and ledger effects | No real investment execution, suitability certification or market feed |
| Card management | Simulated issuance, freeze/unfreeze, loss/restoration and transaction restrictions under checked approvals | No real card issuer or settlement integration |
| Subscription/direct debit | History-based detection, supporting evidence, renewal notices in app and confirmed simulated cancellation | No real merchant cancellation or external notification delivery |
| Cross-scenario orchestration | Stored DAG workflows, scheduled mandates, birthday funds reservations, flower/cake simulated tasks, pause/reload and conservative compensation | Hosted cron enabled; no real merchant fulfilment. Invocation success alone does not prove every due job executed |
| Green/Yellow/Red permissions | Database policy, inclusive cumulative ¥1,000 threshold, exact approval and action-bound MFA | Hosted Red transfer passed 29 October with user-entered action MFA, exact approval, two ledger entries, one consumed grant and one evidence record |
| Safe execution and audit | Atomic checked mutations, replay/stale guards, immutable receipts, durable security events | Eight independent PostgreSQL concurrency checks passed; no formal audit certificate |
| Interruption/recovery | Stored checkpoints, pause/resume/cancel, inverse proposals for supported effects | Not arbitrary rollback; manual review for incompatible later state |
| Human takeover | Persistent customer queue, explicit operator membership, scoped claims, consent and release | Operator role configured; real two-session ticket exercise still pending |
| Suspicious behavior lock | Sensitive-failure threshold and tamper hold enforced in checked database path | Test controlled failures in a disposable project, not live login brute force |
| Generated-code sandbox | Separate administrative isolated analysis runner: ephemeral VM, denied network, no bank credentials, resource limits and logs; seven supervisor checks passed | Not integrated into Fufu chat; SDK lifecycle mock-tested, not live-tested with production OIDC. Organiser acceptance is unconfirmed |
| Source/deployment/tests | Repository, Vercel site, migrations, reproducible tests and this package | Hosted release and dated test status in verification record |
| Brief, technical/security report | Included in this folder | Portal formatting/required fields must be checked by account holder |
| ≤10-minute presentation; ≤5-minute video | User reports both ready on 29 October | Files/durations and portal upload not independently checked |

Recommended minimum judging scope: bill analysis, subscriptions and card controls. Wealth and transfers provide additional supported demonstrations when their limitations are explained. Treat all finances as fictional, including those persisted behind real authentication.
