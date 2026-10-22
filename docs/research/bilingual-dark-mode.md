# Bilingual UI and dark controls — 21 October 2026

The Accounts action used a light `bg-blue-50` surface while the existing device-dark rule replaced its foreground with nearly white. Dark colours now pair pale surfaces with dark teal, including hover states, portal/dialog surfaces, fields, option lists, placeholders and autofill. Device appearance still controls the theme.

The top-right EN / 中文 control selects English or Simplified Chinese and saves the preference locally. It updates the document language for assistive technology and supports a session fallback when browser storage writes are blocked. English remains the server-rendered default; the saved selection is restored during hydration.

A shared phrase catalog and anchored dynamic-message templates render copy through typed React primitives and the existing Link components. The integration retains the native HTML elements, refs, events, form field values, route parameters and financial models. It does not mutate rendered DOM text or call a translation service. Native language labels remain understandable in either language. The translated catalog includes navigation, dashboard, forms, validation, investment descriptions, dialogs, tuition, remittance and report UI. Currency codes, asset symbols and numeric accounting values remain in their original form. Chinese category names are included in the banking search index alongside the original records.

Component tests cover language switching, selection persistence, accessible field labels, unchanged input values, account actions and links, blocked browser storage, and bilingual category search. The existing reconciliation tests remain part of the full suite. `tests/e2e/language-and-contrast.spec.ts` covers 375px, 800px and 1280px layouts, actual dark control contrast (including hover), persistence on reload and switching back to English when Playwright Chromium is available.

Verification: all 305 unit/component/integration tests passed, the production build passed, and affected routes returned HTTP 200. Live cloud-browser checks confirmed the Chinese Accounts and Overview, unchanged balances and account links. That browser uses light appearance at 1363px. The saved dark-mode viewport tests could not launch because local Playwright Chromium is absent; no dark/mobile visual pass is claimed.

Saved-language hydration is gated per text boundary, so late streamed/Suspense content first matches its server markup before displaying Chinese. A delayed-boundary regression reproduces the mismatch before the fix and passes afterward.

Adjacent translated text retains its original React child slots. A regression verifies that typing into an uncontrolled input survives language switches in both directions.
