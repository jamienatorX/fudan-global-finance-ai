# 福 bank

An international-student finance **simulation** built with Next.js 16, React 19, TypeScript, Supabase Auth/PostgreSQL/RLS and Vercel.

**Fufu is the connected banking assistant.** Choose a task or explain a request naturally. Fufu keeps editable drafts, calculates cash and budget impact, and uses the existing approval engine for supported changes. Each exact change requires confirmation; unsupported merchant payments are declined. The public demo uses fictional finances, a shared conversation store and the free Nemotron model when configured. Free providers may collect demo messages; use invented details only. Signed-in banking remains owner/session/MFA scoped. See [Connected Agent Guide](docs/connected-agent.md) and [Hosted Release](docs/fufu-production-release.md).

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

## Connected agent

The default scripted interpreter needs no model key. Optional signed-in live interpretation uses a server-only OpenAI Responses adapter with validated intent output. It requires explicit `BANK_AGENT_MODE=live`, `OPENAI_API_KEY` and a compatible `OPENAI_AGENT_MODEL`. A configured model proposes intents; application tools calculate, validate, request confirmation and execute. The browser-local demo always stays scripted.

The migrations `supabase/migrations/20261021000100_connected_agent.sql` and `supabase/migrations/20261022000100_agent_all_features.sql` must be applied to the intended database before using signed-in agent endpoints. Local implementation and test results do not imply that a production database or deployment has been updated. Full competition compliance has not been established from the partial requirement screenshots.

See [Authenticated Banking Lab](docs/authenticated-banking-lab.md) and [Simulation Guide](docs/competition-demo-guide.md).

