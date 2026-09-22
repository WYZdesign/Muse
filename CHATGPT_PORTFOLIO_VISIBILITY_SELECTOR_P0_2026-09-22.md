# P0: portfolio visibility selector contract follow-up — 2026-09-22

## Local UI changes

`src/app/(muse)/muse/screens/SettingsScreen.tsx`

- Visibility options now expose `aria-pressed` so the current client-side
  selection is programmatically distinguishable.
- Replaced broad/ambiguous copy: “Everyone” is now “Muse members,” and
  “Hidden from everyone” is now “Visible only to you.”
- Saving these settings in demo mode is explicitly session-local and makes no
  server write.

## Important boundary

This is a UI and demo-safety improvement only. It does not prove server-side
authorization or private signed-media delivery. The release gate still requires
the full owner/unrelated/match/block/unauthenticated/direct-URL matrix from the
privacy contract, storage-revocation checks, and elevated build/test evidence.

## Local validation

- TypeScript syntax transpilation passed for `SettingsScreen.tsx`.
