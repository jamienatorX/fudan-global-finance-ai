# Fudan Global Finance AI Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a competition-ready AI-native simulated banking platform through six independently testable implementation phases.

**Architecture:** A Next.js and TypeScript application uses a focused domain layer, Supabase persistence and authorization, a typed tool registry, and an approval-gated agent execution layer. Each phase leaves a deployable vertical slice and builds only on documented interfaces from earlier phases.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/RLS, TanStack Query, Zod, decimal-safe arithmetic, Recharts, Vitest, Testing Library, Playwright, GitHub, Figma, Vercel

**Spec:** `docs/superpowers/specs/2026-10-14-fudan-global-finance-ai-design.md`

## Global Constraints

- Product and repository slug: `fudan-global-finance-ai`; do not modify QFin Terminal.
- Currency set: CNY, IDR, USD, SGD; CNY is the reporting currency.
- Store money as integer minor units and preserve original transaction currency.
- Every sensitive mutation requires approval bound to an exact payload hash and expires after ten minutes.
- The deterministic agent must run without a paid model key.
- Live, cached, fallback, fictional, and simulated data must be labeled distinctly.
- Use Asia/Shanghai for schedules, tuition dates, and competition-demo dates.
- Never request real banking credentials, process real money, or imply licensed financial services.
- Commit after every independently testable task and deploy previews before production.

## Review Focus

1. A repeated click or retry must not execute a transfer, order, or cancellation twice; Phase 2 and Phase 4 pin idempotency with tests.
2. A stale approval must fail after data changes or ten minutes; Phase 4 tests payload binding, expiration, and stale state.
3. Internal transfers and investments must not inflate income or consumption; Phase 2 tests report exclusions.
4. Missing or stale FX data must show a fallback label and never masquerade as live; Phase 5 tests provider failure.
5. A partially approved multi-action plan must execute only approved actions and accurately list blocked/rejected items; Phase 4 and Phase 6 test this end to end.

---

## Execution Order

1. [Phase 1 — Foundation, shared state, design system, and dashboard](./2026-10-14-fudan-global-finance-ai-phase-1-foundation.md)
2. [Phase 2 — Accounts, transfers, transactions, and bill analysis](./2026-10-14-fudan-global-finance-ai-phase-2-core-banking.md)
3. [Phase 3 — Cards, subscriptions, and wealth management](./2026-10-14-fudan-global-finance-ai-phase-3-financial-controls.md)
4. [Phase 4 — AI tool registry, plans, approvals, and execution](./2026-10-14-fudan-global-finance-ai-phase-4-agent.md)
5. [Phase 5 — FX, tuition, budgets, and cash runway](./2026-10-14-fudan-global-finance-ai-phase-5-student-finance.md)
6. [Phase 6 — Flagship demo, presentation mode, audit, reset, and deployment](./2026-10-14-fudan-global-finance-ai-phase-6-competition.md)

Each phase must pass its unit, integration, browser, accessibility, and build checks before the next phase begins.
