# Fudan Global Finance AI — Product and System Design

- **Status:** Approved architecture; specification awaiting user review
- **Date:** 2026-10-14
- **Competition:** 2026 Shenzhen International FinTechathon — Domestic AI Track
- **Product:** Fudan Global Finance AI
- **Tagline:** Your Intelligent Banking Companion

## 1. Purpose and Success Definition

Fudan Global Finance AI is a competition-grade simulated banking platform for an Indonesian international student studying at Fudan University in Shanghai. Its central product idea is not a dashboard with a chatbot attached. It is a shared financial system in which a supervised AI banking agent can read verified application data, plan across multiple banking domains, calculate financial effects, request granular approval, execute only authorized simulated actions, verify the resulting state, and explain the outcome.

The prototype succeeds when a judge can issue one natural-language instruction spanning tuition, budgeting, subscriptions, and cash-flow forecasting; inspect the agent's plan and calculations; approve or reject individual actions; and then see every affected module update from the same underlying state.

This product handles fictional accounts and simulated financial actions only. It must never request real bank credentials, move real money, guarantee investment returns, or imply that it is a licensed financial institution.

## 2. Scope

### In scope

- Responsive desktop-first product with twelve integrated application pages.
- All six required banking scenarios with functional prototype workflows.
- Consistent seeded financial data shared by dashboards, tools, calculations, and charts.
- Multi-currency student finance across CNY, IDR, USD, and SGD.
- Deterministic demo agent that performs real simulated state changes.
- Optional live-model interpretation behind the same typed tool and approval layer.
- Supabase authentication, PostgreSQL persistence, Row Level Security, and audit records.
- Frankfurter reference FX rates when available, with timestamped seeded fallback rates.
- Figma product file containing foundations, components, desktop screens, mobile screens, and the competition-demo flow.
- A new GitHub repository and Vercel project named `fudan-global-finance-ai`.
- Automated calculation, domain, and end-to-end tests.

### Non-goals for the competition prototype

- Connecting to real banks, payment rails, card networks, brokers, or remittance providers.
- Processing real money or storing real payment credentials.
- Open-ended autonomous financial execution without explicit approval.
- Presenting simulated products or quotes as real offers.
- Building a general-purpose core banking system.

## 3. Delivery Architecture

### 3.1 Frontend

- Next.js App Router, React, and TypeScript.
- Tailwind CSS with accessible headless component primitives.
- Lucide icons and Inter typography.
- Recharts for financial charts.
- TanStack Query for server-state fetching and mutation synchronization.
- A small client interaction store only for ephemeral UI state such as sidebar state, filters, drafts, and the currently open approval panel.
- Server data remains authoritative; financial balances are not owned by a client-only store.

### 3.2 Backend

- Next.js server actions or route handlers expose a typed application-service layer.
- Supabase PostgreSQL stores users, accounts, transactions, budgets, cards, subscriptions, investments, obligations, agent plans, approvals, and audit events.
- Supabase Auth provides demo authentication and secure sessions.
- Row Level Security isolates records by authenticated user.
- State-changing services run server-side, verify authorization and approval, and use database transactions.
- The browser never directly performs privileged financial mutations.

### 3.3 AI and orchestration

- The deterministic demo agent is the required baseline and works without a paid model key.
- An optional live language model may interpret broader phrasing, but it can only propose typed intents and tool inputs.
- Read-only tools retrieve application data through authorized services.
- State-changing tools generate proposals first and execute only after a valid approval record exists.
- Tool output is treated as untrusted data for display and calculation, not as instructions.
- The model cannot write directly to database tables.

### 3.4 External services

- Frankfurter provides reference FX rates where supported.
- FX responses are cached with source and retrieval timestamps.
- A seeded fallback dataset keeps the competition demo reproducible and is clearly labeled.
- Vercel hosts the web application and server routes.
- GitHub is the source of truth for code and deployment integration.

## 4. Design System and Figma Structure

Create a new Figma file named **Fudan Global Finance AI** in the connected Figma account. The file uses these pages:

1. `00 Cover & Demo Map`
2. `01 Foundations`
3. `02 Components`
4. `03 Desktop Product`
5. `04 Mobile Product`
6. `05 Agent & Approval States`
7. `06 Competition Presentation`

### Visual foundations

- Deep navy `#101D3A`
- Primary blue `#2563EB`
- Background `#F6F8FC`
- White surfaces `#FFFFFF`
- Emerald for positive outcomes
- Amber for cautions and pending approvals
- Red for risk, failures, destructive actions, and insufficient funds
- Inter typography
- Rounded cards, subtle shadows, restrained gradients, accessible focus rings, and reduced-motion support

The interface uses a collapsible left sidebar, top navigation, account selector, notification center, simulation badge, and persistent AI Copilot launcher. Desktop screens optimize for judge demonstrations; mobile screens preserve the complete approval flow rather than reducing it to read-only cards.

Core components include account and metric cards, money values, currency pills, transaction rows, filter controls, charts, data tables, virtual cards, product comparison cards, status badges, tool-call timeline items, impact previews, approval cards, receipts, empty states, error states, loading skeletons, and confirmation dialogs.

## 5. Information Architecture

| Route | Page | Primary responsibility |
|---|---|---|
| `/overview` | Overview Dashboard | Consolidated finances, insights, alerts, command bar, and recent agent activity |
| `/accounts` | Accounts & Balances | Multi-currency balances, account details, and balance history |
| `/transfers` | Smart Transfers | Beneficiaries, transfer creation, schedules, receipts, and history |
| `/transactions` | Transactions & Bill Analysis | Categorization, filters, recurring detection, reports, and anomaly analysis |
| `/wealth` | Wealth Management | Risk profile, simulated product comparison, portfolio, orders, and performance |
| `/cards` | Card Management | Demo cards, freeze controls, limits, restrictions, activity, and alerts |
| `/subscriptions` | Subscription Management | Recurring services, renewals, usage flags, cancellation, and savings |
| `/fx` | Currency Exchange & Cross-Border | Reference rates, conversion, history, remittance planning, and source labels |
| `/planner` | Budget & Tuition Planner | Budgets, tuition obligations, allowance planning, emergency fund, and runway |
| `/copilot` | AI Banking Copilot | Conversation, plans, tools, approvals, execution, verification, and explanation |
| `/audit` | Notifications & Audit Trail | Alerts, approval history, tool events, changes, failures, and receipts |
| `/settings` | Settings & Security | Profile, security, simulation settings, data sources, and demo reset |

All routes read the same domain data. A successful transfer changes the account balance, transaction history, forecast, dashboard metrics, tuition status when relevant, agent verification panel, and audit log.

## 6. Shared Financial Data Model

All money is stored as an integer `amount_minor` plus an ISO currency code. Currency metadata defines its minor-unit exponent; IDR uses zero decimal places and CNY, USD, and SGD use two. Conversion calculations use decimal-safe arithmetic and persist the rate used.

Stable UUIDs identify all records. Every state-changing action includes an idempotency key, initiating user, plan/action reference, timestamps, and a resulting audit event.

### Principal entities

- `users`: profile, home currency, locale, risk-profile reference.
- `accounts`: owner, type, currency, balance, available balance, status.
- `exchange_rates`: base, quote, decimal rate, provider, reference timestamp, retrieval timestamp, live/fallback flag.
- `beneficiaries`: owner, display name, phone, account alias, supported currencies, verification state.
- `transactions`: account, direction, amount, original currency, category, merchant, timestamps, transfer linkage, investment linkage, and recurrence metadata.
- `transfers`: source, beneficiary or tuition obligation, amount, currency, schedule, status, idempotency key, receipt reference.
- `budgets`: month, category, limit, actual spend, currency, status.
- `cards`: account linkage, masked number, card type, freeze state, daily and monthly limits.
- `card_restrictions`: card, merchant category, allow/deny state.
- `subscriptions`: merchant, amount, currency, cadence, next renewal, last usage, active/cancelled state.
- `investment_products`: fictional product, category, simulated risk, fees, liquidity, historical-simulation fields, disclaimer.
- `holdings`: owner, product, units, cost basis, simulated value.
- `investment_orders`: product, buy/redeem direction, amount, status, idempotency key.
- `tuition_obligations`: institution, installment, amount, due date, paid amount, status.
- `ai_conversations` and `ai_messages`: conversation history and structured message metadata.
- `agent_plans`: normalized intent, context snapshot, calculations, status, and version.
- `agent_actions`: ordered tool proposal, input, expected impact, validation result, execution result.
- `approval_records`: action, user decision, approved payload hash, timestamp, expiration.
- `audit_events`: append-only event type, actor, target, before/after summary, outcome, correlation ID.

Internal transfers are linked across both account entries and excluded from income totals. Investment buys and redemptions are classified as asset movements, not consumption. Original transaction currencies are always preserved.

## 7. Seeded Demonstration Profile

The fictional user is an Indonesian Fudan student in Shanghai. Seed data must remain internally consistent and be regenerated from a versioned seed function.

### Monthly living budget

| Category | CNY |
|---|---:|
| Rent | 2,800 |
| Food | 1,250 |
| Transportation | 260 |
| Shopping | 580 |
| Other | 310 |
| **Total** | **5,200** |

### Required seed objects

- CNY daily account with CNY 18,650 available.
- CNY savings account with CNY 12,000 and a CNY 15,000 emergency-fund goal.
- IDR account with IDR 2,500,000 and a recurring family allowance/remittance of IDR 10,000,000.
- USD account with USD 650 and SGD account with SGD 420.
- At least three beneficiaries, including Zhang Wei.
- Transaction history covering income, five expense categories, anomalies, recurring charges, internal transfers, and investment activity.
- A CNY 5,000 upcoming tuition installment.
- At least two fictional virtual cards, including an online-shopping card.
- At least four subscriptions, including an unused video subscription priced at CNY 68 per month.
- Fictional money-market, bond, balanced, and equity-index products and at least two holdings.
- Seeded FX reference rates with timestamps and fallback labels.

The reset operation deletes only the signed-in demo user's mutable demo rows and recreates them from the versioned seed within one server-side transaction.

## 8. Scenario Workflows

### 8.1 Smart Transfers

The transfer form supports beneficiary, phone number, and natural-language initiation; saved beneficiaries; scheduled and recurring transfers; split payments; balance validation; confirmation; receipts; and history.

For “Send CNY 800 to Zhang Wei tomorrow morning,” the agent extracts beneficiary, amount, currency, and schedule. “Tomorrow morning” resolves to 09:00 in Asia/Shanghai, is displayed explicitly, and remains editable before approval. Ambiguous or duplicate beneficiary matches trigger clarification. The service validates account status, currency, available balance, schedule, approval payload hash, and idempotency key before execution.

### 8.2 Bill Analysis

Transactions support automatic seeded categorization, manual corrections, monthly and annual summaries, income and expense trends, recurring detection, anomaly flags, search, filters, details, and guarded CSV import.

For “Why did I spend more this month, and where can I save CNY 500?”, the agent compares actual categorized transactions between periods, returns the precise difference and contributing categories, and recommends savings whose stated amounts add to the proposed target. It must return “insufficient data” where comparison data is absent rather than inventing values.

### 8.3 Wealth Management

The wealth module contains a risk-tolerance questionnaire, fictional product catalog, comparison view, risk-return explanation, asset allocation, simulated buys and redemptions, portfolio performance, and order history.

For a low-risk CNY 10,000 request, the agent gathers risk tolerance, horizon, and liquidity needs; compares only suitable seeded products; displays risks, fees, liquidity, and simulated data labels; and requests approval before a buy. No language may guarantee returns.

### 8.4 Card Management

The card module supports demo issuance, masked card numbers, freeze/unfreeze, daily and monthly limits, merchant-category restrictions, transaction activity, and security alerts.

For “Freeze my online shopping card and lower its monthly limit to CNY 1,000,” the agent resolves the card, proposes two independently approvable actions, previews the before/after state, and updates the card only after authorization.

### 8.5 Subscription Management

Recurring detection populates active subscriptions, next renewals, monthly costs, annualized costs, usage-based attention flags, reminders, simulated cancellation, and estimated savings.

For “Find subscriptions I don't use and help me save money,” the agent identifies candidates using seeded last-usage data, shows monthly and annual savings calculations, and requires confirmation for each cancellation.

### 8.6 Cross-scenario AI Banking Agent

The Copilot coordinates all domains through the controlled pipeline:

`Understand → Retrieve → Plan → Calculate → Validate → Approve → Execute → Verify → Explain`

Planning never mutates data. Approval records bind to an exact action payload hash and expire after ten minutes. Execution revalidates balances and current state to prevent stale approvals. Verification rereads affected records rather than trusting the mutation response alone.

## 9. Agent Tool Contracts

Every tool has a typed schema, authenticated user context, structured success/error output, correlation ID, and audit event. Tools never accept a user ID supplied by the model.

### Read-only tools

| Tool | Core input | Core output |
|---|---|---|
| `get_accounts` | optional currency/status filters | authorized accounts with balances |
| `get_balance` | account ID | current and available balance |
| `list_transactions` | date/category/search filters | paginated transactions and totals |
| `analyze_spending` | period and comparison period | category totals, deltas, anomalies |
| `get_budgets` | month | limits, actuals, remaining amounts |
| `list_subscriptions` | status/usage filters | recurring charges and savings fields |
| `get_cards` | status/type filters | masked cards, limits, restrictions |
| `list_investment_products` | risk/category filters | fictional products and disclaimers |
| `get_portfolio` | optional valuation date | holdings, allocation, simulated performance |
| `get_fx_reference_rate` | base, quote, amount | decimal rate, converted amount, source, timestamp |
| `forecast_cash_flow` | horizon and scenario adjustments | opening cash, flows, closing cash, runway |

### State-changing tools

| Tool | Required validation | State effect |
|---|---|---|
| `create_simulated_transfer` | approval, balance, beneficiary, currency, idempotency | transfer, ledger entries, receipt |
| `schedule_simulated_transfer` | approval, schedule, balance policy, beneficiary | scheduled transfer record |
| `update_budget` | approval, positive limit, valid month/category | budget revision and audit event |
| `freeze_card` | approval, owned card, current state | card status update |
| `update_card_limit` | approval, nonnegative limit, policy rules | limit update |
| `cancel_demo_subscription` | approval, active subscription | cancelled state and forecast update |
| `buy_demo_investment` | approval, suitability, liquidity, balance | order, cash movement, holding update |
| `redeem_demo_investment` | approval, units/holding availability | order, holding reduction, cash movement |

Standard errors include `CLARIFICATION_REQUIRED`, `VALIDATION_FAILED`, `INSUFFICIENT_FUNDS`, `APPROVAL_REQUIRED`, `APPROVAL_EXPIRED`, `STALE_STATE`, `DUPLICATE_ACTION`, `NOT_AUTHORIZED`, `RATE_UNAVAILABLE`, and `EXECUTION_FAILED`.

## 10. Flagship Competition Demo

The dedicated “Run Competition Demo” action submits:

> Pay my CNY 5,000 tuition installment, reduce my shopping budget by 20%, cancel my unused video subscription, and show my remaining cash runway.

The deterministic agent must:

1. Retrieve balances, the tuition obligation, shopping budget, active subscriptions, and expected expenses.
2. Calculate the shopping limit as `CNY 580 × 80% = CNY 464`, a monthly reduction of `CNY 116`.
3. Identify the seeded unused video subscription and calculate savings from its stored CNY 68 monthly cost.
4. Forecast cash runway from current liquid account balances converted to CNY, expected inflows, obligations due in the selected horizon, and approved scenario adjustments. Runway equals post-obligation liquid cash divided by forecast recurring monthly outflows; one-off tuition is deducted from cash but not treated as recurring monthly consumption. The calculation panel exposes every balance, rate, obligation, adjustment, and rounding step.
5. Present the tuition transfer, budget change, subscription cancellation, and forecast as separate action cards. Forecasting is read-only; the first three actions can be approved or rejected independently.
6. Revalidate and execute approved actions in order. An insufficient balance blocks only the transfer and does not falsely mark it completed.
7. Reread balances, transactions, budget, subscription, tuition status, forecast, and audit events.
8. Present a before/after comparison and list any rejected, blocked, or outstanding action.

Resetting demo data must reproduce the same starting state and allow the flow to run again.

## 11. Security, Reliability, and Responsible AI

- Supabase Auth sessions use secure cookies and server-side verification.
- Row Level Security policies restrict every user-owned table.
- Privileged mutations run on the server with explicit ownership checks.
- Sensitive actions require approval bound to the exact action and payload.
- Database transactions preserve atomicity within each action.
- Idempotency keys prevent double execution from retries or repeated clicks.
- Append-only audit events record proposals, decisions, executions, failures, and resets.
- Rate limits protect agent and mutation endpoints.
- Tool outputs and imported CSV text are delimited as untrusted content to reduce prompt injection risk.
- The agent follows tool schemas and allowlists; it cannot construct arbitrary SQL or call arbitrary URLs.
- Logs exclude full account identifiers, secrets, and private card data.
- Card numbers remain fictional and masked.
- Investment products and returns are labeled simulated on every relevant view.
- FX data shows provider and timestamps; fallback rates are never described as live.
- Error messages explain the failure without exposing internals.

## 12. Functional and Interaction Requirements

Every primary control must either perform a meaningful action or be clearly labeled as a future capability. Required working interactions include navigation, responsive sidebar, account switching, transaction filters, transfer creation, budget editing, card controls, subscription cancellation, product comparison, simulated investment orders, FX conversion, approval/rejection, receipts, audit filtering, competition demo, and demo reset.

Each data experience includes loading, empty, success, recoverable failure, and permission-denied states. Mutations disable repeated submission while pending and show confirmed results only after verification.

## 13. Testing Strategy

### Unit tests

- Money formatting and integer-minor-unit arithmetic.
- Percentage and budget calculations.
- FX conversion rounding.
- Subscription monthly/annual normalization.
- Cash-runway forecasting.
- Internal-transfer and investment exclusions from consumption/income reports.
- Intent parsing for deterministic competition commands.

### Service and integration tests

- Authorization and Row Level Security isolation.
- Approval payload binding and expiration.
- Insufficient-funds rejection.
- Idempotent transfer and investment execution.
- Partial approval in multi-action plans.
- State propagation across affected modules.
- Demo reset reproducibility.
- FX live/fallback labeling.

### End-to-end tests

- Smart transfer with approval and receipt.
- Ambiguous beneficiary clarification.
- Card freeze plus limit change.
- Subscription cancellation and savings refresh.
- Simulated investment buy and portfolio refresh.
- Full flagship competition demo, including partial rejection and an insufficient-funds variant.
- Desktop and mobile approval flows.

## 14. Implementation Phases

1. **Foundation:** repository, Next.js application, design tokens, navigation, database schema, seed system, authentication, dashboard shell.
2. **Core banking:** accounts, transactions, transfer workflows, analytics, and shared calculations.
3. **Financial controls:** wealth, cards, subscriptions, budgets, and tuition obligations.
4. **Agent:** typed tool registry, deterministic interpreter, plan model, approvals, execution, verification, and audit trail.
5. **International student finance:** FX sources, multi-currency conversion, allowance planning, tuition forecast, emergency fund, and runway.
6. **Competition polish:** guided mode, flagship demo, mobile layouts, accessibility, tests, Vercel preview, and final presentation QA.

Each phase ends with automated tests and a browser verification pass before the next phase begins.

## 15. External Project Plan

After this specification and the implementation plan are approved:

- Create a new GitHub repository at `jamienatorX/fudan-global-finance-ai` without modifying `jamienatorX/QFin-Terminal`.
- Create a new Vercel project named `fudan-global-finance-ai` in the connected James account/team and connect it to the new repository.
- Create a new Figma file titled **Fudan Global Finance AI** in the connected `jamesmatmaja@gmail.com` account.
- Configure Supabase only through a dedicated new project; do not reuse unrelated production data.
- Deploy previews first. Promote to production only after the full competition flow passes.

## 16. Acceptance Criteria

The build is complete when:

- All six scenarios work as interactive prototype workflows.
- All modules derive from consistent shared financial state.
- The agent can generate and display multi-action plans.
- Every sensitive state change requires granular user approval.
- Approved actions change state and refresh every relevant module.
- Financial calculations pass automated tests and display their inputs.
- The flagship instruction runs end to end and is reproducible after reset.
- Insufficient funds and stale approvals are blocked safely.
- Ambiguous requests trigger clarification.
- Desktop and mobile flows are usable and accessible.
- Live, cached, fallback, fictional, and simulated data are clearly distinguished.
- Figma, GitHub, Supabase, and Vercel artifacts are separate from QFin Terminal.

## 17. Key Assumptions Requiring No Further Product Decision

- The competition version prioritizes a deterministic, reproducible agent over dependence on a paid live model.
- The system uses a fictional signed-in demo user and simulated data.
- CNY is the reporting currency while original currencies remain preserved.
- The product uses a new project and repository rather than replacing QFin Terminal.
- Individual action approval is the default for multi-action plans.
- Asia/Shanghai is used for tuition, transfer scheduling, and competition-demo dates.
