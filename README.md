# 福 bank

An international-student finance **simulation** built with Next.js 16, React 19, TypeScript, Supabase Auth/PostgreSQL/RLS and Vercel.

**AI banking features are intentionally paused.** The current application makes **no LLM API calls**, needs **no AI API key**, and does not offer an AI assistant, agent, prompt-to-action planner, or AI banking endpoint. The prior implementation is retained in Git history for possible future reintroduction if an affordable AI model is selected.

## Features active now

- Multi-currency fictional account balances (CNY, IDR, USD, SGD).
- Simulated, approval-gated transfers and transaction history.
- Spending summaries, categories and read-only CSV import preview.
- Simulated virtual card freeze/limits, subscriptions, fictional investments, tuition, monthly budgets and cash-runway calculations.
- FX **reference-only** conversions using labeled illustrative fallback data.
- Public, browser-local simulation at `/overview` with reset under `/settings`.
- Phase 6 manual banking walkthrough at `/showcase`, showing live fictional account state, eight module links and safe operation explanations.
- Authenticated Supabase banking simulation at `/banking`, with server-checked approval, expiry, atomic database writes, audit logs and persistent owner-isolated fictional accounts.

No actual deposits, real payment rails, card issuing, securities or bank credentials are involved. Financial data in the public demo is local to the user's browser; data in the authenticated sandbox persists in Supabase.

## Run the application

Use Node 24:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Optional browser checks: `npx playwright install chromium && npm run test:e2e`.

For unconfigured local development, `PLAYWRIGHT_DEMO_MODE=1 npm run dev` enables public demo pages only in development. Hosted public demo UI pages require `COMPETITION_PUBLIC_DEMO=1`; private banking endpoints remain authenticated.

## Reintroducing AI later

The AI work is not active in this release. It can be recovered from <https://github.com/jamienatorX/fudan-global-finance-ai/pull/3> or the Git history rather than being rebuilt from scratch. Until a model is connected and a full agent journey is validated, **this version should not be represented as satisfying an AI-agent competition requirement**.

See [Authenticated Banking Lab](docs/authenticated-banking-lab.md) and [Simulation Guide](docs/competition-demo-guide.md).

