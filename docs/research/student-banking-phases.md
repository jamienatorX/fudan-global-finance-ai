# Student banking phases — 20 October 2026

The project uses Next.js 16 App Router, React 19, TypeScript and Tailwind. Product pages are in `app/(product)`. `LiveOverview` reads `DemoProvider` through `useDemoOverview`; `getOverviewModel` derives financial metrics. `seed.ts` is the deterministic fixture; `demo-engine.ts` applies approved browser sandbox actions. Shared FX context provides a single global freshness label; public rate quotes are used only for current conversion estimates, not to rewrite accounting history.

## Phase 1 — Bugs

Amounts have nowrap and card-relative type scaling; icon foregrounds explicitly contrast with their surfaces. Sidebar geometry uses CSS at 64rem from first render; the brand subtitle wraps. Greetings follow Shanghai time. Shared FX freshness replaces conflicting overview labels. Branding is 福 Bank, including calendar reminders and page metadata. Subscription charges have a separate category; a non-destructive browser migration splits their budget from Other while preserving total spending and limits.

## Phase 2 — Honest numbers

Runway if income stops reserves next tuition before dividing cash by consumption. Net-burn runway subtracts normalized recurring inflow; no positive burn has no finite duration. Received recurring and one-off income are separate. Cash-flow history uses daily steps. Emergency funding shows its configured target. Flagged transactions show amounts, dates and observed same-category baselines, including an explicit note when a stored flag does not exceed the observed comparison. Links target their actual account and transaction.

## Phase 3 — Overview

The order is safe-to-spend, net worth and cash, alerts, tuition, recent transactions, quick actions. Detailed cash flow and spending are in Wealth; forecasts, runway and habits are in Planner; card gallery and reminders are in Cards; investment movements are in Investing. Membership rewards completed budget months, current savings streaks and emergency-goal progress. Old isolated savings months do not imply an active streak. A persistent sandbox badge explains fictional funds.

## Phase 4 — Practical tools

Safe-to-spend reserves tuition, subscriptions, observed recurring bills and scheduled external bills due by the next recurring inflow; overdue unpaid obligations remain reserved. A missing future inflow uses a clearly labelled 30-day horizon. Daily amounts round down; shortfalls are explicit. Time comparisons use parsed instants, not lexical timestamp strings.

Remittance quotes simulate IDR/CNY moves between owned demo accounts. Fees are illustrative (0.35% + IDR 5,000 or CNY 2), with source debit, recipient credit and a separate fee ledger entry after confirmation. Published history drives direction-aware comparisons; insufficient data yields no comparison. Tuition shows its CNY obligation and an IDR estimate, with observed historical scenarios rather than predictions.

Alipay/WeChat CSVs support UTF-8 and GB18030, explicit excluded/invalid rows, source order IDs plus fallback dedupe, preview and confirmation. Imports add historical records and matching budget spending, never subtract current bank balances again. Subscription Cancel/Snooze/Keep decisions persist in the browser snapshot. Parent reports default to IDR, offer selectable month/currency, aggregate share links and Print / Save as PDF. Shared links contain only saved fictional aggregates; zero consumption is not reported as zero runway.

## Phase 5 — Mobile and verification

Below 64rem the sidebar is hidden and a bottom tab bar provides Home, Accounts, Send/Receive, Cards and More. More uses the existing focus-trapped drawer and restores focus to the initiating control. At phone widths the header is compact and the safe-to-spend hero includes the next bill and Send/Receive controls.

All 297 Vitest unit, component and PostgreSQL integration tests passed; focused follow-up tests also passed. TypeScript passes. Lint has no errors and six pre-existing warnings. Production build passes. App smoke checks at all requested client-hint widths return HTTP 200, and all affected routes are checked.

Rendered checks at 375, 800 and 1280 could not launch: this environment has neither browser control nor the required Playwright Chromium executable. The viewport regression tests are saved in `tests/e2e/student-banking.spec.ts`; no visual pass or screenshots are claimed. PDF printing also needs a real browser to verify. The database compatibility migration is source-only; no remote database was modified. Live FX/history availability depends on the public provider. New banking actions remain browser-persisted simulations with fictional funds.

## Reconciliation baseline

- Available cash: CNY 38,669.36.
- Net worth: CNY 40,201.36.
- Cash allocation: 96.2% (display rounding).
- Monthly consumption: CNY 5,200.00.
- Runway if income stops: 6.5 months.
- Forecast closing cash: CNY 33,014.81; 32,360.26; 31,705.71.

## Follow-up layout refinements

Financial alerts precede tuition planning, use a gold attention border and icon, and fill the available width with a responsive grid of transaction tiles. Amounts, dates, baselines and transaction links remain explicit. My account is accessed through the profile avatar beside Notifications; the duplicate Overview button is removed. Investing has equal-width Add funds and Withdraw actions; the Overview Invest shortcut still opens the market workspace.
