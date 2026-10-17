# Fudan Global Finance AI — Competition demo guide

## What this version is
A fictional international-student finance prototype. It demonstrates six domestic AI banking scenarios, FX reference calculations, student planning, browser-local financial state, human approvals and explainable deterministic agent proposals. It is **not a real financial institution, bank account, transfer service, or investment broker**.

## Open and reset
Open `/competition` from the product sidebar. Public demo access is explicitly opt-in through the server environment variable `COMPETITION_PUBLIC_DEMO=1`, and is restricted to allowlisted fictional UI routes. The hosted Supabase schema and private APIs remain independent from this browser-local demo. If the demo has already been modified, open Settings, type `RESET DEMO`, and confirm.

## Flagship demonstration
The default command is:

> Pay my CNY 5,000 tuition installment, reduce my shopping budget by 20%, cancel my unused video subscription, and show my remaining cash runway.

The plan proposes **three independent actions**. Check each action you approve, then select **Execute only selected approved simulations**.

From the original seed:
- Tuition: **CNY 5,000**, from the fictional CNY daily account, reducing that account from CNY 18,650 to CNY 13,650.
- Shopping: monthly cap **CNY 580 → CNY 464**, saving **CNY 116** in the plan.
- Video subscription: **CNY 68/month**, simulated cancellation.
- Planned monthly cash outflow declines by **CNY 184** overall when both savings measures apply.
- The FX and runway calculations clearly identify the demo reference rates and the one-off tuition obligation.

The plan lists every executed, rejected and failed action. Approved simulated changes affect Overview, Accounts, Transactions, Planner, Subscriptions and Audit. Reloading preserves results within the same browser using localStorage.

## Other example commands
- `Analyze my spending`: read-only CNY consumption report, excluding internal transfers and investments.
- `Transfer CNY 800 to Zhang Wei`: recipient-specific fictional transfer proposal.
- `Freeze my card`: card-control proposal.
- `Compare low risk funds`: fictional product descriptions, without executing an order.
- `Show my remaining cash runway`: reference runway with input figures.

## What judges should check
1. Rejected actions are never executed.
2. An insufficient available balance fails without modifying the ledger.
3. Duplicate IDs cannot debit twice.
4. FX source, reference date and fallback label remain visible.
5. Browser-local approval expires after ten minutes or becomes stale when demo version changes.
6. All actions are simulations, and resetting the demo starts from exactly the same fixtures.

## Known scope boundaries
This version's mutations are client-side and browser-local. They are **not protected by server-authoritative approval tokens, bank-grade authorization, or persistent Supabase RPC mutation transactions**. The existing Supabase schema has RLS but is not the writer for this competition state. Browser devtools and localStorage are user-controlled; the approval flow illustrates product UX, not a security guarantee. The default FX fixtures are illustrative and not current market quotations. Scheduled transfers are recorded for demo display but are not automatically executed. A real financial release requires secure server-side identity, ledger invariants, signed approvals, custody/payment partners, rate sourcing, idempotency on the server, privacy review, and independent security and accessibility testing.
