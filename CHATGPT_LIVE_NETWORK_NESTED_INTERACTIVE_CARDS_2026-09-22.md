# Live Network nested-interactive cards — 2026-09-22

## Deployed verification

Authenticated mobile Network was checked live at `https://muse.wyzdesign.com/muse`.

Each visible professional card (Elena Voss, Marcus Webb, Simone Hart, Lena Park) is a parent button containing further buttons for `Save professional` and details/tags such as experience, openings, rate, seeking roles, tier, hiring status, and disciplines.

This is invalid nested-interactive markup. It creates ambiguous activation semantics, duplicated announcements, and a material risk that Save/filter/detail controls trigger the parent card navigation.

## Required remediation

Refactor the shared professional-card structure:

- make the card container non-interactive;
- provide one clearly labelled primary profile/details link or button;
- keep Save as a sibling control;
- render informational tags as plain text, not buttons;
- render genuine filter/details actions as separate sibling controls only when they have a defined behavior.

Apply the same structural test to Feed, Collab, Muses, Community, Sessions, and any reusable card primitive. Do not replace nested buttons with `div role=button`.

## Acceptance evidence

1. Automated DOM test rejects interactive descendants inside any interactive card root.
2. AX snapshots show each action once and with an intent-first name.
3. Keyboard Enter/Space test proves profile, save, and any real filter actions are distinct.
4. Mobile regression at 320/390/414 px verifies hit targets and no adjacent-action activation.
