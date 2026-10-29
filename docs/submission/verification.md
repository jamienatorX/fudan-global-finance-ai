# Verification record — historical runs

**Latest status:** [29 October production acceptance and current limits](current-status-2026-10-29.md). The historical pending statements below describe their original dates; use the latest record for submission claims.

## Baseline review

- Reviewed production commit: `a580eba4d748e7e4177495d96b22bfd7e7c49a76`, Vercel READY at the time of review.
- Baseline full Vitest: 527 passed.
- Live public/entry review: 84 snapshots, covering 21 routes × desktop/mobile × light/dark. No application error pages, horizontal overflow, broken visible images or browser page errors observed. Private routes redirected anonymous users to sign-in. This was not a full functional or WCAG audit.
- Live balance and cross-currency read questions returned recorded values without assuming FX. Subscription/evidence language query failed with temporary service unavailability; quota exhaustion was not established as the cause.
- Hosted read-only inspection: verified TOTP enrollment and active operator membership; no workflows/support tickets or action-bound execution evidence at that time. No public privileged functions, no public tables missing RLS and no unchecked helper execution grants were found in the inspected catalog.

## Repair verification

Initial regression run reproduced three failures: model-dependent recurring query, absent in-chat evidence and collapsed ready-action review. Focused tests then passed after repairs. The final full suite, build and live release checks are recorded below when complete; do not infer completion from the baseline count.

Changes: supported recurring/evidence reads use deterministic interpretation; bounded evidence snapshots stay on their original assistant reply; a labelled fictional-history loader is available; ready task review is visible directly; repeat read refreshes reuse their draft. Model draft schema, private financial authority and exact MFA/approval remain separate.

## Final local results

- Full regression: **542/542 tests passed**, zero failures, on the final repair source.
- Production build: passed, including pinned speech preparation and TypeScript.
- Changed-code ESLint: passed without errors.
- Repair UI checks: **4/4 passed**, 1440px/390px × light/dark, using explicitly mocked conversation transport and fictional fixtures. Confirmed one composer, sample-history interaction, evidence anchoring, no page errors and no horizontal overflow. These are UI tests, not real authentication/database proof.
- Independent reviewer reproduced mixed-request and storage-size bugs; both received regression tests. Final reviewer reran 19 service-recovery tests successfully and cleared the reported findings.
- Machine-readable summaries: [automated verification](evidence/automated-verification.json), [browser UI checks](evidence/browser-ui-results.json).
- Publication uses a scoped commit based on the reviewed main revision. Production readiness and a fresh live chat check must be confirmed after Vercel finishes; the live release record accompanies the downloadable package.

## Remaining acceptance boundary

The shared in-app browser could not reach the banking site (navigation timeout). No authenticated user session was available to the agent. No real authenticator code was requested, no user was impersonated and no production success records were inserted. The account holder still needs to complete the genuine protected-action/workflow/operator checks in [acceptance-runbook.md](acceptance-runbook.md).

Presentation and video are being produced by the team member. Competition registration, organiser sandbox interpretation and final portal upload are not verified by this engineering record.

## Everyday conversation follow-up

The subsequent Fufu repair passed **580/580 tests**, build and changed-code lint. See [the repair report](fufu-everyday-repair.md) and [machine-readable evidence](evidence/fufu-everyday-verification.json) for the 38-case focused suite, independent review findings and limits. The preceding 542-test results document the earlier subscription-evidence release. Live publication is verified separately after deployment.
