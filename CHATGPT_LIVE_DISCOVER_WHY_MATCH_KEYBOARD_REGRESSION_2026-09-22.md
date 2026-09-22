# Live Discover “Why this match?” keyboard regression — 2026-09-22

## Deployed verification

Authenticated mobile Discover was checked live at `https://muse.wyzdesign.com/muse`.

The `Why this match?` button is present and receives keyboard focus. Both **Enter** and **Space** were sent directly to the focused button; neither changed the accessibility tree or opened the explanation modal.

This is a confirmed keyboard activation failure, not a missing accessible name.

## Required remediation

Use a native button with a real `onClick` path (or an equivalent keyboard-complete control) to open the explanation dialog. Do not rely on pointer-specific events. The dialog must use the existing modal semantics work: move focus inside on open, keep background inert, close with Escape/Close, and restore focus to `Why this match?`.

## Acceptance evidence

1. Unit or component test invokes Enter and Space and asserts dialog visibility.
2. Live keyboard test confirms open/close/focus restoration on a deployed mobile build.
3. Pointer/touch activation remains intact and opens the identical content.

## Related live Discover search regression

Opening `Search` exposes a text field with **no accessible name**. The field is focused, but pressing Escape does not cancel/close the search state. Search therefore fails both input-label and expected keyboard-dismissal behavior.

### Required correction

- Give the field a persistent programmatic name such as `Search creatives and messages`.
- Define whether this is inline search or a dialog; implement the matching complete pattern.
- If it is a transient search mode, Escape must close it, clear only transient UI state as documented, and restore focus to the Search trigger.
