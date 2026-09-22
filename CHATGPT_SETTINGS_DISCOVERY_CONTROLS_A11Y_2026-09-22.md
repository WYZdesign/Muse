# Settings discovery controls accessibility batch — 2026-09-22

## Local changes

`src/app/(muse)/muse/screens/SettingsScreen.tsx`

- Replaced the four custom Show Me gender controls with native buttons,
  `aria-pressed`, and 44px minimum targets.
- Replaced the custom profile-completion disclosure with a native 44px button
  and `aria-expanded` state.

## Validation

- TypeScript syntax transpilation passed for `SettingsScreen.tsx`.

## Required deployment checks

1. Confirm gender selection is keyboard-operable and announced as selected.
2. Confirm the profile-completion details expand/collapse with Enter and Space.
3. Run elevated build and tests before deploy.
