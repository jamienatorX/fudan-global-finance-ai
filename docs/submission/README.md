# FU Bank — submission package

Prepared 27 October 2026 for the Domestic Banking AI Agent track. Product: **福 bank**, assistant: **Fufu**.

- [Project brief](project-brief.md): ready to paste, under 200 English words.
- [Technical report](technical-report.md): architecture, core algorithms and security boundaries.
- [Requirements matrix](requirements-matrix.md): implemented scope and explicit gaps.
- [Security self-assessment](security-self-assessment.md): controls, evidence and known risks.
- [Acceptance runbook](acceptance-runbook.md): genuine authenticator, workflow and operator checks.
- [Deployment and reproduction](deployment-and-reproduction.md): source, setup, tests and release procedure.
- [Verification record](verification.md): dated results and their limits.
- [Latest Fufu improvements](fufu-everyday-repair.md): everyday questions, safe follow-ups and 580 passing regression tests.

Website: https://fudan-global-finance-ai.vercel.app/  
Source: https://github.com/jamienatorX/fudan-global-finance-ai

## Submission checklist

| Item | Status / owner |
|---|---|
| Product brief, architecture/algorithm/security documentation | Prepared in this folder |
| Source, README, setup and reproducible tests | Included in repository; see reproduction guide |
| Security self-assessment and limitations | Prepared; no certification claimed |
| Public website and Fufu regression repair | Release status in verification record |
| Real protected-action and human-takeover acceptance | Still needs the account holder's authenticator and two user sessions; do not mark complete based on fixture tests |
| Presentation, at most 10 minutes | Team member preparing separately |
| Demonstration video, at most 5 minutes | Team member preparing separately |
| Eligibility, registration and final portal upload | Account holder must verify and submit |
| Generated-code sandbox interpretation | Ask organiser; no arbitrary generated code runs in this project |

The official track page captured on 27 October lists 2 November 2026 as submission day and 28 October as the AI Q&A. Confirm the portal's exact cutoff and the team's track/eligibility directly. This package does not certify eligibility or upload anything to the competition portal.

## Suggested organiser question

“Our banking agent only invokes a fixed registry of typed tools. It cannot generate or execute JavaScript, SQL, shell commands or other arbitrary code. Does denying generated-code execution satisfy the restricted, monitored sandbox requirement, or must we separately demonstrate an isolated generated-code runtime?”

## Suggested judging path

Use three clear scenario families: **bill analysis, subscriptions and card management**. Show account-grounded budget reasoning, detected recurring charges with supporting transactions, and a reviewed fictional card change. Use the authenticated banking path for security evidence. A workflow interruption/operator takeover is a second demonstration after completing the live acceptance runbook. Do not describe external Spotify purchases, future merchant cancellations or illustrative FX as executed services.
