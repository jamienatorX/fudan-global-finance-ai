# Phase 4: AI Banking Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deterministic, explainable banking agent with typed tools, multi-step plans, granular approvals, verified execution, and an interactive command center.

**Architecture:** A tool registry separates read-only retrieval from write proposals. The planner creates immutable action payloads; the approval service hashes and authorizes exact payloads; the executor dispatches only valid approved actions and verifies state by rereading affected records.

**Tech Stack:** Next.js, TypeScript, Zod, Supabase, Node crypto, TanStack Query, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-14-fudan-global-finance-ai-design.md`

## Global Constraints

- The deterministic agent is fully functional without an external model key.
- The model or parser may propose typed intents but never writes financial tables.
- Approval records expire after ten minutes and bind to a canonical payload hash.
- Execute only actions whose current state still matches the approved plan assumptions.
- Tool results, imported text, and merchant descriptions are untrusted data, never instructions.

## Review Focus

1. Payload mutation after approval must return `STALE_STATE` or `APPROVAL_REQUIRED`.
2. An expired approval must never be refreshed silently.
3. Partial approval must execute only selected actions.
4. A retry with the same idempotency key must return the original result.
5. Prompt-like text inside transactions must not invoke write tools.

---

### Task 1: Typed Tool Registry and Read-only Tools

**Files:**
- Create: `src/agent/contracts.ts`, `src/agent/errors.ts`, `src/agent/tool-registry.ts`, `src/agent/financial-context-port.ts`
- Create: `src/agent/tools/read/get-accounts.ts`, `get-balance.ts`, `list-transactions.ts`, `analyze-spending.ts`, `get-budgets.ts`, `list-subscriptions.ts`, `get-cards.ts`, `list-investment-products.ts`, `get-portfolio.ts`, `get-fx-reference-rate.ts`, `forecast-cash-flow.ts`
- Test: `tests/unit/tool-registry.test.ts`, `tests/integration/read-tools.test.ts`

**Interfaces:**
- Consumes: repository/query interfaces from Phases 1–3.
- Produces: `ToolName`, `ToolDefinition<Input, Output>`, `ToolContext`, `ToolResult`, `FinancialContextPort`, `ToolRegistry.register()`, `ToolRegistry.invokeRead()`.

- [ ] **Step 1: Write failing registry and authorization tests**

Assert unique tool names, Zod input rejection, authenticated context injection, user-ID omission from model inputs, structured correlation IDs, read-only enforcement, precise numerical outputs, and untrusted transaction text remaining inert.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/tool-registry.test.ts && npm run test:integration -- tests/integration/read-tools.test.ts`
Expected: FAIL because agent contracts and tools are absent.

- [ ] **Step 3: Implement registry and eleven read-only tools**

Return `{ ok, data | error, correlationId, sourceTimestamp }`. Registry metadata declares `effect: 'read' | 'write'`; `invokeRead` rejects write tools. FX, budget, and forecast tools call `FinancialContextPort`; initially use deterministic seed-backed adapters, and let Phase 5 inject Frankfurter-backed FX and the full planning service without changing tool contracts.

- [ ] **Step 4: Verify tool tests**

Run: `npm test -- tests/unit/tool-registry.test.ts && npm run test:integration -- tests/integration/read-tools.test.ts`
Expected: PASS with outputs derived from shared state.

- [ ] **Step 5: Commit**

Run: `git add src/agent tests/unit/tool-registry.test.ts tests/integration/read-tools.test.ts && git commit -m "feat: add typed agent read tools"`

### Task 2: Plans, Approvals, Write Tools, and Verification

**Files:**
- Create: `src/agent/canonical-json.ts`, `src/agent/plan-service.ts`, `src/agent/approval-service.ts`, `src/agent/executor.ts`, `src/agent/verifier.ts`
- Create: `src/agent/tools/write/create-simulated-transfer.ts`, `schedule-simulated-transfer.ts`, `update-budget.ts`, `freeze-card.ts`, `update-card-limit.ts`, `cancel-demo-subscription.ts`, `buy-demo-investment.ts`, `redeem-demo-investment.ts`
- Create: `src/server/actions/agent.ts`
- Test: `tests/unit/canonical-json.test.ts`, `tests/integration/approval-service.test.ts`, `tests/integration/agent-executor.test.ts`

**Interfaces:**
- Consumes: write services from Phases 2–3 and read registry from Task 1.
- Produces: `AgentPlan`, `AgentAction`, `PlanService.create()`, `ApprovalService.decide()`, `AgentExecutor.executeApproved()`, `Verifier.verify()`.

- [ ] **Step 1: Write failing payload-binding and execution tests**

Test stable hashes across key order, changed-amount hash mismatch, ten-minute expiration, user mismatch, stale balance, independent approve/reject decisions, only-approved execution, idempotent retry, failure isolation, and verified before/after snapshots.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/canonical-json.test.ts && npm run test:integration -- tests/integration/approval-service.test.ts tests/integration/agent-executor.test.ts`
Expected: FAIL because plan/approval/execution services are absent.

- [ ] **Step 3: Implement canonical hashing, immutable plans, approvals, write tools, and verification**

Write-tool inputs omit approval fields; the executor supplies authorization from the stored record. Persist each action outcome and audit event using one correlation ID per plan run.

- [ ] **Step 4: Verify mutation safety and state refresh**

Run: `npm test -- tests/unit/canonical-json.test.ts && npm run test:integration -- tests/integration/approval-service.test.ts tests/integration/agent-executor.test.ts`
Expected: PASS; no rejected, expired, mutated, or duplicate action changes state.

- [ ] **Step 5: Commit**

Run: `git add src/agent src/server/actions/agent.ts tests && git commit -m "feat: add approval-gated agent execution"`

### Task 3: Deterministic Interpreter and Copilot Command Center

**Files:**
- Create: `src/agent/deterministic-interpreter.ts`, `src/agent/intent-schemas.ts`, `src/agent/explanation.ts`
- Create: `src/features/copilot/copilot-workspace.tsx`, `conversation-panel.tsx`, `plan-panel.tsx`, `context-panel.tsx`, `tool-timeline.tsx`, `approval-card.tsx`, `impact-preview.tsx`, `verification-summary.tsx`
- Create: `app/(product)/copilot/page.tsx`
- Test: `tests/unit/deterministic-interpreter.test.ts`, `tests/component/copilot-workspace.test.tsx`, `tests/e2e/copilot.spec.ts`

**Interfaces:**
- Consumes: `PlanService`, tool registry, approvals, executor, verifier.
- Produces: `interpretCommand(text, context): IntentResult`, `buildExplanation(planRun)`, interactive Copilot workspace.

- [ ] **Step 1: Write failing command and UI-state tests**

Cover spending analysis, CNY 800 Zhang Wei transfer, low-risk CNY 10,000 comparison, card freeze/limit, unused subscriptions, ambiguous beneficiary clarification, unknown intent, malicious merchant text, plan timeline, individual approvals, rejection, execution status, and verification summary.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/deterministic-interpreter.test.ts tests/component/copilot-workspace.test.tsx`
Expected: FAIL because interpreter and workspace are missing.

- [ ] **Step 3: Implement deterministic intents, explanation builder, and command center**

The interpreter supports the six competition scenarios and asks clarification when required fields are unresolved. Explanations cite calculated values from tool outputs rather than recomputing invented values.

- [ ] **Step 4: Verify component and browser workflow**

Run: `npm test -- tests/unit/deterministic-interpreter.test.ts tests/component/copilot-workspace.test.tsx && npm run test:e2e -- tests/e2e/copilot.spec.ts`
Expected: PASS from command submission through verified explanation.

- [ ] **Step 5: Commit**

Run: `git add app/'(product)'/copilot src/agent src/features/copilot tests && git commit -m "feat: deliver AI banking command center"`
