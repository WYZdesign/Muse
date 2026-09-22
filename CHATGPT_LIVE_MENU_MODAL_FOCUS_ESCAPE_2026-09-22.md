# Live menu-modal focus escape — 2026-09-22

## Deployed verification

Authenticated mobile Muse navigation menu was opened from BTS. One subsequent Tab press moved `document.activeElement` to the external `VERCEL-LIVE-FEEDBACK` widget, outside the menu overlay.

The Collab Report dialog was also opened with its keyboard-accessible `Report brief` action. One subsequent Tab press moved focus to the background `Safety info` button. The defect therefore affects an active safety/report workflow as well as navigation.

The Settings Safety Center modal likewise lets one Tab press land on the background `Identity Verification` control. Its in-modal Check-ins/Safety Profile/Share Details/Strikes controls also lack an announced active selection state.

The menu is therefore not focus-contained. This is particularly harmful because background controls remain reachable while the user believes a modal navigation state is active.

## Required remediation

Implement a reusable modal primitive used by Menu, verification, match explanation, settings sheets, album dialogs, booking dialogs, and report flows:

- move focus to a meaningful in-modal target on open;
- retain focus within the overlay while open, including external/development widgets;
- support Escape dismissal where the flow is cancelable;
- restore focus to the opener on close;
- set/inherit proper background inertness.

Do not treat `role="dialog"` and `aria-modal="true"` alone as a focus trap.

## Acceptance evidence

1. Automated Tab/Shift+Tab cycle test never reaches background or Vercel feedback controls while a modal is open.
2. Keyboard test checks open, Escape/Close, focus restore, and nested modal behavior.
3. Repeat on mobile menu, verification banner/modal, report flow, booking flow, and settings sheets.
