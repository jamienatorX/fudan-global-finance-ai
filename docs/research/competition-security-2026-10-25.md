# Security research notes — 25 October 2026

Read-only baseline for the planned competition work. No new security code or migrations have been implemented/applied by this research step.

- Published/source baseline:39e849f3028a6adc8d36c9ef9aaf94357da5043c.
- Hosted project metadata: ACTIVE_HEALTHY, PostgreSQL17; existing banking_security, connected_agent, agent_all_features, agent_conversations and hosted_demo_conversations migrations are applied.
- Catalog inspection found existing private.bank_sessions/rate_windows and public sim_actions/plans/conversations/audit tables. No workflow/operator/safety-lock schema was present in this inspected table set.
- private.bank_guard currently checks owner/session/AAL2, 15-minute idle/8-hour session limits and recent MFA for writes. It is not evidence of a CNY1000/day competition tier policy.
- Existing test sources cover immutable approvals, owner/session isolation, rejected/expired/stale approvals, insufficient funds, verified results and duplicate execution receipts. These do not establish a real phone authenticator challenge or operator availability.
- Current human-support demo form sets local sent state and explicitly says messages are not delivered. A persistent operator ticket/inbox is needed for genuine takeover.
- SQL failure-counter design must account for transaction rollback. Incrementing a counter then throwing an uncaught error does not persist that failed attempt; new failure-lock proof must verify the durable denied-event boundary, not just a UI flag.

Primary references inspected:
1. https://github.com/openai/openai-agents-js/blob/main/examples/agent-patterns/human-in-the-loop-server.ts — server-owned resumable approvals and exact pending-call binding.
2. https://openai.github.io/openai-agents-js/guides/human-in-the-loop/ — approval interruption lifecycle.
3. https://docs.langchain.com/oss/javascript/langgraph/persistence and /interrupts — checkpointing, interruption and replay-safe resumption.
4. https://supabase.com/docs/guides/auth/auth-mfa and /guides/database/postgres/row-level-security — enforce verified session assurance and ownership in the backend.
5. https://fintechathon.g-ican.com/ — official Banking AI Agent brief, captured during the preceding alignment check.

Patterns are referenced rather than copying upstream code or adding a framework dependency. No paid fallback or extra model key is proposed. Public chat/voice remains fictional; real security evidence belongs to authenticated isolated fixtures and controlled live checks, clearly distinguished.
