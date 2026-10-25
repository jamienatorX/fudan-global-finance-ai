# Banking mutation inventory

All exposed financial mutations remain SELECT-only tables plus checked RPCs. public.sim_execute → private.sim_execute → bank_checked_execute → revoked sim_execute_unchecked. public.bank_agent_execute uses the same checked boundary and revoked agent implementation. Public helpers are invoker wrappers around owner-checked fixed-search-path private functions.

sim_initialize, sim_prepare, bank_agent_sample_history, bank_agent_store_plan, bank_agent_prepare and conversation prepare/save use bank_guard(true), including the durable safety-lock check. Preparing does not authorize executing. Unknown executable types trigger a durable forbidden-operation hold. Model-generated SQL/shell/JavaScript has no execution entry point.

HTTP callers: /api/banking/action, /agent and /conversation. New /policy, /workflow and /support share same-origin, bounded-body, authenticated-session validation. No browser/model tier, verified flag, identity or operator role is accepted as authority.

Workflow nodes prepare and execute the same immutable actions. Paused/cancelled/dependency-blocked/handoff nodes are checked again inside bank_checked_execute, so direct action RPCs cannot bypass workflow state. Compensation uses a new action, checked state version and the same policy/MFA boundary.

Support requests/replies are permitted under a safety lock; they cannot change money. Operator claim/reply/propose/release/review functions check database roles, MFA and assignment. An operator proposal never invokes financial execution. Owner recovery is a separate recent-after-lock TOTP gate; suspicious holds also require operator review.

Initialization and history loading keep their pre-existing behaviour and cannot be used while locked. Read-only account access, sign-out, authenticator interaction and support remain available. Existing browser-local public simulation is outside this server ledger boundary and is not claimed as security proof.
