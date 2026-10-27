# Fufu everyday conversation repair plan and execution record

> **For agentic workers:** Use superpowers:executing-plans for remaining verification and release tasks. This is a bounded repair under the previously approved Fufu conversation design, not a new banking capability or authentication change.

**Goal:** Keep common questions and unambiguous draft corrections useful when the free interpreter is unavailable, without silently discarding another request or granting execution authority.

**Architecture:** Reuse the existing typed read tools and draft compiler. Add narrow complete-message information and correction interpreters. Preserve answers/evidence on their original messages; retain unfinished financial drafts independently of answered reads.

**Tech stack:** Existing TypeScript agent/controller and Vitest; existing Next.js/Supabase/Vercel integration. No new dependency, paid model or migration.

**Spec:** The approved 22 October Fufu conversational design (task choices, English/Chinese, follow-up edits, grounded calculations and explicit confirmation), existing `docs/connected-agent.md`, and the user's 27 October request to improve Fufu before submission.

## Constraints

- No generated text, greeting, “yes” or voice transcript authorizes a banking action.
- Never choose a default recipient/source/currency. An existing draft's explicit currency may be retained; a funding nickname must identify one compatible existing account.
- Unsupported or mixed intent remains intact for interpretation/clarification; do not accept only its recognized part.
- Existing owner/session/MFA, expiry, storage, amount validation and exact review remain required.
- Historical replies remain in the transcript. Only answered read entries are removed from the unfinished draft queue.

## Tasks

- [x] Investigate the current local fallback and tool dispatch. Reproduce failures before changing behavior.
- [x] Add `tests/unit/fufu-everyday-conversation.test.ts`: initial 25-case controlled provider-outage run had 7 passes and 18 failures. Add thirteen further queue/amount/embedded-intent/qualifier cases as regressions are found.
- [x] Implement `conversation-information.ts`: complete greeting/help/thanks/confirmation guidance and bounded English/Chinese information requests; reuse existing deterministic tools, including multiple supported reads.
- [x] Implement `conversation-corrections.ts`: edit one unambiguous existing draft's amount/funding source; reject malformed money and embedded unhandled instructions; ask when ambiguous.
- [x] Integrate through the existing fallback; correct Chinese multiple-read composition and answered-read queue accounting in the controller.
- [x] Verify focused regressions and changed-code lint. All 38 new cases pass locally.
- [x] Complete independent review, full suite (580/580), production build and required currency/qualifier corrections.
- [ ] Publish only reviewed files against current remote main with a lease; verify Vercel READY and primary alias.
- [ ] Exercise actual public chat in English/Chinese, spending/cards/history, a combined read and an unambiguous draft correction. Record actual replies and limits in the repair report.

## Acceptance boundary

Controlled provider-outage tests prove these supported paths do not need a model response; they are not a general language benchmark. Public chat remains fictional. No real private MFA/workflow/operator acceptance or merchant integration is claimed by this repair.
