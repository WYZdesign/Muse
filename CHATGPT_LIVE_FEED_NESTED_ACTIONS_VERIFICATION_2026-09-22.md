# Live Feed nested-actions verification — 2026-09-22

## Deployed verification

Authenticated mobile Feed was rechecked live at `https://muse.wyzdesign.com/muse` using the accessible keyboard path.

Every visible post header remains exposed as an outer unnamed-purpose post-header button which contains two further interactive buttons:

- creator avatar/profile action;
- `Report post`.

Examples observed: Riley Patel, Sam Taylor, Jordan Rivera, and Maya Chen. This is an invalid nested-interactive structure and makes the profile and report paths ambiguous for keyboard and assistive-technology users. It also risks propagating a parent-card action when the user intends only to report a post.

## Required remediation

Render the post header as a non-interactive structural container. Make the avatar/name/timestamp a single labelled profile link/button only where profile navigation is intended, and make `Report post` a sibling labelled button. Do not wrap either in a parent button or link.

## Acceptance evidence

1. DOM/AX snapshot shows no interactive descendant of another interactive element in a post header.
2. Tab order reaches profile navigation and report exactly once each, with distinct names.
3. Report opens its intended flow without profile/card navigation, including keyboard Enter/Space tests.
4. Run TypeScript, full Vitest, and authenticated mobile regression after implementation.
