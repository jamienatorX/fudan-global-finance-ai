# Hosted Fufu release

This release merges the approved Fufu conversational agent, security controls and 3D mascot into upstream main 2cc555669ba6fe7c44b78774f05a07e66c601140, preserving newer dashboard, investing, wallet and localization modules.

Production demo chat uses shared Supabase rows behind a server-only random secret. Rows are fictional conversations only, expire after30minutes, require version checks and have global/per-session quotas. The free Nemotron model is pinned; no paid fallback is enabled. Production opt-in to provider collection applies only to fictional demo conversations. Private banking retains stricter provider routing, user/session/MFA checks and exact confirmation.

Vercel environment configuration is stored outside Git. The hosted demo migration requires a separate secret-hash seed. Turnstile public sitekey is configured; the matching secret must be saved in Supabase and CAPTCHA enabled before authenticated sign-in is considered verified.
