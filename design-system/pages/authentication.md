# Authentication theme

Use MASTER.md plus these page rules for `/login` and `/register`.

The existing navy/teal identity extends to a light form panel and a dark brand panel. Desktop has a split layout; phone screens show a compact navy brand header above the form. Inter remains bundled locally. Currency graphics describe supported fictional currencies without inventing balances or live rates.

| Representative color | UI role |
| --- | --- |
| #102B32 | Brand panel and headline |
| #087F70 | Primary action and links |
| #F7F8F5 | Canvas |
| #FFFFFF | Form surface, primary action foreground |
| #17343A | Primary text |
| #5E7074 | Secondary text and placeholders |
| #E2E7E2 | Surface boundaries and dividers |
| #8BE3CD | Brand-panel accent |
| #B88732 | Reserved decorative gold accent from dashboard |
| #DC2626 | Error boundary; darker #B91C1C for error text |

Derived controls: #096758 hover, #125448 active, #85958F input boundary, #254C53 hero highlight, #21444A currency tile surface. Disabled actions use a grey surface and the native disabled attribute; errors include text and alert semantics. Focus uses a visible 2px teal outline. Fields have 16px input text and 54px minimum height; the show/hide password button has a 44px target.

Calculated foreground/background contrast: white on teal 4.91:1; primary text on white 13.22:1; muted text on white 5.19:1; hero secondary on navy 9.78:1; mint on navy 9.88:1; error text on pale red 5.91:1. The derived input boundary is darker than the surface-divider color to keep controls distinguishable. These checks are pair-specific, not a claim of a complete accessibility audit.

Keep existing authentication, callback allowlisting, password requirements and demo links. Do not add nonfunctional social sign-in, password-reset or remember-me controls. Registration errors use alert feedback; success explains email confirmation. Missing configuration leaves sign-in disabled with a public-demo recovery path.

Editable reference: https://www.figma.com/design/0zY79qGtUOIiNStAvWHMt3
