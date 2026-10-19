# Interactive cards and portfolio dashboard

The user's three references inform a horizontal virtual-card gallery, an expanded card view, a curved cash-flow graph and a frosted portfolio panel. Existing Fu Bank colors, system appearance and the fixed three-column financial-summary row are preserved.

Selecting a compact card opens a keyboard-accessible dialog with the same masked card details. It supports Escape, focus trapping and focus restoration. Transfer opens the existing transfer workspace; freeze/unfreeze and monthly-limit changes use the existing review flow. Add creates a simulated virtual card on an owned active CNY account only after confirmation, without changing money balances. The demo supports up to ten cards.

The curve plots cumulative recorded cash movements over 7, 30 or 90 days. It converts recorded transaction amounts to CNY with the existing reference rates and excludes internal transfers. The latest recorded transaction or snapshot date anchors the window. The graph can be inspected by pointer or keyboard slider. It is labeled as cash flow, not market performance or a historical account-balance reconstruction. Smooth interpolation connects daily totals without generating synthetic returns.

Invest opens the existing investing workspace. Add funds opens existing bank transfers; it cannot mint cash. Withdraw sells or redeems an owned holding into an owned active CNY account through the existing confirmation, cash/holdings/order/ledger/audit engine. Full and partial fund redemptions remove cost basis and units proportionally. Current invested cost basis, completed withdrawal proceeds, top holdings and filterable completed investment activity use the same demo snapshot.

All cards, orders and funds remain simulated. No real payment cards, exchange orders or external withdrawals are created. Browser visual/e2e QA is unavailable in the current environment; automated interaction, arithmetic, build and regression checks provide the verification evidence.
