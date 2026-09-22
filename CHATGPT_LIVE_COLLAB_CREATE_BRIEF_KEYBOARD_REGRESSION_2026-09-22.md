# Live Collab Create Brief keyboard regression — 2026-09-22

## Deployed verification

On authenticated Collab, `Create Brief` receives focus. Direct Enter activation produced no modal, no state change, and no accessible-tree change.

## Required remediation

Use a native keyboard-complete button and a shared focus-managed dialog/sheet for brief creation. The same handler must run for pointer click, Enter, and Space. Form labels, validation, cancel behavior, draft recovery, and submit idempotency must be tested once the dialog opens.

## Acceptance evidence

1. Component test proves click/Enter/Space open one creation dialog.
2. Keyboard E2E covers open, required-field validation, cancel, focus restore, and a non-production create lifecycle.
3. The dialog traps focus and leaves background Collab cards inert.
