# FU Bank competition security and workflow design

Date: 25 October 2026. Status: approved 25 October 2026; implementation and local verification completed 26 October 2026. Hosted rollout is recorded separately in the release evidence. Baseline published commit:39e849f3028a6adc8d36c9ef9aaf94357da5043c.

## Intent and chosen approach

Close the competition gaps in enforced permission tiers, recoverable task execution, genuine human takeover and reproducible security evidence. Keep fictional finance, the current website, free-model configuration and exact user control over changes. No real bank or merchant-payment integration is introduced.

The user chose to extend the existing Next.js/Supabase engine and use a secure operator inbox inside FU Bank. Alternatives considered: migrate orchestration into LangGraph or OpenAI Agents SDK; or introduce a separate workflow/support service. Those patterns are useful references, but replacing the working approval engine or adding an always-on service would increase migration/operating scope without proving enforcement. No new paid service or model key is required by this design.

Three delivery phases: permission enforcement and security evidence first; persisted workflow/recovery second; operator inbox and final competition demonstrations third. This is substantial backend work, not a visual adjustment.

## Current evidence

The hosted Supabase project geqamggjfmkcvjuaokzz is healthy. Read-only metadata confirms the security, connected-agent, all-features and conversation migrations are applied. Existing code has immutable pending actions, owner/session checks, MFA gates, expiry/version checks, atomic per-action writes, receipts and isolated PostgreSQL tests.

Gaps: a verified login currently uses broad MFA checks rather than an explicit competition policy; conversation drafts are not a persisted dependency graph; individual atomic transactions do not establish whole-workflow recovery; the human-support dialog does not deliver to an operator; rate limiting does not establish a suspicious-action safety lock. There are no workflow/operator/safety-lock tables in the inspected hosted catalog. Source inspection and database metadata are evidence of implementation state, not a live MFA test.

## 1. Server-owned permission policy

Policy is computed from authenticated identity and trusted application/database records. The model cannot assign permissions, roles, risk tier, MFA status, policy version, approvals or execution results. Displayed tiers explain the backend decision; hiding a button is never the enforcement.

- Green: read-only balance, transaction, bill/budget and portfolio queries run without an action approval, within the account's existing authentication/session requirements.
- Yellow: exact confirmation for supported lower-risk mutations, including transfers whose executed-plus-proposed daily CNY-equivalent total is at most100000 minor units (CNY1000), simulated subscription cancellation and supported virtual-card application. All other mutations receive an explicit classification; unknown operations fail closed.
- Red: transfers crossing that cumulative daily boundary; investment purchases; supported loss/security actions. Require exact confirmation plus fresh, action-bound authenticator verification. Unsupported password/loss actions remain unavailable until there is a real implementation; they are not presented as completed.

The transfer day is Asia/Shanghai. Executed transfers are counted once by action ID; rejected/failed attempts do not consume the monetary allowance. Policy counts all supported transfer routes, not just Fufu. Same-user transaction locking serializes concurrent decisions. Re-evaluate before execution; a newly crossed threshold invalidates the prior lower-tier approval and requests a new review. Cancellation does not erase executed transfer history or automatically replenish the daily limit.

For other currencies, use a server-controlled, timestamped CNY-equivalent reference and store the rate/policy version with the decision. Never accept a browser/model exchange rate. Missing/stale conversion evidence escalates to Red rather than understating risk. Simulation fixtures must be labeled; real-value execution remains out of scope.

Use the existing owner/session/AAL2 baseline without weakening RLS. An enrolled authenticator is not proof of a completed challenge. Red verification must bind one use to user, session, pending action, immutable payload hash, state/policy version and expiry. A grant cannot authorize another amount, action, session or user. Establish verification from Supabase's verified result, not a client boolean. MFA codes, setup keys and tokens are never logged. Red denial must also hold when calling the RPC directly. Public browser-only simulation never claims verified MFA; Red actions direct to the verified account flow instead of pretending a mock code is authentication.

## 2. Safety lock and audit

Builder-selected defaults, to be configurable only in trusted server policy: three failed sensitive operations in a rolling10-minute window lock further mutations for15 minutes. Payload/approval tampering, a cross-owner action decision or a forbidden authority/code-execution attempt triggers an immediate hold. Mere mention of injection words is not an incident; the attempted forbidden operation is the signal. Normal clarification and model-service unavailability do not lock the user.

Denials/failure counters and lock events must survive the rejected operation. PostgreSQL writes followed by an uncaught exception roll back, so record a structured denial through a transaction-safe outer boundary; rollback the failed business mutation in a nested exception block, retain the failure event, and return the error envelope only after commit. Cover direct RPC entry points, not only HTTP wrappers. Do not let callers manufacture or clear another user's failures.

While locked, allow read-only account information, sign-out, MFA verification and support; block every mutation path and workflow step. Show reason category and expiry. Suspicious holds require fresh MFA and authorized operator review; timed ordinary-failure locks may expire or be cleared with verified owner recovery. Unlocking is audited and never reverses prior receipts.

Maintain append-only owner/session/action/workflow-correlated decision and outcome events: normalized intent category, policy decision/reason, approval/rejection, verification result, checkpoint, recovery and operator activity. Exclude passwords, TOTP values, secrets, bearer tokens and unnecessary personal data. Users can view/export their evidence; operators see only ticket-authorized minimum context. The model never writes audit facts.

## 3. Durable dependency workflows

Add persisted workflow, node, dependency, checkpoint and recovery records. Node types are allowlisted existing read tools, exact banking actions and approved compensation actions; never generated JavaScript, SQL, shell code or arbitrary network requests. This deliberately avoids arbitrary model-code execution. Explain that design in the competition security self-assessment; it is not a claim that a code-execution sandbox was built.

Validate acyclicity, ownership, node/edge limits and dependencies before saving. The server derives actionable nodes from validated intents. A node runs only after successful prerequisites; failures block descendants. Each execution uses a stable idempotency key, action hash and optimistic workflow revision. Persist before/after each step. Keep graph state and resume authority on the server; never accept replacement run state or approval objects from the browser/model.

Expose Prepare, Review, Confirm, Pause, Resume, Cancel remaining steps, Request recovery and Request operator. Pause/cancel takes effect between atomic steps; an already committed operation is reported accurately. Reloads or Vercel request termination resume from persisted state without replaying a completed effect. No new always-on worker is required: bounded server requests advance a workflow and persist the checkpoint. This does not promise unattended scheduling while nobody is invoking it.

Recovery is compensation, not deletion of ledger history. Offer supported reversible fictional operations with exact before/after evidence and a new approval; apply the same tier/MFA policy. Use version/state preconditions, reverse dependency order and idempotency. A later user change, insufficient compensation funds, unknown/irreversible effect or unsupported external operation blocks automatic compensation and goes to manual review. Never reverse someone else's subsequent activity or silently claim all steps rolled back. Preserve every original and compensating receipt.

## 4. Real secure operator inbox

Create durable owner-bound tickets, messages, assignments and workflow-handoff records. Sending a request really creates a ticket and returns its ID/status; it does not send an email or imply a person has read it. The requesting user sees persisted status and messages after reload.

The project owner explicitly provisions authenticated team accounts as operators through an administrative path; no self-registration, email-string matching or model-supplied role grants. All operator access requires MFA and checked role membership. RLS prevents ordinary users, unassigned operators and anonymous callers from browsing other tickets/account records.

Requesting takeover pauses the associated workflow. A role-authorized operator claims the ticket, reads consented workflow/decision context, asks questions or proposes a revised plan. Claiming, assigning and resolving are atomic/versioned and audited. Operators cannot bypass the customer's financial approval or impersonate their MFA. Revised actions return to the customer for exact approval. Resumption after handoff requires an explicit, audited release of the handoff and fresh state validation. Expired claims/revoked roles cannot resume work.

A real operator account must be selected before calling the inbox operationally staffed. Until that setup is done, show truthful queue status and no promise of response time. Anonymous public visitors sign in to create a private ticket; no fake “message sent” result. No external support service is selected.

## 5. Data/API integration and migration safety

Keep current accounts, balances and ledger rows. Add security-policy decision/grant/lock/event records, workflow/node/edge/checkpoint/compensation records and ticket/message/operator-role/assignment records. New tables get RLS, appropriate owner/state indexes and restrictive grants from creation. Privileged internal helpers stay private with fixed search paths and explicit identity checks; public wrappers expose only checked operations. No model/browser direct table mutations.

Inventory and guard every existing mutation RPC plus HTTP path so the new workflow cannot become an alternate bypass. Keep legacy single-action UI functioning through the same policy. Use response envelopes with stable safe error codes; no raw database/provider errors or secrets reach the UI.

Generate forward migrations with the Supabase CLI, test against disposable PostgreSQL fixtures, review the final SQL and verification evidence before any production application. New security/database changes are not covered by the earlier approval of the previous four migrations. No destructive reset of existing accounts. Production schema/role rollout gets a concrete final review; role grants require the chosen account identity.

## 6. Security proof and acceptance

Produce machine-readable test results plus a readable matrix mapping official requirement → enforcing source/RPC → positive/negative evidence → remaining live check. Never describe fixture claims as a real authenticator challenge or a formal penetration-test certification.

Required cases: CNY999/1000/1000.01; multiple transfers crossing the daily threshold; concurrent transfers and midnight Shanghai boundary; stale/missing FX risk escalation; unverified/expired/replayed/cross-session Red verification; direct-RPC and HTTP bypass attempts; tampered amount/role/approval; cross-user reads and operator claims; lock persistence despite failed transactions and rollback; unlocked read-only routes; reset/recovery abuse; malicious merchant/document/model strings; inability to run arbitrary code; secret-free logs; DAG cycles/missing dependencies; interruption and restart at every checkpoint; no duplicate effects; approved compensation and blocked unsafe compensation; real ticket creation/claim/reply/release; revoked operator permissions.

Use dedicated test identities and fictional data. Do not probe other users, brute-force live authentication, attack production availability, send real payments or weaken CAPTCHA/MFA. Keep local reproducible tests separate from the final controlled hosted smoke. If an isolated execution environment cannot support a check, record it as needs validation rather than inventing proof.

Live acceptance requires the user to perform an actual authenticator challenge and an authorized team member to exercise the operator inbox. A temporary test-account path may be prepared, but credentials/QR/setup keys stay outside chat and source. Record only nonsensitive pass/fail evidence. Provide three judge flows: Green account/bill query; Yellow confirmed low-value transfer/card/subscription change; Red threshold-crossing or investment action requiring MFA, plus failure-lock/recovery/handoff demonstration. Document prototype limits and free-provider availability.

## References and reuse boundaries

- Official competition Banking AI Agent brief: https://fintechathon.g-ican.com/ (full rendered brief captured in chat outputs/competition-live-brief.txt).
- OpenAI Agents JS server-owned approval example: https://github.com/openai/openai-agents-js/blob/main/examples/agent-patterns/human-in-the-loop-server.ts — immutable pending approvals and server-owned continuation; do not import its model/runtime just to reuse the pattern.
- LangGraph persistence: https://docs.langchain.com/oss/javascript/langgraph/persistence — durable checkpoints and resumable state.
- LangGraph interrupts: https://docs.langchain.com/oss/javascript/langgraph/interrupts — explicit pause/resume; replay-safe effects.
- Supabase MFA: https://supabase.com/docs/guides/auth/auth-mfa and RLS: https://supabase.com/docs/guides/database/postgres/row-level-security — server-enforced assurance and ownership.

Use original implementation in this repository. If copying upstream source becomes useful, first pin its revision, check its license and preserve attribution; the current proposal reuses architectural patterns only.
