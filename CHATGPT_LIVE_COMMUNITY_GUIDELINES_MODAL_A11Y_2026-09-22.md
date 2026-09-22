# Live Community Guidelines Modal Accessibility Regression — 2026-09-22

## Evidence

Live `https://muse.wyzdesign.com/muse`, Settings → Legal → **Community
Guidelines**, audited without accepting/acknowledging the guidelines.

The opened overlay exposes only generic containers in the accessibility tree;
it has no native `<dialog>`/`role="dialog"`, `aria-modal="true"`, accessible
dialog name, or background inertness. DOM inspection found no dialog and no
inert/`aria-hidden` isolation on the background.

Keyboard reproduction:

1. Open Community Guidelines with Enter.
2. Tab from **Close** to **I Understand**.
3. Press Tab once more.
4. Focus escapes the overlay to the external `VERCEL-LIVE-FEEDBACK` element.

No acknowledgement, settings change, or account action was performed.

## Impact

This is the same blocking overlay pattern already observed in Terms, Privacy,
Safety Center, Menu, and Collab report, now confirmed on a further legal
surface. Keyboard and screen-reader users can lose context and interact with
background UI while an overlay is visibly active. It also conflicts with the
legal surface’s need for an informed acknowledgement.

## Required remediation

Use the shared modal primitive for Community Guidelines and every app overlay:

```tsx
<dialog aria-labelledby="community-guidelines-title" aria-modal="true">
```

or an equivalent correctly implemented dialog. On open: save the invoker,
move focus to the title/close control, constrain Tab and Shift+Tab within the
modal, prevent background pointer/keyboard interaction using `inert`, provide
Escape where dismissal is allowed, and restore focus to the invoker on close.
Do not make `I Understand` the only way to escape or accidentally persist an
acknowledgement during an accessibility recovery path.

The live close action was also checked: after **Close**, focus returned to the
document/web area rather than the **Community Guidelines** invoker. Treat
focus restoration as a required acceptance condition, not a best-effort
enhancement.

## Acceptance test

Automated and manual keyboard tests must prove that tabbing forward/backward
within Community Guidelines never reaches Skip link, app controls, browser
feedback, or any background control; the overlay has a role/name/modal state;
and Close/Escape return focus to **Community Guidelines**. Re-run the same
test matrix for Terms, Privacy, Safety Center, Report, and deletion overlays.
