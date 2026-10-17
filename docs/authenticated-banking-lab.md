# Authenticated Banking Lab

## Purpose

This is a **persistent, private simulation**, not a bank. No customer deposits, real debit cards, live market orders, loan products, or payment rails are involved. The unauthenticated competition prototype remains separate at `/overview`. Signed-in users access the server-backed prototype at `/banking`.

## User flow

1. Visit `/register`. Register using email and a long, unique password. Complete Supabase email confirmation if required.
2. Sign in through `/login`; you are redirected to `/banking`.
3. Select **Create fictional banking portfolio**. This idempotently seeds only the signed-in user's demo state.
4. Review balances in CNY, USD, SGD and IDR. Create transfers between owned accounts, set budgets and card limits, mark tuition paid, cancel subscriptions or invest in fictional products.
5. **Review** creates a server-stored, immutable proposal for 10 minutes. A separate **Approve** or **Reject** click invokes a PostgreSQL transaction. All current balances and ledger entries are re-read after execution.
6. The AI tab drafts typed actions. Each action requires its own review and human approval. The AI never executes RPC writes.

## Database guarantees

- `public.sim_*` tables are RLS-protected and grant authenticated users only `SELECT`. The `anon` role receives no grants.
- Privileged writes are confined to three private-schema functions with explicit `auth.uid()` ownership, exposed via narrow invoker RPC wrappers: `sim_initialize`, `sim_prepare`, `sim_execute`.
- Execution is atomic. The proposal is locked, owner checked, expiry checked, and the user's state version serialized. Stale plans are rejected.
- Every executed proposal gets a single server-generated action ID, a result record and an audit event. Retrying the same action ID returns the original recorded result.
- Internal transfers use matching currencies and make paired debit/credit ledger entries. Insufficient funds abort execution.
- Rejecting a proposal records a rejection without changing balances. Investment orders are fictional only.
- The server checks valid Supabase claims, and mutation endpoints reject cross-origin requests.
- Every query is owned by the signed-in user. No service-role key is used in the Next.js browser or banking API routes.

## Optional OpenAI model integration

`OPENAI_API_KEY` can be configured as a **server-side encrypted or sensitive Vercel environment variable**. Do not paste it into chat, public files, or browser code. Set `OPENAI_MODEL` to a reviewed model ID available to that account.

Without the key, the agent works in deterministic mode. With the key, the server sends only fictional account IDs and amounts, permitted sandbox resources, and the current user prompt. The model must return allowlisted JSON proposals, which are validated against the user's currently owned account records. Invalid or unknown proposed actions are dropped. The server has no path for the model to directly approve or execute an action.

**Model API use may incur cost** depending on provider pricing; the app does not configure a key or purchase usage automatically.

## Deployment

- GitHub Actions runs lint, typecheck, unit/integration tests including PGlite/RLS and owner isolation, Next build, then desktop/mobile Playwright tests.
- Apply the checked-in migration `20261017163635_authenticated_simulation.sql` to project `geqamggjfmkcvjuaokzz` before promoting an authenticated deployment.
- Confirm migration history and security advisors; test two separate signed-in accounts and the email registration flow against the deployed project.
- The public demo at `/overview` must remain accessible while all `/banking` pages and `/api/banking/*` remain authentication-gated.

## Scope still outside this prototype

External money rails, AML/KYC, real loan origination, bank statements, regulatory reporting, encrypted customer documents, automatic recurring transfers, live remittances, broker execution, and customer production onboarding are intentionally excluded. For a real-money financial product, licensing/partnerships, compliance, pen-testing, incident response and stronger auth would be required.
