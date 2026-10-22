# Reference Project Review

Reviewed against the named GitHub repositories on 2026-10-15. This project uses the references only for product concepts. No source code, assets, copy, or branding were copied.

| Reference | Authoritative source | License at review | Concepts informing this product | Deliberately excluded |
|---|---|---|---|---|
| Money Dashboard | [NightBaRron1412/money-dashboard](https://github.com/NightBaRron1412/money-dashboard) and its repository `LICENSE` | MIT | Consolidated multi-currency overview, clear demo mode, subscriptions, cards, portfolio context, and cash-flow forecasting | Its code, visual identity, assets, static AI previews, PIN authentication, market-data vendors, and implementation stack |
| Firefly III | [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) and its repository `LICENSE` | AGPL-3.0 | Accounting discipline, explicit transaction classifications, budgets, recurring transactions, reporting, and avoiding transfer double-counting | All AGPL source, product branding, PHP/Laravel architecture, deployment model, and direct schema reproduction |
| Banking AI Agent | [chgiri/banking-ai-agent](https://github.com/chgiri/banking-ai-agent) | No license file or GitHub license metadata visible at review; treated as all rights reserved | Conceptual separation of tool-based reads/actions, code-enforced account scoping, propose/confirm transfer flow, and multi-tool orchestration | All source, prompts, sample data, documents, Java/Spring stack, RAG implementation, and branding |
| FinRobot | [AI4Finance-Foundation/FinRobot](https://github.com/AI4Finance-Foundation/FinRobot), [`NOTICE`](https://github.com/AI4Finance-Foundation/FinRobot/blob/master/NOTICE), and repository `LICENSE` | Apache-2.0; names and logos are also covered by its trademark policy | Separation of reasoning, financial tools, calculations, and verified outputs | All source, research-agent implementation, investment workflows, trademarks, names, logos, and third-party data integrations |
| Kashing | [yachty66/Kashing](https://github.com/yachty66/Kashing) and its repository `LICENSE` | MIT | Recurrence/amount-stability subscription detection, conversational finance context, and server-held provider credentials | Its code, branding, PSD2 bank connections, LLM vendor setup, provider integrations, and real-bank credential flow |
| Credix | [itsramananshul/credix](https://github.com/itsramananshul/credix) | No license file or GitHub license metadata visible at review; treated as all rights reserved | Student-oriented tuition alerts, home-currency context, approachable category budgeting, and recurring-charge visibility | All source and assets, Plaid integration, API/vendor configuration, schema, copy, and branding |
| Savvy | [truenormis/savvy](https://github.com/truenormis/savvy) and its repository `LICENSE` | MIT | Multi-currency expense tracking, recurring payments, budget progress, duplicate-aware imports, and responsive finance workflows | Its code, branding, PHP/Laravel stack, container topology, SQLite architecture, and UI assets |

## Applied boundaries

- Fudan Global Finance AI has its own TypeScript domain model, versioned fictional seed, visual system, language, and component implementation.
- The repository does not vendor or derive files from any reference project.
- References without an explicit license are limited to high-level concepts observable from their public repository descriptions.
- Firefly III's AGPL source and FinRobot's trademarked identity are specifically excluded from reuse.
- Live bank connections, brokerage execution, remittance offers, and real-money movement remain out of scope; all financial state and actions are fictional or simulated.
