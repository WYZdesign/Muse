# Live BTS reporting keyboard gap — 2026-09-22

## Deployed verification

Authenticated mobile BTS was checked live at `https://muse.wyzdesign.com/muse`.

The active-moment controls are exposed as buttons such as `Behind the scenes photo Maya`, with help text **“Hold to report.”** A long-press gesture is not a keyboard or screen-reader equivalent, and the accessible tree exposes no separate `Report moment` control.

For a creator-network safety surface, reporting cannot be pointer-gesture-only.

## Required remediation

Keep long-press as a touch shortcut if desired, but provide a visible or consistently discoverable sibling `Report moment` button/menu item with a clear accessible name. It must be reachable by Tab and invoke the same report flow. Do not overload ordinary Enter/Space activation of the moment-view button with a destructive/safety action.

## Acceptance evidence

1. Every BTS moment has an accessible report path independent of long press.
2. Keyboard test: open report, cancel, submit test report, and return focus to the originating moment.
3. Screen reader announces moment owner/content context and report purpose separately.
4. 320/390/414 px: report target/menu is usable without obscuring the moment or triggering adjacent content.
