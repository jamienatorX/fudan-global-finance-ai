# Submission review — 25 October 2026

Status: final fixes under verification. Website: https://fudan-global-finance-ai.vercel.app.

## Scope and evidence

Reviewed the live production release 5efeead2dfb1e08cd55d1968241fff699087d7f6 with Chromium. Nineteen routes checked at 1440px and 390px in light/dark device appearance: 76 page checks. Homepage opens Overview; public product routes load; Security/Banking correctly redirect unauthenticated visitors to sign-in. No browser page errors, broken images, horizontal overflow or application error pages in those checks. Screenshots and raw pages.json are saved in the chat outputs/submission-review-2026-10-25 folder.

Targeted visible-control checks found no missing accessible labels on the sampled Overview, Transfers, Subscriptions, FX and Login pages. Contrast spot checks of plain backgrounds found faint mobile-light FX header text (1.97:1); gradients were excluded from automated scoring and visually inspected. This is not a complete WCAG audit or physical-phone test.

## Corrections

1. Recognize “Help me plan Spotify tomorrow” without losing Spotify when the model leaves the target blank. A regression reproduced the failure before the fix.
2. Keep calculated cash and monthly-budget results in the chat reply when a subscription plan is also present. Previously a planning reply returned early and hid the requested budget answer. Both English and Chinese now include the exact computed monthly-budget remainder; excluded provider payments are stated explicitly. No financial arithmetic or authorization changed.
3. Improve mobile-light FX header contrast using the existing semantic muted-text color. Desktop dark ticker styling stays scoped separately.
4. Update outdated project documentation and an old browser-test assertion that claimed AI was absent. Preserve clear fictional-finance, provider-limit and real-payment boundaries.

## Real live flows

- Balance question returned recorded CNY18650 daily +CNY12000 savings and SGD420, along with other recorded accounts.
- IDR10000 spending and SGD 100 future spending answered independently: IDR2490000 and SGD320 remain. No automatic conversion or payment occurred; missing monthly budgets were disclosed.
- Spotify/Taobao planning asked for missing cost/date and did not buy/cancel.
- Combined Evan/Taobao/budget request exposed the hidden-budget reply defect, now covered by regression tests. Evan is not in the seeded verified-recipient list (Zhang Wei, Sari Pratama, Li Mei); requesting a verified recipient is correct, not a broken transfer.
- Card freeze review showed the exact card/change and confirmation requirement. Cancel left Review freeze available: no card mutation.

## Presentation guidance

Use the public root URL for judging. Start with balances, then the cross-currency question, then subscription planning. For an executable fictional transfer select an existing verified recipient such as Zhang Wei. Review confirmations before changing fictional data. Prepare voice once before presenting: its first-use on-device model download is about 211 MB, and names/amounts need transcript review. Voice was publicly verified in the preceding release; a fresh smoke follows this release.

The public website is a financial prototype. Merchant purchases and automatic future cancellations are not connected. Free model availability can vary. This review does not certify competition eligibility/compliance without the actual final rubric. Authenticated sign-in/MFA was not completed with a real test account in this review.

## Release verification

505 automated tests passed across 95 files after the fixes. TypeScript, targeted ESLint and the production webpack build passed. A fresh independent reviewer found no Critical/Important issues; their wording suggestion was applied so excluded-provider-payment wording does not overgeneralize across currencies. The 6 focused subscription-planning tests then passed again. Final live rechecks follow deployment.
