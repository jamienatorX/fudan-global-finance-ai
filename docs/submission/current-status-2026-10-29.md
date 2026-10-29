# Current submission status — 29 October 2026

This record supersedes pending or outdated statements in the historical reports.

## Verified engineering evidence

- Complete-scenario release: 614 regression tests, four actual Chromium UI checks and eight independent PostgreSQL concurrency checks passed in a disposable cloud environment. Browser checks used fictional transport fixtures; SQL identities were controlled fixtures, not live Auth sessions.
- Production Red transfer passed at 16:17:06 Shanghai time on 29 October. The user entered action-bound authenticator verification and pressed Confirm. Exactly one CNY 1,001 own-account transfer executed, with two ledger entries, one consumed verification grant, one evidence record and ACTION_MFA_VERIFIED / EXECUTED_Red events. Total CNY stayed unchanged. Earlier expired drafts had no ledger entries.
- Confirm repair corrected malformed UUID validation. Ten endpoint security tests and TypeScript passed. Production build reached READY on commit ba91eae3fc4c72bcae1d30a43133d2710aa156f0.
- Hosted support delivery passed across Chrome and Edge: create, claim, operator reply, customer readback and resolution. Both sessions used the same operator account. This is not proof of separate-user authorization isolation, nor of workflow takeover/resumption: the ticket had no linked workflow.
- Eleven focused automated operator/isolation/workflow checks passed again on 29 October. These do not replace the deferred hosted two-user workflow exercise.
- Separate analysis runner is merged. Seven actual isolated-supervisor checks and two mocked SDK lifecycle checks passed. It is an administrative runner, not connected to Fufu chat. No organiser compliance approval is claimed. The user requested no organiser enquiry and no further Fufu integration.

## Access and presentation

Supabase Site URL was corrected from localhost to https://fudan-global-finance-ai.vercel.app and the exact /auth/callback?next=/security redirect was saved. Confirmation resend was blocked by the project's email sending limit; no fresh email delivery or customer confirmation is claimed. Email confirmation remains required.

The user reports video and PPT ready. Their duration and final portal upload have not been independently reviewed. The attached brief requires a presentation of at most ten minutes, video of at most five minutes and an introduction of at most 200 Chinese characters.

## Submission introduction

Project name: FU Bank（福银行）

福银行是一款面向大学生的AI银行智能体原型，通过大语言模型理解中英文需求，调用受控工具完成模拟转账、账单分析、理财、卡片及订阅管理。系统采用分级权限、精确确认、动态口令验证和审计记录，支持任务编排、定时执行、资金预留及人工协助。所有资金与商户履约均为模拟。

## Deferred acceptance and limitations

Separate customer/operator hosted isolation and linked-workflow takeover, release and resume are deferred at the user's request. Existing automated evidence is listed separately above. The separate customer account is awaiting email confirmation.

All money, card issuance and merchant effects remain simulated. CSV validation covers the supported normalized format, not every third-party export. Educational suitability is not certified investment advice. Cloud cron invocation success alone does not prove every scheduled job has executed. No formal security certification, organiser approval or competition upload is claimed.

