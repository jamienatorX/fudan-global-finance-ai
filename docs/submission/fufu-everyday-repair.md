# Fufu everyday conversation improvement — 27 October 2026

## What changed

Common complete English/Chinese information requests now use the existing recorded-data tools without waiting for a language-model response. This includes greetings/help, monthly spending, card status/limits, transaction/activity history and combined balance/budget questions. Both parts of a Chinese balance-and-budget answer are retained.

Unambiguous follow-ups such as “Use my daily account and make that 300” can edit one existing draft. The existing explicit currency is retained unless the user supplies another; the account nickname must identify one compatible existing account. Multiple unfinished financial tasks require clarification. A plain “yes” explains the review/confirmation controls and never executes anything.

Answered reads stay in their original transcript messages and evidence attachments rather than filling the unfinished financial-action queue. Existing financial drafts and receipts remain intact.

The parser passes unhandled requests intact to the interpreter. It does not turn bills due into historical spending, discard an unsupported filter or reporting period, or silently combine currencies. Monthly transaction wording preserves the month filter. Card/budget/investment amount corrections cannot relabel foreign currency as CNY; the card compiler also checks this boundary for model-origin drafts.

## Verification

- The initial 25-case controlled provider-outage run reproduced 18 failures and 7 passes. It was a targeted regression set, not a general-language accuracy benchmark.
- The repaired everyday suite has **38 passing tests**, including thirteen additional queue, money-validation, mixed-intent and qualifier regressions.
- Full regression on the final source: **580/580 passed**, zero failures.
- Production build, including TypeScript and pinned voice-asset preparation: passed. Changed-code lint: passed.
- Independent review found currency relabelling and discarded qualifiers. Both were reproduced, repaired and rechecked; all 38 focused tests passed in the reviewer's final run.
- Machine-readable verification: [fufu-everyday-verification.json](evidence/fufu-everyday-verification.json).

Live production checks are recorded separately after the verified commit reaches Vercel READY. The existing [acceptance runbook](acceptance-runbook.md) still governs genuine private MFA/workflow/operator acceptance; this repair does not certify those journeys.

## Try these questions

- “Hi Fufu!”
- “What can you help me with?”
- “How much have I spent this month?”
- “查看我的余额和预算”
- “Show monthly transactions”
- “Show my cards and their limits”
- After creating one transfer draft: “Use my daily account and make that 300”. Review the resulting exact change; no money moves from the correction itself.

## Limits

This is bounded deterministic interpretation alongside the existing live model, not unrestricted conversational understanding. Unusual wording and complex or unsupported requests can still need the configured free provider and clarification. No paid fallback, new merchant connection, database migration, unattended scheduler or authentication relaxation was added. Public finances remain fictional, and historical evidence is not execution authority.
