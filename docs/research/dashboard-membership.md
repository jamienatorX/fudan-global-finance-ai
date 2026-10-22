# Dashboard membership and card design

The supplied references informed the broad shadow beneath the balance panel, glass dashboard surfaces, membership badge and bank card composition. The card is built with CSS and vector details; no reference image or payment-network logo is bundled.

Overview now shows the current membership tier and progress to the next band. The illustrative minimum portfolio values are Bronze CNY 0, Silver CNY 5,000, Gold CNY 25,000, Platinum CNY 100,000 and VIP CNY 250,000. Tier calculation uses the original consolidated CNY portfolio value, including cash and investments. Changing the reporting currency does not change membership. The default fixture qualifies for Gold. These bands confer no real banking benefits or account privileges.

The card visual reads the existing owner's masked virtual card records, cardholder name and freeze status. Its color follows membership. The selector switches between existing virtual cards, and Manage cards opens the existing controls. No full card number, security code, invented expiry date or real payment-network affiliation is displayed.

The planner remains accessible beneath the balance/card row. Investing stays at the bottom of Overview. Device-driven dark mode remains in place, with a reduced-transparency fallback for the new glass surfaces.

Verification covers tier thresholds, tier progress, reporting-currency invariance, card selection and the existing regression suite. Browser visual/e2e QA remains unavailable in the current managed environment because the supported browser-control tool is absent.
