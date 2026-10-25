# Production rollout review — 26 October 2026

The user approved the design, implementation, local testing and Vercel publication. The design reserves a final review of concrete production database changes.

Apply only these three additive migrations, in this order, to `geqamggjfmkcvjuaokzz`:

1. `supabase/migrations/20261025160007_competition_permission_policy.sql`: private policy/grant/transfer-usage/lock tables, owner-readable append-only security events, invoker API wrappers. Backfills executed transfer/tuition usage. Preserves account values and ledger history. Shared execution rejects missing fresh action-bound MFA; tuition contributes to the daily limit; card freeze/unfreeze is Red. Unknown FX escalates Red. Locks preserve denied-event evidence.
2. `supabase/migrations/20261025160008_competition_workflows.sql`: owner-scoped workflow/node tables, validated topological dependencies, bounded prepare/confirm, pause/resume/cancel, conservative reversal proposals. Original ledger entries remain. No unattended worker or scheduling service.
3. `supabase/migrations/20261025160009_competition_operator_inbox.sql`: private operator-role table (EMPTY), owner/assignment-scoped tickets/messages, redacted claim queue, consented context, role+MFA+claim checks, explicit handoff release and owner security recovery. NO account is automatically granted an operator role.

No account reset, destructive table replacement, real payments, new service-role/browser key, paid service or provider change. Existing authenticated users must verify each Red action again. Existing pending actions are evaluated under the new policy at execution. Public browser simulation does not prove production authorization.

SQL is the linked review artifact; generated migration timestamps differ from hosted application timestamps if applied through the connector. Preserve migration names/history when recording application.

Before rollout: local migration/negative tests, typecheck, changed-code lint and production build must pass. After rollout: inspect migration history/function grants and public RLS catalog. Publish only this feature's reviewed files against current remote main with a lease. Check Vercel READY and root URL/public regression.

Recovery: each migration is transactional. If a migration fails, inspect its error without resetting the database. Do not restore old execute wrappers after user activity: that would remove new security checks. If application deployment fails, retain secure database functions, fix the compatible app and redeploy. Existing old buttons will fail closed for Red actions until the verification UI is deployed. Use maintenance messaging rather than disabling MFA/locks.

Still human-operated: actual Supabase authenticator smoke and role provisioning of a chosen team account. The inbox is a durable queue, not a promise that staff are online. Credentials, QR codes and TOTP secrets must stay outside chat and logs.
