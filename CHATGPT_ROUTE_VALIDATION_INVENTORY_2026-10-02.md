# Route validation inventory — 2026-10-02

This is the handoff for Roadmap 1.5. It inventories the routes that parse a
JSON body at the current `origin/main` commit. Add schemas in the route owner’s
validation layer, preserve the existing authentication and rate-limit checks,
and add one malformed-body plus one boundary regression for each schema.

## Highest-risk first

| Route | Required validation contract |
| --- | --- |
| `/api/checkout` | `plan` enum (`muse_pro`, `muse_pro_annual`, `muse_studio`, legacy aliases); optional trimmed `email`; optional bounded promo string; session token remains verified server-side. |
| `/api/muse/auth` | discriminated `action` union: register/login/forgot-password/session/logout/update-password/update-profile/delete-account. Enforce normalized email, password policy, token string bounds, and a strict profile-patch allowlist. |
| `/api/muse/mfa` | action enum (`enroll`, `verify`, `verify-code`, `challenge`, `unenroll`); factor UUID; six-digit TOTP code; optional friendly name max 30 chars. |
| `/api/muse/upload` | deletion payload `path` must be a storage-relative path in an allowed bucket/prefix; never accept URL, traversal, or another user’s path. |
| `/api/muse/call` | action enum; room/call and participant identifiers; bounded optional signal payload. |
| `/api/muse/push` | action enum; endpoint and key strings with practical length limits; subscription object with only supported browser push fields. |
| `/api/muse/connect` | action enum; connection/account identifiers; return URL restricted to same-origin paths where applicable. |

## Other body-parsing routes

| Route | Schema shape to introduce |
| --- | --- |
| `/api/qr` | optional `url` must be an allowed absolute site URL or same-origin path, plus bounded style/size options. |
| `/api/muse/admin/promote-waitlist` | admin-only action; array of normalized email addresses, maximum 50 entries. |
| `/api/muse/referral` | action enum; referral code and invite target bounded and normalized; never trust reward amounts from the client. |
| `/api/muse/unsubscribe` | signed unsubscribe token only, bounded opaque string, plus a narrow preference enum if supported. |
| `/api/muse/embeddings` | explicit operation enum; text input bounded by model-safe length; profile/document UUID; never accept arbitrary table names. |
| `/api/muse/embed` | explicit provider/embed action; target URL must be HTTPS and provider allowlisted; bounded payload. |
| `/api/muse/depth` | profile/media identity; bounded public image URLs only after server-side ownership/visibility checks; reject arbitrary fetch targets. |
| `/api/muse/verification` | action enum only; no user, status, or Stripe session identity accepted from the client. |
| `/api/muse/waitlist` | already covered by `WaitlistSchema`; keep regression coverage. |
| `/api/muse/support` | already covered by `SupportSchema`; keep regression coverage. |
| `/api/cron/notify-claimable-quests` and `/api/cron/saved-search-alerts` | if POST body remains supported, accept an empty object only; cron authorization belongs in headers, never body. |
| `/api/geocode`, `/api/muse/social/callback`, `/api/muse/transcribe` | the current route set should be checked for body parsing outside `req.json()` (form/query/webhook paths); validate provider-specific inputs at their boundary. |

## `/api/muse` dispatcher

The main dispatcher currently receives `action` (or legacy `type`) plus a free
form remainder. Replace that remainder with action-family schemas, applied
before the handler is selected:

1. **Identity and direct interaction:** profile, match, message, block, report,
   and connection actions. Use UUID/identifier validation, bounded text, and
   explicit booleans.
2. **Publishing:** feed, moment, brief, forum, album, review, prompt-response.
   Require bounded title/body/media arrays and enum visibility/category fields.
3. **Community and booking:** membership, moderation, sessions, bookings,
   safety, disclosures, and availability. Require UUIDs, ISO dates, bounded
   money/duration values, and server-side role checks.
4. **Preferences and discovery:** search, saved searches, notifications,
   location/preferences, boosts, and analytics. Bound query/filter arrays and
   never accept a client tier, user ID, or payment status as authority.
5. **Administrative operations:** all `admin-*` actions. Validate their payload
   strictly, then retain the current server-side admin authorization as the
   sole authority.

Start with the security, payment, authentication, and outbound-provider routes
above. This document deliberately does not prescribe an unreviewed global
schema for every dispatcher action: each action needs its handler’s existing
business constraints captured in a focused test before rollout.
