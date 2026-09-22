# Live Portfolio Visibility Privacy Contract P0 — 2026-09-22

## Evidence

Live Settings → **Portfolio Settings** opened read-only. The surface offers
three client-visible visibility promises:

- **Everyone** — “Any Muse member can view your work”
- **Matches only** — “Only people you've matched with”
- **Private** — “Hidden from everyone”

The options are generic buttons in the accessibility tree; no radio-group/tab
semantics or selected/pressed state is exposed. The overlay has no dialog role
or background isolation. No visibility or feature switch was changed and Save
was not invoked.

## P0 — UI privacy promise must match storage and authorization reality

“Private — Hidden from everyone” and “Matches only” are unequivocal access
claims. They are not satisfied by hiding cards in the client. Earlier release
audit evidence identified a risk that private/invite album media could be
backed by a public bucket or public URLs. This client copy makes resolving and
proving that server/storage issue a launch gate: unauthorized users must not be
able to enumerate, fetch, cache, share, transform, or retain media/metadata by
direct URL, API, search, thumbnail, or CDN path.

## Required remediation

1. Define exact visibility semantics (`member`, `match`, `private`) and make
   server authorization and storage delivery enforce them for every asset,
   thumbnail, derivative, metadata record, search index, and export.
2. Use private storage and short-lived, audience-authorized signed delivery;
   invalidate access on visibility downgrade, unmatch/block, deletion, and
   account closure. Do not rely on URL obscurity or client filtering.
3. Reconcile “Everyone” wording with actual scope: if it means authenticated
   Muse members, label it that way. If it means public web, say so and provide
   explicit indexing/share implications.
4. Implement visibility as a labelled radio group with a programmatic selected
   value and a preview of who can access the work. Require clear confirmation
   for broadening audience; announce save/error status.
5. Apply shared accessible modal/full-screen semantics and focus handling.

## Acceptance gate

For each visibility state, test as owner, unrelated authenticated member,
unmatched user, matched user, blocked user, unauthenticated user, and direct
asset/API requester. Prove denial at the server/storage layer and absence from
search/feeds/caches after revocation. Add keyboard/screen-reader tests proving
the current visibility is unambiguous before a user saves it.
