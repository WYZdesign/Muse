# Live Profile portfolio-slot labels — 2026-09-22

## Deployed verification

Authenticated Profile was checked live at `https://muse.wyzdesign.com/muse`.

The Portfolio section exposes six separate buttons, each announced only as `Add`. There is no programmatic position, album, or outcome context, making the six actions indistinguishable in keyboard and screen-reader navigation.

## Required remediation

Give each empty slot a unique intent-first name, e.g. `Add work to portfolio slot 1 of 6`, or preferably expose the visible visual/category context in the name. Once an item exists, announce `Edit portfolio item <title>` / `Remove portfolio item <title>` separately. Do not use only ordinal labels where contextual work/album names are available.

## Acceptance evidence

1. AX snapshot has unique accessible names for each add/edit/remove control.
2. Keyboard selection opens the intended media picker or album flow and returns focus predictably on cancel.
3. Empty, loading, failed, and occupied slot states have distinct accessible text.
