# Fudan Global Finance AI

An AI-native **simulated** student banking competition prototype built with Next.js 16, React 19, TypeScript, Supabase schema/RLS, and Vercel.

## Features

- Multi-currency fictional accounts (CNY, IDR, USD, SGD) and transaction reporting
- Simulated transfers, cards, subscriptions, investment orders and student budget/tuition controls
- Deterministic natural-language command interpretation, independently approved proposals and audit trail
- Fictional FX reference quotes, budget/tuition cash-runway forecasting, export-safe CSV validation preview
- Judge walkthrough at `/competition`, including reset at `/settings`
- Browser-local demo persistence; *no real banking connectivity*

## Development

Use Node 24.x:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Optional browser tests: `npx playwright install chromium && npm run test:e2e`.

For unconfigured local development, `PLAYWRIGHT_DEMO_MODE=1 npm run dev` enables demo pages in development. In hosted environments, `COMPETITION_PUBLIC_DEMO=1` exposes only the explicitly allowlisted fictional screens. Protected backend routes stay gated. Never set real financial credentials in the demo or use this project to move real funds.

See [the judge demonstration guide](docs/competition-demo-guide.md) for instructions and limitations.
