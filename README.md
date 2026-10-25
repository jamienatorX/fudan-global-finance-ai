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

Fufu supports task forms, deterministic interpretation for supported requests, and optional live interpretation through server-only OpenAI or OpenRouter adapters. The hosted public conversation uses the configured free OpenRouter model; no paid fallback is enabled. Configure `BANK_AGENT_MODE=live`, `BANK_AGENT_PROVIDER`, and the matching server-only provider key/model variables. Website visitors do not supply API keys. A model proposes typed intents; application tools calculate, validate, request exact confirmation and execute supported simulated changes.

The migrations `supabase/migrations/20261021000100_connected_agent.sql` and `supabase/migrations/20261022000100_agent_all_features.sql` must be applied to the intended database before using signed-in agent endpoints. Local implementation and test results do not imply that a production database or deployment has been updated. Full competition compliance has not been established from the partial requirement screenshots.

See [Authenticated Banking Lab](docs/authenticated-banking-lab.md) and [Simulation Guide](docs/competition-demo-guide.md).


## Voice input

Fufu offers on-device Chinese/English streaming dictation and an explicit standard Whisper fallback. Press Speak to Fufu, wait for Listening, speak, Stop, then review the editable transcript before Send. Names, currencies and amounts can be misrecognized. Speech never automatically submits or approves an action.

First use downloads approximately 211 MB of pinned speech assets, which the browser may cache. Production builds prepare and verify static shards automatically. For local development run `npm run prepare:voice` before trying live dictation. No speech API key or always-on speech backend is required.

## Submission walkthrough

See [the current walkthrough](docs/competition-demo-guide.md) and [submission review](docs/submission-review-2026-10-25.md). Public financial values are fictional; authenticated sign-in/MFA is a separate flow.
