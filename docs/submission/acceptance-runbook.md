# Final acceptance runbook

Use fictional balances and dedicated test accounts. The account holder enters passwords and authenticator codes directly on FU Bank. Never paste them into chat or include them in screenshots/video. These steps are **pending until observed**; automated tests do not check the boxes for you.

## Public judging smoke test — no authenticator

1. Open the root website. It should show the public Financial Overview, with one Fufu composer, rather than force sign-in.
2. Start a new Fufu conversation. Ask: “What are my available CNY and SGD balances?” Compare with the displayed accounts; do not assume the seed values after changes.
3. Ask: “If I spend IDR 10000 today, can I still pay SGD 100 tomorrow?” Expect separate currency calculations, record date and missing-budget caveats; no automatic conversion or payment.
4. Open **Explore subscription history → Load fictional sample history**. This explicitly adds fictional historical charges. Ask: “Find recurring payments and show the confidence and supporting transactions.” Expect confidence/reasons, dated charges, capability and source limits inside that reply.
5. Send another message. Earlier subscription evidence must stay with its original reply. No duplicate composer should appear.
6. Ask: “Plan Spotify tomorrow and cancel Taobao 88VIP next week. Do not make changes.” Expect a plan and missing price/date questions, with no claimed merchant purchase or cancellation.
7. Choose a card task, fill missing details, and inspect **Review this change** without opening Banking details. Reject the exact change. No successful effect should be reported.
8. Test desktop/mobile and light/dark. Prepare voice once before judging; dictate, stop, edit and explicitly send. A voice transcript must never approve an action.

## Real sign-in and exact execution

1. Sign in at `/login`, verify the actual authenticator at `/security`, then open `/banking`. `/overview` is not this protected ledger. Initialize fictional accounts only if prompted; do not reset existing data.
2. Record starting balances privately. Use **Send money** to prepare a small immediate CNY transfer between two owned accounts. Inspect source, destination and amount. Reject once; confirm no ledger movement.
3. Prepare a new transfer. Complete any requested verification, then explicitly confirm its exact details. Refresh the page. Expect one debit, one credit and one corresponding receipt/audit entry; refreshing/retrying must not duplicate it.
4. Prepare a card freeze (Red). Confirmation must remain disabled until the new action-bound verification completes. Enter the fresh authenticator code directly into the website after the action is bound. Confirm once, reload and verify frozen state and receipt. If restoring the card, review and approve a separate unfreeze.
5. Download the owner's security history. Retain nonsensitive event types/timestamps, result and receipt IDs for the report. Do not export secrets or publish personal identifiers.

## Threshold and negative checks — dedicated test environment

Use an isolated Supabase project for deliberate denials, competing-session tests and safety-lock exercises. Never brute-force live sign-in or authenticator endpoints. With recorded daily usage, test at and above cumulative CNY 100000 minor units, including tuition; expected classifications are Yellow at the inclusive boundary and Red above it. Yellow still requires the private session/MFA baseline and exact confirmation. Test simultaneous separate database sessions, expired/cross-session/replayed grants and changed state. Retain actual results and environment identifiers without credentials. Existing PGlite tests cover these cases as automated fixtures, not as real hosted concurrency proof.

## Workflow interruption and recovery

1. On `/banking`, create two supported ready tasks using explicit details (for example a small own-account transfer and a budget edit). Do not use merchant checkout or future scheduling.
2. Create a workflow from the ready tasks. Inspect node order/dependencies. Advance to prepare the next node, pause and reload. Nothing should execute or advance while paused.
3. Resume, refresh/review the exact next action and confirm it through its required tier. Reload: the completed node/receipt must remain and must not replay.
4. Reject or cancel remaining work. Only eligible completed effects offer **Review reversal**; it creates a new compensating action. Approve it separately and verify the original and compensation remain in history. Accept manual-review refusal if later state prevents a safe inverse.

## Genuine customer/operator handoff — two sessions

1. Customer session A: sign in, verify MFA and create a support request at `/support` or from the workflow panel. Review consent and share only intended context. Save the ticket ID; reload to verify persistence. Workflow takeover should pause further execution.
2. Operator session B: sign in using the already-provisioned team operator account, verify MFA and open `/operator`. Claim the request, review allowed context and reply. The queue is not visible to ordinary nonoperator accounts.
3. Customer A: reload the ticket and verify the operator message. Operator B releases the handoff when finished. Customer A refreshes and revalidates the workflow before resuming; an operator cannot approve the customer's financial action.
4. Record nonsensitive ticket state transitions and screenshots. Do not include private email addresses in the public submission.

## Acceptance record template

| Check | Date/environment | Observed result | Nonsensitive evidence | Pass/fail |
|---|---|---|---|---|
| Actual TOTP enrollment/sign-in | Configuration previously verified | Enrollment exists; execution acceptance separate | Do not record QR/code | Setup verified |
| Exact protected transfer + reload/replay | Pending | | | Pending |
| Fresh action-bound Red verification + receipt | Pending | | | Pending |
| Workflow pause/reload/resume | Pending | | | Pending |
| Approved compensation | Pending | | | Pending |
| Customer/operator claim/reply/release | Pending | | | Pending |
| Dedicated concurrent-session / safety-lock test | Pending | | | Pending |

If a check fails, retain the actual error and stop that action rather than repeatedly retrying. Check activity before retrying an uncertain execution. Report the failure; do not replace it with synthetic production audit events.
