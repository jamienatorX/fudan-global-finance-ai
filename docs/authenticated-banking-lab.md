# Authenticated Banking Lab

## Purpose

This is a **persistent, private simulation**, not a bank. No customer deposits, real debit cards, live market orders, loan products, or payment rails are involved. The unauthenticated competition prototype remains separate at `/overview`. Signed-in users access the server-backed prototype at `/banking`.

## User flow

1. Visit `/register`. Register using email and a long, unique password. Complete Supabase email confirmation if required.
2. Sign in through `/login`; you are redirected to `/banking`.
3. Select **Create fictional banking portfolio**. This idempotently seeds only the signed-in user's demo state.
4. Review balances in CNY, USD, SGD and IDR. Create transfers between owned accounts, set budgets and card limits, mark tuition paid, cancel subscriptions or invest in fictional products.
5. **Review** creates a server-stored, immutable proposal for 10 minutes. A separate **Approve** or **Reject** click invokes a PostgreSQL transaction. All current balances and ledger entries are re-read after execution.
6. All changes are initiated manually in the banking UI. The AI tab and AI planning endpoints are intentionally disabled while a no-cost model option is being evaluated.

## Database guarantees

- `public.sim_*` tables are RLS-protected and grant authenticated users only `SELECT`. The `anon` role receives no grants.
- Privileged writes are confined to three private-schema functions with explicit `auth.uid()` ownership, exposed via narrow invoker RPC wrappers: `sim_initialize`, `sim_prepare`, `sim_execute`.
- Execution is atomic. The proposal is locked, owner checked, expiry checked, and the user's state version serialized. Stale plans are rejected.
- Every executed proposal gets a single server-generated action ID, a result record and an audit event. Retrying the same action ID returns the original recorded result.
- Internal transfers use matching currencies and make paired debit/credit ledger entries. Insufficient funds abort execution.
- Rejecting a proposal records a rejection without changing balances. Investment orders are fictional only.
- The server checks valid Supabase claims, and mutation endpoints reject cross-origin requests.
- Every query is owned by the signed-in user. No service-role key is used in the Next.js browser or banking API routes.

## AI features paused

The AI Copilot, optional OpenAI integration and natural-language planning API have been removed from the current application. No AI API key is needed or configured. The historical implementation is recoverable from Git history if an acceptable free model solution becomes available.

## Deployment

- GitHub Actions runs lint, typecheck, unit/integration tests including PGlite/RLS and owner isolation, Next build, then desktop/mobile Playwright tests.
- Apply the checked-in migration `20261017163635_authenticated_simulation.sql` to project `geqamggjfmkcvjuaokzz` before promoting an authenticated deployment.
- Confirm migration history and security advisors; test two separate signed-in accounts and the email registration flow against the deployed project.
- The public demo at `/overview` must remain accessible while all `/banking` pages and `/api/banking/*` remain authentication-gated.

## Scope still outside this prototype

External money rails, AML/KYC, real loan origination, bank statements, regulatory reporting, encrypted customer documents, automatic recurring transfers, live remittances, broker execution, and customer production onboarding are intentionally excluded. For a real-money financial product, licensing/partnerships, compliance, pen-testing, incident response and stronger auth would be required.
