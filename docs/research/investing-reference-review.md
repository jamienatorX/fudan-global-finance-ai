# Investing and card reminders

Implemented for issue #11. This extends the existing fictional banking simulator. It does not add a brokerage, exchange, crypto wallet, bank licence, real bond subscription or AI agent.

## Reference comparison

| Reference | Useful pattern | Applied in Fu Bank |
| --- | --- | --- |
| [BCA myBCA investing](https://www.bca.co.id/id/Individu/layanan/e-banking/investasi) | Integrated investment entry, product discovery, investment goals and comparison | A dedicated Investing navigation item, asset discovery and a homepage entry. Existing Wealth planning stays available. |
| [DBS digibank Wealth](https://www.dbs.com.sg/treasures-private-client/deposits/bank-with-ease/dbs-iwealth) | Banking and wealth in one workspace, equity research tools | Portfolio totals and order funding use the existing banking state. |
| [Yahoo Finance portfolios](https://finance.yahoo.com/portfolios/) | Separate watchlists, holdings and research | Persistent watchlist, searchable assets, holdings and external research links. Yahoo is not used as an executable price feed. |
| [Ghostfolio](https://github.com/ghostfolio/ghostfolio) | Asset allocation and portfolio overview | Allocation calculated from current simulated holdings. No source code or visual assets copied. |
| [Bank of China investment products](https://www.boc.cn/en/pbservice/pb3/) | Distinguish savings treasury bonds from book-entry treasury bonds | China bond examples are explicitly fictional book-entry bonds, with price, face value, coupon and tenor. They are not current offerings. |

Mainland virtual-currency restrictions were checked against the [PBOC notice dated 6 February 2026](https://www.pbc.gov.cn/tiaofasi/144941/3581332/2026020619591971323/index.html). Crypto remains an educational simulation without exchange, wallet or deposit connectivity. This is a product-scope decision for the demo, not a determination of regulatory or competition compliance.

## Behavior

- `/investing` accepts `asset` and `instrument` query parameters. The same categories are linked from the bottom of `/overview`.
- Quotes are fixed, explicitly illustrative CNY-equivalent values. No live quotes or historical returns are invented. Research links open separately.
- Orders use exact integer minor-unit arithmetic and up to eight unit decimals. Quantities that create fractions of a cent are rejected. Bond orders use whole CNY 100 face-value units.
- Review does not settle a trade. Confirmation atomically changes cash, holdings, investment orders, transaction records and audit history through the existing demo engine. Duplicate action IDs do not settle twice. Overselling, invalid quantities and insufficient cash are rejected.
- Market positions are managed in Investing. Existing fund positions remain managed in Wealth. Both are included in the portfolio summary.
- `/cards#reminders` supports adding, editing, deleting and marking reminders paid. Only nickname, last four digits, CNY statement amount, due date and reminder lead time are stored. The date is interpreted in Asia/Shanghai.
- Watchlists and reminders are browser-local. Reminder status appears on Overview and in the notification bell. Calendar export creates a 09:00 Shanghai event with a one-, three- or seven-day alarm. Users must import it into a calendar; the web app does not deliver background push/email notifications.
- Marking a reminder paid records a personal status only. It does not debit cash or contact a card issuer. Reset Demo clears the watchlist and reminders along with the original financial demo.
- System dark/light appearance and existing glass styles are preserved. No theme toggle is added.

## Competition scope

The existing `competition-demo-guide.md` is authoritative about the current no-AI scope. This work preserves the existing banking scenarios and approval/audit patterns. The original AI-agent requirement is still not fulfilled; these additions do not establish eligibility. Prices, lots, settlement timing, fees, spreads, taxes, bond accrual and investor eligibility are simplified or omitted and identified in the product.

## Validation

Financial engine, reminder dates/calendar content, component interactions, preference persistence and shell navigation are covered by automated tests. Build, typecheck and lint are checked before deployment. Browser visual/e2e QA is unavailable in the current managed environment because the supported control-browser tool is absent; no browser screenshots or end-to-end pass are claimed.
