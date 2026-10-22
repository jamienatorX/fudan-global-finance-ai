# Fufu, the connected FU Bank agent

Implemented locally, 22 October 2026. No hosted migration, deployment or real banking execution is implied.

## Where to use Fufu

Choose Banking agent in the public simulation sidebar (`/copilot`). Fufu reads and changes the same browser-local data as the existing product pages. Enrolled signed-in users also get Fufu inside `/banking`, where reads and changes use authenticated server data and existing owner, origin, MFA, session and rate checks. These data sources never fall back into one another.

Fufu is a little mint mascot inspired by the navy/mint 福 logo, with rosy cheeks, tiny feet and a wonky tie. Its expressions reflect working, verified success and unsupported requests. It is static, so there is no motion to disable, and has an accessible name.

## Connected feature coverage

| Area | What Fufu can do |
| --- | --- |
| Overview and accounts | Show owned balances, available funds and demo account goals. Keep currencies separate. |
| Transfers | Propose exact same-currency own-account transfers. The public demo additionally supports verified recipients and timezone-explicit future scheduling through its existing engine. Signed-in beneficiary/scheduled transfers are unavailable because its current backend does not support them. |
| Transactions | Search available records and show dates, directions and classifications, with coverage limits. CSV requests open the existing local preview screen; no persisted import is claimed. |
| Wealth | List fictional products, risk, supplied fees/liquidity and holdings; propose buy/redeem using explicit product, account and amount. Buying requires an explicit sufficient risk tolerance. Missing metadata is labeled unknown. |
| Cards | Show state, freeze/unfreeze and change monthly limits. |
| Subscriptions | Find recurring-payment candidates from actual dated records, show evidence/confidence, registered details and propose simulated cancellation. |
| FX | Get informational reference conversions using the same provider function as the website API, across its 19 listed currencies. If unavailable, explicitly labeled core-currency fixture quotes may be used. No actual exchange is executed. |
| Budgets and tuition | Show monthly caps, recorded spend where supplied, CNY-only runway assumptions and obligations; propose cap changes and full outstanding tuition payments. |
| Audit | Show retrieved activity and receipt identifiers; does not claim notification delivery. |
| Settings/security | Open dedicated profile, reset, CSV and security workflows. Passwords, MFA, session revocation and sign-out retain their own interactive controls and checks. |
| Navigation | Open allowlisted product sections; signed-in links go to authenticated banking tabs or Security instead of demo banking data. |

This is controlled tool access to existing functions, not unrestricted website/browser control. Default mode is a bounded deterministic interpreter. Optional live model mode broadens intent interpretation. Multi-turn conversational memory and automatic multi-action execution are not implemented. After a successful mutation, request a fresh plan before executing a remaining action.

## Reproducible commands

Start with **Show my accounts**, **Show my tuition**, **Show investment products** and **Show my budgets** to see exact names in the active data source. Names differ between demo and signed-in accounts.

Public demo examples:

- `Show my balances`
- `Transfer CNY 10 from daily CNY to savings CNY`
- `Send CNY 10 from daily CNY to Zhang Wei`
- `Transfer CNY 10 from daily CNY to savings CNY on 2028-01-01T12:00+08:00`
- `Set food budget to CNY 500`
- `Pay <exact obligation name from Show my tuition> from daily CNY`
- `Buy CNY 100 of <exact product name> from daily CNY with low risk tolerance`
- `Redeem CNY 50 of <exact product name> from daily CNY`
- `Show my holdings`
- `Show recent transactions` or `Find transactions for Campus`
- `Show audit history`
- `Convert USD 100 to CNY` or `Convert JPY 100 to CNY`
- `Open wealth`, `Open planner`, `Open security`, `Open CSV preview`
- `Freeze my shopping card`
- `Find recurring payments` and `Cancel Campus Video`

For each proposed change, review its exact fields, reject or confirm, and check the result on the existing feature page. Monetary inputs use currency-appropriate precision and integer minor units internally. A scheduled demo transfer creates a schedule record without debiting funds; there is no real scheduler or banking rail executing it later.

For recurrence: the original demo has one charge per subscription. Ask **Find recurring payments**, observe insufficient evidence, then explicitly load fictional purchase history under **Try a reproducible sample**. Ask again and expand the dated evidence. Sample loading never changes opening balances and is not real bank ingestion.

## Unsupported requests and human help

Unsupported capabilities use this requested product copy:

“Sorry, we cannot do that for now. We will resolve it as soon as possible. You can contact a human operator for help.”

The Contact a human operator button is always available. It opens a dialog with a copyable request summary. If no support destination is configured, the dialog states that no human channel is connected and no request was sent. It never invents an operator, address, ticket, deadline or live queue. Missing input, insufficient records/funds, declined confirmations and provider outages retain their own accurate messages rather than this unsupported-task apology.

Optionally configure server-only `FU_BANK_SUPPORT_URL=https://your-existing-support.example/contact` or a plain `mailto:` destination. Only validated HTTPS links without embedded credentials or plain mailto addresses are accepted. Nothing is sent automatically, and clicking an external channel never attaches financial context automatically.

## Execution, verification and data architecture

Command → source-specific context → typed plan → immutable prepared action → explicit decision → atomic existing engine → receipt/state verification → audit. Plans expire after ten minutes and bind account versions. Confirmation references the stored exact payload, not a replacement supplied by the browser. Existing owner/session/MFA checks remain in force.

The new forward migration extends agent wrappers to the six existing kinds: transfer, tuition, budget, subscription, card, investment. Private functions use an empty search path, authenticated guards and explicit owner predicates; public wrappers remain invoker functions. Existing table grants and RLS policies are retained. It verifies linked ledger entries, balances, tuition status, holdings and configured state, then persists the original verified result. Retries return that receipt even if later state changes, without repeating a debit.

Public actions reuse the demo engine and verify matching receipts/targets. Browser state is a demo, not a security boundary. Audits are retained in the same snapshot. Registered subscriptions alone do not prove a recurring contract; service usage remains unknown without separate metadata. Cancellation is simulated, not merchant contract cancellation or a promised refund.

Purchase history remains separate from transfers/investment ledger movements. Authenticated purchase queries paginate a stated three-year window, up to 5,000 records, and disclose truncation. General ledger/audit reads use the existing bounded previews and disclose that full history is not guaranteed. Real ingestion remains outside this implementation.

## Optional live model

Default: `BANK_AGENT_MODE=deterministic`, no model credentials required. Signed-in planning can opt into `BANK_AGENT_MODE=live` with server-only `OPENAI_API_KEY` and explicit `OPENAI_AGENT_MODEL`. Never expose these as NEXT_PUBLIC values. Model calls are not made by the public demo.

The strict structured response extracts one intent and typed fields, then validates current entities and capability before using the same planner. The model sees the command and minimal entity names/IDs; no balances, transaction history, credentials or authentication tokens are sent. Provider response storage is disabled. It cannot approve or execute actions. Model tests use mocks; no real provider call was performed.

## OpenRouter configuration

The signed-in agent can also use OpenRouter. Set these server-only values in the ignored local .env.local file or your hosting environment:

```env
BANK_AGENT_MODE=live
BANK_AGENT_PROVIDER=openrouter
OPENROUTER_API_KEY=<enter a new key securely>
OPENROUTER_AGENT_MODEL=<your selected provider/model ID>
```

Do not paste secrets into chat, the browser, .env.example or NEXT_PUBLIC variables. The existing local key was used for a synthetic live connection check at the user’s explicit request. It was never copied into source or logs. No model is selected automatically.

The transport uses [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs) over [Chat Completions](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion). Select a compatible model/provider; the request requires parameter support and denies routing to endpoints that collect data. This is not a guarantee that all routing/logging/retention is disabled: review OpenRouter account privacy settings and provider policy for the chosen endpoint. The application sends only the current command and minimal entity directory, never the entire financial snapshot. It checks the returned schema/entities, rejects refusal/truncated/invalid outputs, uses a fixed provider URL and refuses HTTP redirects. It never retries a different provider or sends an OpenAI key to OpenRouter. Raw provider errors are not returned to the browser.

Restart the local server after changing provider configuration. The conversational upgrade below supports both local demo chat and authenticated chat.

## Local rollout status

Review and apply both `20261021000100_connected_agent.sql` and the forward `20261022000100_agent_all_features.sql` through your normal migration process before hosted use. Application and migration changes must be deployed together. No hosted database was changed here.

Browser tests exercise desktop/mobile public journeys and a mocked authenticated UI contract. Actual ownership/atomic execution/verification is checked independently against local PostgreSQL-compatible migrations. These checks do not prove hosted login, production configuration, live support delivery or live support delivery.


## Conversational Fufu upgrade — 22 October 2026

Fufu now offers task cards, multi-task drafts, bounded conversation memory, visible field correction, explicit hypothetical reservations, and deterministic cash/monthly/category budget calculations. Each banking change still uses its exact confirmation and existing action executor. Plain text yes never approves execution. Evan is not invented as a recipient; Taobao subscription payment remains unsupported, while its 88-yuan cost can be explicitly included as a hypothetical reservation alongside a 500-yuan transfer and 1,000-yuan additional spending.

The anonymous conversation endpoint runs only on loopback in development. Its opaque HttpOnly cookie maps to a local SQLite store under .data/, with session/instance quotas and revision checks. Browser financial data is fictional and bounded. Production anonymous chat requires a separately designed shared store and rate limiting. Authenticated chat uses owner/session-scoped sim_agent_conversations and the forward migration 20261022000200_agent_conversations.sql, plus all preceding migrations. No hosted migration or deployment was performed.

The model receives minimal entity names and draft/history text, not balances or transaction snapshots. Output is schema checked, and model text has no execution authority. OpenRouter returned HTTP 200 in synthetic live checks using the local configuration; the selected model produced invalid task values, which were rejected. This demonstrates key connectivity, not reliable natural-language readiness. Task forms remain available. Select a model that reliably follows structured output before relying on free-form chat. No provider/privacy fallback was enabled.

Verification: production build and typecheck passed; 341 tests passed in the full run, with two additional expiry regressions passing subsequently; 20 desktop/mobile browser journeys passed. Browser language responses were fixtures, not proof of live language quality. Local database tests exercise actual migrations, ownership, stale-action invalidation, immutable receipts and session isolation. Lint has no errors, with three pre-existing warnings elsewhere.

## Free Nemotron demo configuration — 22 October 2026

The user selected `nvidia/nemotron-3.5-super-vl:free` and explicitly chose the free-provider data-use option. `OPENROUTER_DEMO_ALLOW_DATA_COLLECTION=true` now allows provider collection only for development, fictional browser-local multi-turn conversations on a model ID ending `:free`. Default/example configuration is false. Private conversations, legacy signed-in interpretation and production requests retain `data_collection: deny`. Account-level restrictions may independently block routing. Do not submit real banking or personal details to the free demo.

Nemotron task interpretation disables its optional reasoning to avoid spending the short response budget on hidden reasoning. Exact schema validation, bounded input, fixed endpoint, server-only key handling and all execution confirmation checks remain active. No paid model fallback was enabled.

Live verification: the first unrestricted attempt returned provider HTTP 502; another timed out. After disabling optional reasoning, the real configured free-model request passed the transfer + Taobao subscription payment + affordability task check. This confirms one successful synthetic request, not guaranteed free-provider availability. The focused model/privacy/UI suite passed 18 tests. No hosted deployment was performed.
