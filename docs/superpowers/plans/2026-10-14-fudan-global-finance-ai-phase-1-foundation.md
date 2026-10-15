# Phase 1: Foundation and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the new repository, typed financial domain, reproducible demo state, Supabase security foundation, Figma system, responsive shell, and shared dashboard.

**Architecture:** Domain functions and repository ports are independent of React and Supabase. A demo repository supplies deterministic data for tests and local rendering, while a Supabase adapter becomes the production persistence boundary.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Supabase, Zod, Vitest, Testing Library, Playwright, Figma, GitHub

**Spec:** `docs/superpowers/specs/2026-10-14-fudan-global-finance-ai-design.md`

## Global Constraints

- Use Node.js 24 in development and CI; commit the lockfile.
- Use `fudan-global-finance-ai` for the GitHub and Vercel project slug.
- Money is integer minor units; API DTOs serialize minor units as decimal strings.
- Currencies are limited to CNY, IDR, USD, and SGD.
- The application displays a persistent “Simulated financial data” badge.
- QFin Terminal remains untouched.
- Treat the seven named open-source repositories as inspiration only; document licenses and reusable concepts before adopting anything, and never copy unverified code, assets, or branding.

## Review Focus

1. Amounts above JavaScript's safe-integer range must cross the API as strings and reconstruct as `bigint`.
2. IDR must render with zero minor digits while CNY, USD, and SGD render with two.
3. Demo reset seed totals must reproduce exactly and never duplicate rows.
4. An unauthenticated request must not read another user's records.
5. Mobile navigation must preserve access to the Copilot and simulation label.

---

### Task 1: Repository Scaffold and Money Domain

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- Create: `vitest.config.ts`, `playwright.config.ts`, `src/test/setup.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `src/domain/money.ts`, `src/domain/currency.ts`
- Test: `tests/unit/money.test.ts`

**Interfaces:**
- Produces: `CurrencyCode`, `Money`, `MoneyDTO`, `money()`, `addMoney()`, `subtractMoney()`, `compareMoney()`, `formatMoney()`, `toMoneyDTO()`, `fromMoneyDTO()`.

- [ ] **Step 1: Write the failing money-domain tests**

Test `CNY 580 × 80% = CNY 464`, `CNY 580 - CNY 464 = CNY 116`, IDR zero-decimal formatting, currency-mismatch rejection, and DTO round-tripping of a value above `Number.MAX_SAFE_INTEGER`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/unit/money.test.ts`
Expected: FAIL because `src/domain/money.ts` and `src/domain/currency.ts` do not exist.

- [ ] **Step 3: Add the scaffold and implement the exact money interfaces**

Use `bigint` internally; `MoneyDTO.amountMinor` is a base-10 string. Percentage multiplication accepts integer basis points and uses half-away-from-zero rounding.

- [ ] **Step 4: Verify unit tests, lint, type-check, and production build**

Run: `npm test -- tests/unit/money.test.ts && npm run lint && npm run typecheck && npm run build`
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

Run: `git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts app src/domain src/test tests/unit/money.test.ts && git commit -m "feat: establish app and money domain"`

### Task 2: Domain Entities, Seed Data, and Repository Port

**Files:**
- Create: `src/domain/entities.ts`, `src/domain/financial-repository.ts`
- Create: `src/demo/seed.ts`, `src/demo/demo-financial-repository.ts`
- Test: `tests/unit/seed.test.ts`, `tests/unit/demo-financial-repository.test.ts`

**Interfaces:**
- Consumes: `Money`, `MoneyDTO`, and `CurrencyCode` from Task 1.
- Produces: typed entities from the spec; `FinancialRepository`; `createSeedSnapshot(seedVersion: string): FinancialSnapshot`; `DemoFinancialRepository.reset()` and read methods.

- [ ] **Step 1: Write failing seed-invariant and repository-isolation tests**

Assert the five living-expense categories total CNY 5,200; shopping is CNY 580; tuition is CNY 5,000; the unused video subscription is CNY 68; account balances match the spec; stable IDs repeat across resets; and a second reset replaces rather than duplicates data.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/seed.test.ts tests/unit/demo-financial-repository.test.ts`
Expected: FAIL because the seed and repository port are undefined.

- [ ] **Step 3: Implement focused entity modules and deterministic seed data**

Keep entity types serializable. Use a versioned fixed-ID seed and clone data at repository boundaries so callers cannot mutate stored state accidentally.

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- tests/unit/seed.test.ts tests/unit/demo-financial-repository.test.ts`
Expected: PASS with exact seeded values.

- [ ] **Step 5: Commit**

Run: `git add src/domain src/demo tests/unit/seed.test.ts tests/unit/demo-financial-repository.test.ts && git commit -m "feat: add shared financial model and demo seed"`

### Task 3: Supabase Schema, Auth Boundary, and RLS

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/0001_financial_core.sql`, `supabase/seed.sql`
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- Create: `src/server/repositories/supabase-financial-repository.ts`
- Create: `middleware.ts`, `app/login/page.tsx`, `app/auth/callback/route.ts`
- Test: `tests/integration/rls.test.ts`, `tests/integration/supabase-repository.test.ts`
- External: New Supabase project dedicated to `fudan-global-finance-ai`

**Interfaces:**
- Consumes: `FinancialRepository` and seeded entities from Task 2.
- Produces: `createServerSupabaseClient()`, `createBrowserSupabaseClient()`, `SupabaseFinancialRepository` implementing `FinancialRepository`.

- [ ] **Step 1: Write failing authorization and mapping tests**

Test that user A cannot read or mutate user B's accounts, unauthenticated reads fail, bigint columns map to decimal strings/`bigint`, and investment/internal-transfer flags survive a database round trip.

- [ ] **Step 2: Run integration tests and verify failure**

Run: `npm run test:integration -- tests/integration/rls.test.ts tests/integration/supabase-repository.test.ts`
Expected: FAIL because the schema, policies, and adapter are absent.

- [ ] **Step 3: Create the dedicated Supabase project and implement schema, ownership policies, auth helpers, and adapter**

Every user-owned table has `user_id`; policies use `auth.uid()`. Add indexes for account/date transaction queries, plan/action status, subscription renewal, and audit correlation ID.

- [ ] **Step 4: Verify migrations, policies, and adapter tests**

Run: `npm run db:reset && npm run db:lint && npm run test:integration -- tests/integration/rls.test.ts tests/integration/supabase-repository.test.ts`
Expected: clean database lint and passing tests.

- [ ] **Step 5: Commit**

Run: `git add supabase src/lib/supabase src/server/repositories middleware.ts app/login app/auth tests/integration && git commit -m "feat: add secure Supabase persistence"`

### Task 4: Figma Foundations, App Shell, and Dashboard

**Files:**
- Create: `src/styles/tokens.css`, `src/components/ui/*`
- Create: `src/components/shell/app-shell.tsx`, `src/components/shell/sidebar.tsx`, `src/components/shell/topbar.tsx`, `src/components/shell/copilot-launcher.tsx`
- Create: `app/(product)/layout.tsx`, `app/(product)/overview/page.tsx`
- Create: `src/features/overview/overview-dashboard.tsx`, `src/features/overview/overview-queries.ts`
- Create: `docs/research/reference-review.md`
- Test: `tests/component/app-shell.test.tsx`, `tests/component/overview-dashboard.test.tsx`, `tests/e2e/overview.spec.ts`
- External: New Figma file `Fudan Global Finance AI`; new GitHub repository `jamienatorX/fudan-global-finance-ai`

**Interfaces:**
- Consumes: `FinancialRepository` and seed snapshot from Tasks 2–3.
- Produces: reusable tokens/components, responsive `AppShell`, `OverviewDashboard`, and query keys used by later modules.

- [ ] **Step 1: Write failing shell and dashboard tests**

Assert twelve navigation destinations, account selector, notification control, simulation badge, Copilot access, CNY reporting totals derived from seed data, recent transactions, budget usage, subscriptions, tuition, and mobile navigation.

- [ ] **Step 2: Run component tests and verify failure**

Run: `npm test -- tests/component/app-shell.test.tsx tests/component/overview-dashboard.test.tsx`
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Create Figma foundations and implement the reusable shell/dashboard**

Review the named reference repositories and record repository URL, license, concepts used, and concepts deliberately excluded. Use the spec's seven Figma pages and exact palette. Create the new GitHub repository, set it as `origin`, and keep it empty until the local Phase 1 commits are ready to push. Build dashboard sections from repository queries; do not hard-code displayed totals in components. If the connected Figma seat cannot create/edit the file, stop and request write access rather than creating it under another account.

- [ ] **Step 4: Verify component, browser, accessibility, and visual behavior**

Run: `npm test -- tests/component && npm run test:e2e -- tests/e2e/overview.spec.ts && npm run build`
Expected: tests pass at desktop and mobile viewports with no serious accessibility violations.

- [ ] **Step 5: Commit and push Phase 1**

Run: `git add app src tests docs && git commit -m "feat: deliver dashboard foundation" && git push -u origin main`
Expected: GitHub shows the new repository; QFin Terminal has no changes.
