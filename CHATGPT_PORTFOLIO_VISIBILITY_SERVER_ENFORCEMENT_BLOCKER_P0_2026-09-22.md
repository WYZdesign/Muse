# P0 release blocker: portfolio visibility has no server-side enforcement — 2026-09-22

## Current-source evidence

- `SettingsScreen.tsx` reads/writes `portfolioVisibility`,
  `portfolioFeatured`, and `portfolioShowOnProfile` only from the member's
  generic `preferences` JSON.
- `src/lib/muse-actions/misc.ts` allowlists and persists those values, but
  no server-side reader/authorization path exists anywhere under `src/` for
  those preference keys.

Therefore this control cannot currently enforce member/match/private access to
portfolio assets or metadata. It is a presentation preference, not an access
control.

## Required implementation before open beta

1. Define a server-authoritative visibility field/contract for every portfolio
   asset and derivative; do not rely only on profile JSON preferences.
2. Enforce it in profile reads, search, feed/card metadata, album/asset APIs,
   signed URL generation, thumbnails, exports, and cache invalidation.
3. On downgrade, unmatch, block, deletion, or account closure, revoke prior
   authorized delivery and invalidate signed/cached access as applicable.
4. Add owner/unrelated/unmatched/matched/blocked/unauthenticated direct-API
   and direct-storage tests for every visibility state.
5. Do not advertise a privacy guarantee until those tests pass in deployment.

## Scope note

The concurrent selector copy/semantics improvement does not resolve this
blocker. Elevated tests, migration/design review, and a production storage
verification matrix remain required.
