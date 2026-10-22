# Fudan Global Finance — Banking Simulation Guide

## Scope

The current deployed application is a fictional banking simulator. It supports accounts, transfers, spending reports, card controls, subscription decisions, tuition budgeting, fictional investments and illustrative FX conversions.

The connected agent is available locally at `/copilot` in scripted mode and inside signed-in `/banking` through server tools. Optional live interpretation needs explicit server-side model configuration. See [Connected Agent Guide](connected-agent.md) for setup, evidence and realistic demo flows. Production rollout and live-model behavior have not been verified by this implementation.

## Try the public demo

1. Open `/overview`; use the shortcuts to explore simulated transfers, spending, and tuition planning. Select **Explore the product** to launch `/showcase`, a Phase 6 guided demonstration linked to current fictional state.
2. Create an approval-gated fictional transfer, freeze a virtual card or review a subscription cancellation.
3. Visit `/audit` for local action receipts.
4. In `/settings`, type `RESET DEMO` to restore the seeded fictional state. The public demo is browser-local and is **not** the secure backend.

## Investing and card reminders

Open `/investing` from the sidebar or the bottom of Overview. Browse stocks, forex, crypto sandbox examples and fictional Chinese government bonds. Star assets to build a watchlist, review a simulated buy or sale, and confirm it to update cash, holdings, transactions and audit history together. All prices and bond terms are illustrative CNY-equivalent fixtures, with no real trading or market connectivity.

At `/cards#reminders`, enter a card nickname, last four digits, CNY statement amount and due date. Choose a one-, three- or seven-day alert, then download and import the calendar file for notifications outside the website. Reminder status also appears on Overview and in the notification bell. Reminders persist on this browser only; marking paid does not make a payment. Reset Demo also clears these preferences. See `docs/research/investing-reference-review.md` for references and limitations.

## Try persistent banking

Register at `/register`, sign in, then open `/banking`. Initialize a fictional portfolio once. Review individual financial actions, approve or reject them, and confirm that the account balance, ledger and audit history reflect the result. Data is stored in owner-scoped Supabase tables; it does not transfer real funds.

## Safeguards and limitations

- All account values are simulated. Never use real bank credentials or sensitive customer data.
- The authenticated lab uses server-side authorization; the public UI demo uses browser-local state.
- Illustrative FX figures are not executable rates.
- Scheduled public-demo transfers are displayed but not automatically settled.
- There is no active AI agent, model integration, or natural-language planning workflow. This release is a banking prototype and **does not claim to meet an AI-agent competition requirement**.
