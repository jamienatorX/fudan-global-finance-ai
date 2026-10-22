# Phase 2: Core Banking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver accounts, transaction reporting, smart transfers, and numerically grounded bill analysis on shared financial state.

**Architecture:** Pure report and validation functions operate on domain entities. Server services enforce ownership, balance rules, confirmation, database transactions, and idempotency; React features call only typed server boundaries.

**Tech Stack:** Next.js, TypeScript, Supabase, Zod, TanStack Query, Recharts, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-14-fudan-global-finance-ai-design.md`

## Global Constraints

- Preserve original currency and exclude linked internal transfers from income.
- Exclude investment purchases/redemptions from consumption reports.
- Never persist a transfer without an explicit confirmation/approval artifact.
- All transfer executions use idempotency keys and database transactions.
- Display Asia/Shanghai schedules explicitly; “tomorrow morning” defaults to 09:00.

## Review Focus

1. Duplicate form submission returns the original receipt without a second debit.
2. Insufficient available balance leaves all account and transaction rows unchanged.
3. Ambiguous beneficiary matching returns `CLARIFICATION_REQUIRED` instead of selecting one.
4. Internal transfers and investments do not distort income/expense analytics.
5. Empty comparison periods produce “insufficient data,” never invented deltas.

---

### Task 1: Accounts, Transactions, and Reporting Domain

**Files:**
- Create: `src/features/accounts/account-service.ts`, `src/features/accounts/account-list.tsx`, `app/(product)/accounts/page.tsx`
- Create: `src/features/transactions/reporting.ts`, `src/features/transactions/transaction-service.ts`, `src/features/transactions/transaction-table.tsx`
- Create: `app/(product)/transactions/page.tsx`
- Test: `tests/unit/reporting.test.ts`, `tests/component/account-list.test.tsx`, `tests/component/transaction-table.test.tsx`

**Interfaces:**
- Consumes: `FinancialRepository`, account/transaction entities, `Money`.
- Produces: `buildSpendingReport(transactions, period, comparisonPeriod)`, `getAccountSummary(userId)`, `searchTransactions(userId, filters)`.

- [ ] **Step 1: Write failing report and component tests**

Assert category totals, income/expense comparison, recurring detection, anomaly flags, internal-transfer exclusion, investment exclusion, search/filter behavior, transaction-detail presentation, empty comparison handling, account switching, and multi-currency account presentation.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/unit/reporting.test.ts tests/component/account-list.test.tsx tests/component/transaction-table.test.tsx`
Expected: FAIL because reporting and views are missing.

- [ ] **Step 3: Implement report functions, typed query service, and pages**

Keep calculations pure; server query services handle authorization and pagination. Charts and cards consume the same report DTO as the table totals.

- [ ] **Step 4: Run focused tests and build**

Run: `npm test -- tests/unit/reporting.test.ts tests/component/account-list.test.tsx tests/component/transaction-table.test.tsx && npm run build`
Expected: PASS and a successful production build.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/accounts app/'(product)'/transactions src/features/accounts src/features/transactions tests && git commit -m "feat: add accounts and transaction reporting"`

### Task 2: Smart Transfer Service and Confirmation Flow

**Files:**
- Create: `src/domain/authorization.ts`, `src/domain/transfer.ts`
- Create: `src/server/services/transfer-service.ts`, `src/server/actions/transfers.ts`
- Create: `src/features/transfers/transfer-form.tsx`, `src/features/transfers/transfer-confirmation.tsx`, `src/features/transfers/transfer-history.tsx`
- Create: `app/(product)/transfers/page.tsx`, `app/(product)/transfers/receipts/[receiptId]/page.tsx`
- Test: `tests/unit/transfer-validation.test.ts`, `tests/integration/transfer-service.test.ts`, `tests/e2e/transfer.spec.ts`

**Interfaces:**
- Consumes: `FinancialRepository`, `Money`, beneficiary/account entities.
- Produces: `TransferDraft`, `ApprovedActionToken`, `parseTransferDraft()`, `TransferService.execute(draft, authorization, idempotencyKey)`, `TransferReceipt`.

- [ ] **Step 1: Write failing validation and execution tests**

Cover beneficiary name, exact phone matching, CNY 800 scheduled at 09:00 Asia/Shanghai, recurring and split drafts, ambiguous beneficiary, insufficient funds, expired authorization, unauthorized account, duplicate idempotency key, ledger balance, and receipt generation.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/transfer-validation.test.ts && npm run test:integration -- tests/integration/transfer-service.test.ts`
Expected: FAIL because transfer contracts and service are absent.

- [ ] **Step 3: Implement transfer draft, confirmation, transactional execution, and UI**

`TransferService.execute` rechecks account and balance inside the transaction. A duplicate idempotency key returns the existing successful result. No client component updates balances optimistically.

- [ ] **Step 4: Verify service and end-to-end flow**

Run: `npm test -- tests/unit/transfer-validation.test.ts && npm run test:integration -- tests/integration/transfer-service.test.ts && npm run test:e2e -- tests/e2e/transfer.spec.ts`
Expected: successful approved transfer and safe failures with unchanged balances.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/transfers src/domain src/server src/features/transfers tests && git commit -m "feat: add approved smart transfers"`

### Task 3: Bill Analysis and CSV Import

**Files:**
- Create: `src/features/transactions/categorization.ts`, `src/features/transactions/csv-import.ts`
- Create: `src/features/transactions/bill-analysis.tsx`, `src/features/transactions/report-charts.tsx`
- Create: `src/server/actions/transactions.ts`
- Test: `tests/unit/categorization.test.ts`, `tests/unit/csv-import.test.ts`, `tests/component/bill-analysis.test.tsx`, `tests/e2e/bill-analysis.spec.ts`

**Interfaces:**
- Consumes: `buildSpendingReport()` from Task 1.
- Produces: `categorizeTransaction()`, `parseTransactionCsv()`, `buildSavingsRecommendations(report, targetMoney)`.

- [ ] **Step 1: Write failing categorization, import, and savings tests**

Assert safe CSV parsing, invalid-row isolation, formula-injection neutralization on export/display, deterministic merchant categorization, precise month-over-month differences, and recommendations whose savings sum to CNY 500 or explicitly report the achievable amount.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/unit/categorization.test.ts tests/unit/csv-import.test.ts tests/component/bill-analysis.test.tsx`
Expected: FAIL because analysis modules are missing.

- [ ] **Step 3: Implement categorization, guarded import, charts, and explanation panel**

Render category donut, monthly cash-flow line, income/expense bars, budget utilization, and balance history from the same report DTO.

- [ ] **Step 4: Verify calculations and browser behavior**

Run: `npm test -- tests/unit/categorization.test.ts tests/unit/csv-import.test.ts tests/component/bill-analysis.test.tsx && npm run test:e2e -- tests/e2e/bill-analysis.spec.ts`
Expected: all tests pass and displayed chart totals match table totals.

- [ ] **Step 5: Commit**

Run: `git add src/features/transactions src/server/actions/transactions.ts tests && git commit -m "feat: add bill analysis and safe import"`
