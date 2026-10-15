# Phase 3: Financial Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver approval-gated card controls, subscription optimization, and simulated wealth management.

**Architecture:** Each domain exposes pure validation/calculation functions and a server mutation service that requires `ApprovedActionToken`. Feature UIs share confirmation, impact-preview, result, and error primitives.

**Tech Stack:** Next.js, TypeScript, Supabase, Zod, TanStack Query, Recharts, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-14-fudan-global-finance-ai-design.md`

## Global Constraints

- All cards, subscriptions, products, returns, orders, and cancellations are fictional or simulated.
- Card numbers are masked and no real credentials are stored.
- Investment language never guarantees returns.
- Every state change requires a nonexpired token bound to the exact payload.
- Mutation retries are idempotent and emit audit events.

## Review Focus

1. A limit-change token cannot authorize a different amount or a different card.
2. Cancelling an already cancelled subscription returns the existing result without double-counting savings.
3. Product suitability blocks purchases outside the user's risk/liquidity constraints.
4. Redemption cannot exceed owned units.
5. Investment cash movements do not appear as normal consumption.

---

### Task 1: Virtual Card Controls

**Files:**
- Create: `src/domain/card.ts`, `src/server/services/card-service.ts`, `src/server/actions/cards.ts`
- Create: `src/features/cards/card-grid.tsx`, `src/features/cards/card-control-panel.tsx`, `src/features/cards/card-activity.tsx`
- Create: `app/(product)/cards/page.tsx`
- Test: `tests/unit/card-validation.test.ts`, `tests/integration/card-service.test.ts`, `tests/e2e/cards.spec.ts`

**Interfaces:**
- Consumes: `ApprovedActionToken`, card entities, repository.
- Produces: `CardService.issueDemoCard()`, `CardService.freeze()`, `CardService.unfreeze()`, `CardService.updateLimit()`, `CardService.updateRestriction()` and before/after result DTOs.

- [ ] **Step 1: Write failing card validation and service tests**

Test demo-card issuance, masked display, CNY 1,000 monthly limit, freeze/unfreeze, nonnegative limits, ownership, merchant-category restrictions, payload mismatch, expiration, and idempotent retries.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/card-validation.test.ts && npm run test:integration -- tests/integration/card-service.test.ts`
Expected: FAIL because card services are undefined.

- [ ] **Step 3: Implement card services and interactive control panel**

Every control first renders an impact preview and requires explicit confirmation. Query invalidation refreshes dashboard alerts and card activity only after server verification.

- [ ] **Step 4: Verify unit, integration, and browser tests**

Run: `npm test -- tests/unit/card-validation.test.ts && npm run test:integration -- tests/integration/card-service.test.ts && npm run test:e2e -- tests/e2e/cards.spec.ts`
Expected: PASS with correct before/after state.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/cards src/domain/card.ts src/server src/features/cards tests && git commit -m "feat: add supervised card controls"`

### Task 2: Subscription Detection and Cancellation

**Files:**
- Create: `src/domain/subscription.ts`, `src/features/subscriptions/detection.ts`
- Create: `src/server/services/subscription-service.ts`, `src/server/actions/subscriptions.ts`
- Create: `src/features/subscriptions/subscription-center.tsx`, `src/features/subscriptions/cancellation-dialog.tsx`
- Create: `app/(product)/subscriptions/page.tsx`
- Test: `tests/unit/subscription-detection.test.ts`, `tests/integration/subscription-service.test.ts`, `tests/e2e/subscriptions.spec.ts`

**Interfaces:**
- Consumes: transaction recurrence metadata and `ApprovedActionToken`.
- Produces: `detectSubscriptions()`, `monthlyEquivalent()`, `annualizedCost()`, `SubscriptionService.cancel()`.

- [ ] **Step 1: Write failing recurrence and savings tests**

Assert recurrence matching tolerance, monthly/annual cadence normalization, unused-service rule, upcoming-renewal reminders, CNY 68 monthly and CNY 816 annual video savings, confirmation requirement, and duplicate cancellation behavior.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/subscription-detection.test.ts && npm run test:integration -- tests/integration/subscription-service.test.ts`
Expected: FAIL because subscription logic is absent.

- [ ] **Step 3: Implement detection, center UI, cancellation, and forecast invalidation**

Cancellation updates status and future forecasts but never deletes historical transactions.

- [ ] **Step 4: Verify service and browser flow**

Run: `npm test -- tests/unit/subscription-detection.test.ts && npm run test:integration -- tests/integration/subscription-service.test.ts && npm run test:e2e -- tests/e2e/subscriptions.spec.ts`
Expected: PASS and correct monthly/annual savings.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/subscriptions src/domain/subscription.ts src/features/subscriptions src/server tests && git commit -m "feat: add subscription optimization"`

### Task 3: Simulated Wealth Management

**Files:**
- Create: `src/domain/investment.ts`, `src/features/wealth/suitability.ts`, `src/features/wealth/portfolio-calculations.ts`
- Create: `src/server/services/investment-service.ts`, `src/server/actions/investments.ts`
- Create: `src/features/wealth/risk-questionnaire.tsx`, `src/features/wealth/product-catalog.tsx`, `src/features/wealth/product-comparison.tsx`, `src/features/wealth/portfolio.tsx`, `src/features/wealth/order-dialog.tsx`
- Create: `app/(product)/wealth/page.tsx`
- Test: `tests/unit/suitability.test.ts`, `tests/unit/portfolio-calculations.test.ts`, `tests/integration/investment-service.test.ts`, `tests/e2e/wealth.spec.ts`

**Interfaces:**
- Consumes: `Money`, investment entities, repository, `ApprovedActionToken`.
- Produces: `scoreRiskProfile()`, `rankSuitableProducts()`, `InvestmentService.buy()`, `InvestmentService.redeem()`, `buildPortfolioSummary()`.

- [ ] **Step 1: Write failing suitability, order, and portfolio tests**

Test low-risk CNY 10,000 comparison, horizon/liquidity filters, insufficient cash, unsuitable-product rejection, buy idempotency, over-redemption, holdings/cash ledger balance, asset allocation, investment order history, simulated labels, and report exclusion.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/suitability.test.ts tests/unit/portfolio-calculations.test.ts && npm run test:integration -- tests/integration/investment-service.test.ts`
Expected: FAIL because wealth modules are undefined.

- [ ] **Step 3: Implement risk profile, catalog, comparison, portfolio, and order services**

The fictional catalog includes money-market, bond, balanced, and equity-index products with risks, fees, liquidity, and simulated performance disclosures.

- [ ] **Step 4: Verify all wealth tests and browser flow**

Run: `npm test -- tests/unit/suitability.test.ts tests/unit/portfolio-calculations.test.ts && npm run test:integration -- tests/integration/investment-service.test.ts && npm run test:e2e -- tests/e2e/wealth.spec.ts`
Expected: PASS with ledger-balanced simulated orders.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/wealth src/domain/investment.ts src/features/wealth src/server tests && git commit -m "feat: add simulated wealth management"`
