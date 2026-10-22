# Phase 5: International Student Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver reference FX, multi-currency conversion, cross-border planning, budgets, tuition, family allowance, emergency fund, and transparent cash-runway forecasting.

**Architecture:** An FX provider port isolates Frankfurter from deterministic fallback rates. Decimal-safe conversion feeds pure forecast functions; the planner and FX pages consume the same services exposed to agent read tools.

**Tech Stack:** Next.js, TypeScript, Supabase, Frankfurter API, decimal-safe arithmetic, Recharts, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-14-fudan-global-finance-ai-design.md`

## Global Constraints

- Preserve original currencies and report consolidated figures in CNY.
- Every rate displays source, reference timestamp, retrieval timestamp, and live/cached/fallback status.
- Simulated remittance comparisons are never presented as provider offers.
- One-off tuition reduces cash but is not recurring monthly consumption.
- Forecast formulas and inputs are visible to the user.

## Review Focus

1. Provider timeout/error must use labeled fallback data or return `RATE_UNAVAILABLE`.
2. Unsupported currency pairs must not invent rates.
3. Conversion rounding must respect target currency minor units.
4. Changing a budget or subscription must update the forecast exactly once.
5. Zero or negative recurring outflow must return an explicit nonnumeric runway state.

---

### Task 1: FX Provider, Cache, Fallback, and Conversion

**Files:**
- Create: `src/domain/fx.ts`, `src/server/fx/fx-provider.ts`, `src/server/fx/frankfurter-provider.ts`, `src/server/fx/fallback-provider.ts`, `src/server/fx/cached-fx-service.ts`
- Create: `src/features/fx/conversion.ts`, `src/server/actions/fx.ts`
- Test: `tests/unit/fx-conversion.test.ts`, `tests/integration/frankfurter-provider.test.ts`, `tests/integration/cached-fx-service.test.ts`

**Interfaces:**
- Consumes: `Money`, `CurrencyCode`, exchange-rate repository.
- Produces: `FxQuote`, `FxProvider.getRate(base, quote, at?)`, `CachedFxService.getQuote()`, `convertMoney(amount, quote)`.

- [ ] **Step 1: Write failing FX conversion and failure-mode tests**

Test identity conversion, direct quote conversion, inverse handling, target-minor-unit rounding, timestamp/source fields, cache hit, stale cache, provider timeout, seeded fallback label, and unsupported pair error.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/fx-conversion.test.ts && npm run test:integration -- tests/integration/frankfurter-provider.test.ts tests/integration/cached-fx-service.test.ts`
Expected: FAIL because provider services are absent.

- [ ] **Step 3: Implement provider port, Frankfurter adapter, cache policy, fallback, and converter**

Never log API responses containing user data. Store decimal rates as strings and use decimal-safe multiplication before converting to target minor units.

- [ ] **Step 4: Verify provider and conversion tests**

Run: `npm test -- tests/unit/fx-conversion.test.ts && npm run test:integration -- tests/integration/frankfurter-provider.test.ts tests/integration/cached-fx-service.test.ts`
Expected: PASS with source labels for every path.

- [ ] **Step 5: Commit**

Run: `git add src/domain/fx.ts src/server/fx src/features/fx src/server/actions/fx.ts tests && git commit -m "feat: add transparent reference FX service"`

### Task 2: Budget, Tuition, Allowance, Emergency Fund, and Runway Domain

**Files:**
- Create: `src/domain/planning.ts`, `src/features/planner/runway.ts`, `src/features/planner/budget-calculations.ts`
- Create: `src/server/services/planning-service.ts`, `src/server/actions/planner.ts`
- Test: `tests/unit/budget-calculations.test.ts`, `tests/unit/runway.test.ts`, `tests/integration/planning-service.test.ts`

**Interfaces:**
- Consumes: `Money`, FX quotes, budgets, subscriptions, obligations, expected inflows.
- Produces: `reduceBudgetByPercent()`, `forecastCashFlow()`, `calculateCashRunway()`, `PlanningService.updateBudget()`, `PlanningService.markTuitionPaid()`.

- [ ] **Step 1: Write failing planning tests**

Assert shopping CNY 580 reduced 20% becomes CNY 464 with CNY 116 savings; video cancellation reduces recurring outflow by CNY 68; CNY 5,000 tuition reduces liquid cash once; IDR 10,000,000 allowance is converted at the displayed quote; and zero recurring outflow returns `NO_FINITE_RUNWAY`.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/budget-calculations.test.ts tests/unit/runway.test.ts && npm run test:integration -- tests/integration/planning-service.test.ts`
Expected: FAIL because planning functions are absent.

- [ ] **Step 3: Implement calculations and approval-gated budget/tuition services**

Return a forecast DTO listing opening cash, FX conversions, inflows, recurring outflows, one-off obligations, adjustments, closing cash, and runway.

- [ ] **Step 4: Verify exact calculations and integration behavior**

Run: `npm test -- tests/unit/budget-calculations.test.ts tests/unit/runway.test.ts && npm run test:integration -- tests/integration/planning-service.test.ts`
Expected: PASS with no binary floating-point drift.

- [ ] **Step 5: Commit**

Run: `git add src/domain/planning.ts src/features/planner src/server tests && git commit -m "feat: add student financial planning engine"`

### Task 3: FX and Student Planner Interfaces

**Files:**
- Create: `src/features/fx/fx-workspace.tsx`, `fx-rate-card.tsx`, `fx-history-chart.tsx`, `remittance-comparison.tsx`
- Create: `src/features/planner/planner-dashboard.tsx`, `budget-editor.tsx`, `tuition-timeline.tsx`, `allowance-plan.tsx`, `emergency-fund-card.tsx`, `runway-forecast.tsx`
- Create: `app/(product)/fx/page.tsx`, `app/(product)/planner/page.tsx`
- Modify: `src/agent/tools/read/get-fx-reference-rate.ts`, `src/agent/tools/read/forecast-cash-flow.ts`, `src/agent/tools/write/update-budget.ts`
- Test: `tests/component/fx-workspace.test.tsx`, `tests/component/planner-dashboard.test.tsx`, `tests/e2e/student-finance.spec.ts`

**Interfaces:**
- Consumes: FX and planning services from Tasks 1–2.
- Produces: integrated conversion and planner workspaces; updated agent tools using the same domain functions.

- [ ] **Step 1: Write failing UI and agent-consistency tests**

Assert all four currency balances, source/timestamp badges, fallback warning, historical chart labels, simulated-remittance disclaimer, editable budget, tuition status, allowance schedule, emergency-fund progress, visible runway formula, and exact equality between page and tool outputs.

- [ ] **Step 2: Run component tests and verify failure**

Run: `npm test -- tests/component/fx-workspace.test.tsx tests/component/planner-dashboard.test.tsx`
Expected: FAIL because workspaces do not exist.

- [ ] **Step 3: Implement responsive FX/planner pages and update agent adapters**

No chart or summary performs independent financial arithmetic; all consume service DTOs.

- [ ] **Step 4: Verify page, agent, mobile, and browser behavior**

Run: `npm test -- tests/component/fx-workspace.test.tsx tests/component/planner-dashboard.test.tsx && npm run test:e2e -- tests/e2e/student-finance.spec.ts`
Expected: PASS at desktop and mobile viewports.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/fx app/'(product)'/planner src/features src/agent/tools tests && git commit -m "feat: deliver international student finance"`
