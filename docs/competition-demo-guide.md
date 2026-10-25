# Fudan Global Finance — Banking Simulation Guide

## Scope

The current deployed application is a fictional banking simulator. It supports accounts, transfers, spending reports, card controls, subscription decisions, tuition budgeting, fictional investments and illustrative FX conversions.

Fufu is available on the public homepage and `/copilot`, with task choices, natural-language planning, editable follow-ups, budget calculations and confirmation-gated simulated actions. The hosted release uses a configured free model, with deterministic tools for supported requests. The public conversation and live voice flow have been exercised on Vercel. Signed-in `/banking` remains a separate account/session/MFA-scoped flow; public-demo verification does not establish a successful authenticated sign-in.

## Try the public demo

1. Open `/overview`; use the shortcuts to explore simulated transfers, spending, and tuition planning. Open `/showcase` for a guided demonstration linked to the current fictional state.
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
- Free model availability is subject to provider limits. Fufu reports service failures and retains task forms; no paid fallback is enabled.
- Third-party merchant purchases and automatic future cancellations are not connected. Fufu can plan them and explain the next steps without claiming execution.
- Full competition compliance must be checked against the actual submission rubric; the website review is not a rules certification.

## Suggested three-minute presentation

1. Start at the root URL and show the homepage, Fufu mascot and fictional account overview.
2. Ask: “What are my available CNY and SGD balances?” Compare the answer with Accounts.
3. Ask: “If I spend IDR 10000 today, can I still pay SGD 100 tomorrow?” Fufu checks each currency separately and distinguishes cash coverage from missing monthly budgets.
4. Ask: “Help me plan Spotify tomorrow and cancel Taobao 88VIP next week. Do not pay or cancel anything yet.” Fufu asks for missing price/date information and makes no automatic change.
5. Open Cards, choose Review freeze, inspect the exact change, then Cancel to show the approval boundary.
6. Optionally show live Chinese/English dictation after preparing the voice model in advance. Review the transcript before Send.
