# Live Collab safety-info keyboard regression — 2026-09-22

## Deployed verification

Authenticated Collab was checked live. The first brief’s `Safety info` button receives focus, but direct **Enter** and **Space** activation each produced no DOM/AX state change and no safety information.

## Required remediation

Make every per-brief safety control a native keyboard-complete button whose pointer, Enter, and Space paths open the same labelled guidance dialog/sheet. Apply the fix to all brief-card instances, not only the first fixture. Use the shared modal focus-trap primitive and restore focus to the source safety control on close.

## Acceptance evidence

1. Component test covers click, Enter, and Space for safety info.
2. Authenticated mobile deployment test verifies each opens the intended dialog and Escape/Close restores focus.
3. Safety content remains available without the brief card’s Apply/Book/Respond actions.
