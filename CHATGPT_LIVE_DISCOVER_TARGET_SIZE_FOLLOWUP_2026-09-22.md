# Live Discover target-size follow-up — 2026-09-22

## Live evidence

Chrome rendered-DOM measurements on the active Discover card confirm that the
current photo dots, prompt arrows, prompt-like control, portfolio arrows, and
match-explanation button resolve to 44×44px. Earlier 40–42px readings were
from visually transformed, non-active background cards; they are not an active
hit-target regression.

Two genuine active-card failures remain:

- portfolio pagination dots were 6×6px `role="button"` elements, and thus
  keyboard-focusable interactive controls with no usable pointer target;
- badge chips opened a details popover but measured only 22–24px tall.

## Local remediation pending review

`src/app/(muse)/muse/screens/DiscoverScreen.tsx` now:

1. makes portfolio dots presentational (`aria-hidden`) rather than tiny
   interactive controls; the adjacent previous/next buttons remain labelled,
   keyboard-operable 44px navigation controls;
2. gives every interactive badge chip a 44px minimum width/height and a
   centered flex layout.

This avoids overlapping dense-dot hit areas and preserves a complete accessible
carousel control path.

## Validation / deploy gate

- Local TypeScript transpilation syntax passed for the changed screen.
- `git diff --check HEAD` has no whitespace errors (line-ending warnings only).
- After wyzmind commits/deploys, repeat the rendered-DOM measurement on the
  active card and confirm no exposed Discover button or `[role=button]` is
  below 44×44 CSS pixels, excluding the normally hidden skip-link before it
  receives focus.

## Live Discovery Preferences recheck

The deployed dialog has `role="dialog"`, `aria-modal="true"`, opens focused
on its Back control, keeps Tab cycling inside its controls, closes on Escape,
and restores focus to the **Discovery Preferences** invoker. Those modal
behavior checks pass.

Two local follow-up fixes remain pending deploy:

- the Back control was exposed without an accessible name;
- the `All`/`Women`/`Men`/`Non-binary` selectors were focusable `div`
  elements below 44px tall.

They are now native 44px-minimum buttons with `aria-pressed`, and the close
control is labelled **Close discovery preferences**. Local page syntax parsing
passes; deploy and repeat the keyboard/AX check.

## App-shell icon control sweep

The same static scan found eight other unnamed icon-only `.modal-back`
controls (report, like-note, Terms, Privacy, Guidelines, delete confirmation,
unmatch, and block). All now have an accessible **Back** name. The scan found
no remaining unlabeled icon-only buttons in the Muse app shell; icon-plus-text
controls were correctly excluded.
