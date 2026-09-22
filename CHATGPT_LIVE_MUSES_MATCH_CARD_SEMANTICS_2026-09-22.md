# Live Muses match-card semantics — 2026-09-22

## Deployed verification

Authenticated mobile Muses was checked live at `https://muse.wyzdesign.com/muse`.

The visible match cards for **Torree Harris** and **Muse Test Client** are exposed only as generic containers. A rendered-DOM inspection found no button, link, or `[role=button]` whose accessible name contains either profile name.

If the cards are pointer-clickable, that is a keyboard and screen-reader dead end; if they are intentionally non-interactive, the screen needs an explicit available action to open each match.

## Required remediation

Use a single semantic link or button for each match card, with an intent-first accessible name such as `Open match with Muse Test Client`. Do not make the full card a click handler on an otherwise generic `div`. Preserve any nested controls as siblings, never interactive descendants.

## Acceptance evidence

1. AX/DOM shows one labelled interactive control per visible match card.
2. Tab and Enter/Space open the same match/detail experience as pointer activation.
3. Card controls remain at least 44 CSS px effective target size at 320/390/414 px.
4. Empty/loading/error card states are announced and do not leave a focusable dead control.
