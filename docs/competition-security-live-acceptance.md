# Live acceptance and known limits

Date: 26 October 2026.

1. Sign in with a dedicated fictional account, complete actual authenticator setup/verification under Security, and open /banking. Do not share QR/setup keys, passwords or TOTP codes in chat.
2. Green: ask for balances. Compare the response to recorded accounts. It cannot change balances.
3. Yellow: review an own-account CNY 10 transfer, inspect canonical amount/source/destination, reject it, then prepare a fresh transfer and confirm. Confirm exactly one two-sided ledger effect and an immutable receipt after reload.
4. Red: prepare a transfer taking today's total above CNY 1000, or review a card freeze/investment/tuition action. Confirmation stays disabled until a new authenticator challenge after binding. Verify, inspect exact details, confirm once, then check the receipt. Refresh permissions if the account changed or verification expired.
5. Workflow: ask for two supported immediate changes with explicit details. Create workflow from ready tasks. Review one node, pause, reload, and verify nothing continues automatically. Resume and confirm the exact node. Reject/cancel remaining work. Review reversal only for supported effects; accept manual review when state changed.
6. Support: send a private request with chosen consent. A request ID and queued state must persist after reload. For takeover, send from the workflow panel; it pauses the workflow until release.
7. Provision one actual team account as an operator through the project owner's trusted administrative database path, using its verified auth.users UUID. Never grant by editable user metadata, email pattern or browser request. No role was automatically provisioned by this release. Example reviewed administrative statement: insert into private.bank_operators(user_id) values ('<verified team account UUID>'). Do not paste an unresolved placeholder into production.
8. The operator signs in, verifies MFA, opens /operator, claims the request and replies. Confirm another nonoperator cannot open it. Operator releases the workflow; the customer refreshes/revalidates before resume. A proposal is advice, not a customer financial approval.
9. Controlled failure/lock exercise should use a dedicated test project/account and fictional data. Do not brute-force real login or production TOTP. Export nonsensitive audit results. Suspect holds require consented operator review and fresh owner verification; ordinary locks expire after 15 minutes.

## Remaining limitations

- Public browser-local money is intentionally fictional and is not protected as a bank ledger. Security evidence applies to the authenticated database engine.
- No real bank rails, merchant subscription payments/cancellations, card issuing, arbitrary code sandbox, unattended scheduling or formal penetration certification.
- FX without a trusted timestamped conversion is conservatively Red; this release does not treat an illustrative quote as executable evidence.
- PGlite fixtures do not prove real concurrent database sessions, physical authenticator interaction or hosted staffing. Real PostgreSQL concurrency and Auth service checks require dedicated acceptance.
- Operator support is a persistent queue. No response-time guarantee or online staff claim is made.
- Free model availability depends on provider limits. Existing deterministic tools and safe refusals remain available; no paid fallback was added.
