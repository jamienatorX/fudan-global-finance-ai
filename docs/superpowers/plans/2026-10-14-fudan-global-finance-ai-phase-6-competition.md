# Phase 6: Competition Demo and Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the reproducible flagship cross-scenario demonstration, audit/reset/settings experiences, judge presentation mode, final Figma screens, and a verified Vercel deployment.

**Architecture:** A dedicated competition orchestrator invokes the same agent plan, approval, execution, verification, and forecasting services used throughout the product. Presentation mode is a guided view over real application state, not a separate scripted mock.

**Tech Stack:** Next.js, TypeScript, Supabase, Playwright, axe accessibility checks, GitHub Actions, Figma, Vercel

**Spec:** `docs/superpowers/specs/2026-10-14-fudan-global-finance-ai-design.md`

## Global Constraints

- The flagship demo starts from versioned seed state and is reproducible after reset.
- The three write actions are independently approvable; forecasting is read-only.
- A failed tuition transfer does not falsely complete or block separately approved actions.
- Presentation mode reads real plan/action/audit records.
- Deploy a tested preview first; promote only the verified build.

## Review Focus

1. Partial approval executes only selected actions and reports every rejected/blocked item.
2. Insufficient funds blocks tuition without corrupting budget/subscription state.
3. Reset recreates exactly one copy of every seed row and invalidates prior approvals.
4. Audit events preserve correlation IDs and never expose secrets or full card numbers.
5. Production promotion uses the exact preview-tested build and correct Supabase environment.

---

### Task 1: Flagship Competition Orchestrator

**Files:**
- Create: `src/competition/flagship-command.ts`, `src/competition/competition-orchestrator.ts`, `src/competition/competition-summary.ts`
- Create: `src/features/competition/run-demo-button.tsx`, `competition-workspace.tsx`, `before-after-comparison.tsx`
- Create: `app/(product)/competition/page.tsx`
- Test: `tests/integration/competition-orchestrator.test.ts`, `tests/component/competition-workspace.test.tsx`, `tests/e2e/competition-demo.spec.ts`

**Interfaces:**
- Consumes: deterministic interpreter, tool registry, plan/approval/executor/verifier, FX and planning services.
- Produces: `FLAGSHIP_COMMAND`, `CompetitionOrchestrator.prepare()`, `CompetitionOrchestrator.execute()`, `buildCompetitionSummary()`.

- [ ] **Step 1: Write failing full-flow, partial-approval, and insufficient-funds tests**

Assert the prepared plan contains a CNY 5,000 tuition transfer, CNY 580→464 budget change, CNY 116 savings, CNY 68 subscription cancellation, and read-only runway forecast. After full approval, daily CNY cash falls by 5,000, tuition is paid, shopping is 464, video is cancelled, recurring outflow falls by 184, forecast is recomputed, and correlated audit events exist. Add partial rejection and insufficient-funds variants.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm run test:integration -- tests/integration/competition-orchestrator.test.ts && npm test -- tests/component/competition-workspace.test.tsx`
Expected: FAIL because competition orchestration is absent.

- [ ] **Step 3: Implement orchestrator and guided workspace using existing services**

Do not special-case database mutations for the demo. The orchestrator composes existing tools and returns normalized stages: retrieve, calculate, plan, approve, execute, verify, explain.

- [ ] **Step 4: Verify complete browser flow**

Run: `npm run test:integration -- tests/integration/competition-orchestrator.test.ts && npm run test:e2e -- tests/e2e/competition-demo.spec.ts`
Expected: PASS for full approval, partial approval, rejection, insufficient funds, and rerun after reset.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/competition src/competition src/features/competition tests && git commit -m "feat: add flagship competition demonstration"`

### Task 2: Audit Trail, Notifications, Settings, and Demo Reset

**Files:**
- Create: `src/server/services/audit-service.ts`, `src/server/services/demo-reset-service.ts`, `src/server/actions/settings.ts`
- Create: `src/features/audit/audit-timeline.tsx`, `notification-center.tsx`, `audit-filters.tsx`
- Create: `src/features/settings/settings-panel.tsx`, `security-summary.tsx`, `data-source-status.tsx`, `reset-demo-dialog.tsx`
- Create: `app/(product)/audit/page.tsx`, `app/(product)/settings/page.tsx`
- Test: `tests/integration/audit-service.test.ts`, `tests/integration/demo-reset.test.ts`, `tests/e2e/audit-reset.spec.ts`

**Interfaces:**
- Consumes: repository, seed factory, auth context, all mutation audit events.
- Produces: `AuditService.list()`, `DemoResetService.reset(userId, confirmation, idempotencyKey)`, settings and notification views.

- [ ] **Step 1: Write failing audit and reset tests**

Assert append-only audit events, ownership filtering, masked sensitive fields, correlation grouping, invalid reset confirmation rejection, atomic reset, stable IDs/values, no duplicated rows, invalidated old approvals, and reproducible flagship rerun.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:integration -- tests/integration/audit-service.test.ts tests/integration/demo-reset.test.ts`
Expected: FAIL because audit/reset services are absent.

- [ ] **Step 3: Implement audit queries, notification derivation, settings, and atomic reset**

Require the exact confirmation text `RESET DEMO`. Reset writes one audit event after the new snapshot commits and never deletes audit history outside the reset scope defined by the spec.

- [ ] **Step 4: Verify browser and integration behavior**

Run: `npm run test:integration -- tests/integration/audit-service.test.ts tests/integration/demo-reset.test.ts && npm run test:e2e -- tests/e2e/audit-reset.spec.ts`
Expected: PASS with a reproducible post-reset demo.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/audit app/'(product)'/settings src/server src/features/audit src/features/settings tests && git commit -m "feat: add audit security and demo reset"`

### Task 3: Judge Presentation Mode and Final Figma Coverage

**Files:**
- Create: `src/features/presentation/presentation-mode.tsx`, `scenario-overview.tsx`, `architecture-panel.tsx`, `security-panel.tsx`
- Modify: `app/(product)/competition/page.tsx`, `src/styles/tokens.css`
- Test: `tests/component/presentation-mode.test.tsx`, `tests/e2e/presentation-mode.spec.ts`
- External: Complete Figma pages `03 Desktop Product`, `04 Mobile Product`, `05 Agent & Approval States`, and `06 Competition Presentation`

**Interfaces:**
- Consumes: real competition plan/run records and shared design components.
- Produces: judge-friendly guided steps for problem, six scenarios, agent workflow, tools, approvals, before/after comparison, architecture, and security.

- [ ] **Step 1: Write failing presentation and responsive tests**

Assert all six scenario summaries, deterministic workflow stages, live tool timeline, approval demonstration, before/after values, simulated-data labels, architecture/security explanations, keyboard navigation, reduced motion, and desktop/mobile layouts.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/component/presentation-mode.test.tsx && npm run test:e2e -- tests/e2e/presentation-mode.spec.ts`
Expected: FAIL because presentation mode is incomplete.

- [ ] **Step 3: Implement presentation mode and complete matching Figma frames**

Keep presentation data bound to the current demo run; only explanatory architecture copy is static.

- [ ] **Step 4: Verify visual, responsive, keyboard, and accessibility behavior**

Run: `npm test -- tests/component/presentation-mode.test.tsx && npm run test:e2e -- tests/e2e/presentation-mode.spec.ts && npm run test:a11y`
Expected: PASS with no serious or critical accessibility violations.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/competition src/features/presentation src/styles tests && git commit -m "feat: add judge presentation mode"`

### Task 4: CI, Vercel Preview, Full Verification, and Promotion

**Files:**
- Create: `.env.example`, `.github/workflows/ci.yml`, `vercel.json`
- Create: `tests/e2e/critical-paths.spec.ts`, `docs/competition-demo-guide.md`, `README.md`
- Modify: `package.json`, `package-lock.json`
- External: New Vercel project `fudan-global-finance-ai` connected to `jamienatorX/fudan-global-finance-ai`

**Interfaces:**
- Consumes: complete application and all previous test suites.
- Produces: CI checks, documented environment contract, verified preview deployment, competition demo guide, and promoted production deployment.

- [ ] **Step 1: Write the final critical-path browser suite**

Cover login, overview, transfer, analysis, card control, subscription cancellation, investment purchase, FX fallback, budget/tuition planning, Copilot, flagship demo, audit, reset, and mobile navigation.

- [ ] **Step 2: Run the suite locally and record any failure before deployment**

Run: `npm ci && npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build && npm run test:e2e && npm run test:a11y`
Expected: every command exits 0; stop on the first broken boundary.

- [ ] **Step 3: Add CI, environment documentation, demo guide, and Vercel project configuration**

CI runs install, lint, type-check, unit/integration tests, build, and browser tests. Configure Supabase and optional FX/model variables separately for preview and production; never commit secrets.

- [ ] **Step 4: Deploy and verify the preview end to end**

Create the Vercel project, deploy the exact committed build to preview, inspect build/runtime logs, run `BASE_URL=<preview-url> npm run test:e2e`, and verify the flagship flow in a browser at desktop and mobile widths.

- [ ] **Step 5: Commit deployment configuration, push, and promote the tested build**

Run: `git add .env.example .github vercel.json tests/e2e/critical-paths.spec.ts docs/competition-demo-guide.md README.md package.json package-lock.json && git commit -m "chore: verify and deploy competition build" && git push`
Expected: CI is green. Promote only the already-tested production-staged build, then scan production logs for errors and rerun the critical-path suite against the production URL.
