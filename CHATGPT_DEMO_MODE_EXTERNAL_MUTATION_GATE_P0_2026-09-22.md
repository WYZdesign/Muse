# Demo-mode external mutation gate P0 — 2026-09-22

## Finding

The client defaults `NEXT_PUBLIC_DEMO_MODE` to enabled, but that browser-side
value was not an authoritative server gate. A direct authenticated API caller
could still initiate real Stripe Checkout, Stripe Connect onboarding/booking
checkout/refunds/transfers, Stripe Identity verification, or an OAuth redirect.
The Stripe webhook could also mutate demo booking/payment/tier state from a
real event. This contradicts the demo promise and makes demo safety dependent
on UI behavior.

## Local remediation pending wyzmind review

Added `src/lib/demo-mode.ts`, a server-side fail-closed policy:

- `MUSE_DEMO_MODE=true` forces demo mode;
- `MUSE_DEMO_MODE=false` is the explicit operator opt-out for a real launch;
- otherwise it honors the existing public flag, whose default remains demo.

The following routes now reject external initiation with HTTP `409` and
`code: "DEMO_MODE"` before calling a third party:

- `src/app/api/checkout/route.ts`
- `src/app/api/muse/connect/route.ts`
- `src/app/api/muse/verification/route.ts`
- `src/app/api/muse/social/route.ts` for OAuth authorization
- `src/app/api/muse/social/callback/route.ts`

`src/app/api/webhooks/stripe/route.ts` now returns a successful, inert receipt
in demo mode so a real event cannot mutate demo accounts and Stripe does not
retry a deliberately disabled integration.

### Follow-up: email, account, and cron pathways

The same source review identified additional paths that bypassed the payment
gate. The local guard now also:

- permits only `login`, `session`, and `logout` through
  `src/app/api/muse/auth/route.ts` in demo mode; registration, password reset/
  change, profile mutation, and deletion return `409` / `DEMO_MODE`;
- blocks the waitlist endpoint and the admin waitlist-promotion email endpoint;
- makes authorized booking-capture and safety-check-in cron invocations inert
  in demo mode, preventing real payment capture, check-in records,
  notifications, and trusted-contact email.

The demo guard is deliberately server-side and fail-closed. It is not a claim
that every ordinary demo UI interaction has been converted into a local-only
simulation; audit the remaining `/api/muse` action registry separately before
opening the demo to untrusted users.

### Follow-up: central action-dispatch gate

That registry audit is now complete for POST dispatch. The local
`src/app/api/muse/route.ts` adds a deliberate `DEMO_READ_ACTIONS` allowlist.
Only listed data retrieval actions can reach a handler in demo mode; every
other action (messages, feed/forum posts, reports, blocks, matching, booking,
moderation, profile/preferences, albums, disclosure, safety writes, quests,
and admin actions) returns `409` / `DEMO_MODE` before authentication, rate
limit, or handler dispatch can produce a write. `track-event` and
`track-error` return a successful inert demo response, so visitor analytics is
not retained.

Focused dispatcher coverage was added for blocked direct writes and inert
analytics. It is syntax-validated only here; run the focused Vitest file in
the elevated environment because this machine cannot create Vitest's temporary
config bundle.

### Follow-up: standalone media, AI, and communication APIs

The last standalone non-read paths now also fail closed in demo mode:

- LiveKit calls, media uploads/deletion, Rekognition scanning, push
  subscriptions/delivery, and referral writes/email;
- Replicate depth generation, OpenRouter embedding endpoints, Groq
  transcription, and the matching endpoint (which can lazily create an AI
  embedding).

The demo client already falls back to its static discovery deck when matching
is unavailable. All changed files passed local TypeScript syntax
transpilation. This needs an elevated full build and route-suite run before
commit/deploy.

### Final top-level endpoint follow-up

The remaining top-level endpoints were checked as well:

- reverse geocoding is inert in demo mode, preventing third-party Nominatim
  requests;
- backup and landing-stat endpoints avoid querying/reporting production data;
- QR generation remains available locally, but scan/share analytics insertion
  is disabled in demo mode so it does not retain visitor IP-derived telemetry.

### Account/contact edge cases

- MFA enrollment, verification, and unenrollment are blocked in demo mode;
- both unsubscribe methods are blocked so a demo host cannot mutate a real
  recipient's mail preferences through an old email link;
- support remains usable, but demo requests use only the local FAQ fallback
  and never reach the AI provider.

## Demo UX compatibility follow-up

The Discover Boost control now activates a local 30-minute demo indicator
without calling the blocked server action. Its message explicitly says that no
real promotion was purchased. This preserves the walkthrough while keeping the
server boundary strict.

Saved Discovery searches now follow the same contract: saving and deleting a
search in demo mode update session-local React state and never call the
blocked write actions. Saving preferences is likewise kept local in demo mode.
The UI says that a saved search is for the current demo session, rather than
implying durable storage.

## Required review / acceptance checks

1. Set `MUSE_DEMO_MODE=true` in the deployed demo environment (do not rely on
   the public client variable alone).
2. Exercise each listed API route with an authenticated demo account and
   confirm `409` / `DEMO_MODE`, no external redirect/session, no DB mutation,
   and no outgoing email.
3. Confirm a signed Stripe webhook in demo mode produces no tier, booking,
   payment, referral, or email mutation.
4. In a separate non-demo staging environment only, set
   `MUSE_DEMO_MODE=false` and run the established Stripe/OAuth/Identity
   integration suites using test credentials. Never make that change on the
   public demo deployment.
5. Commit this as a self-contained safety change, run typecheck plus route
   tests/build in the elevated environment, push/deploy, then request fresh
   live verification.

## Local validation status

TypeScript transpilation syntax passed for every changed route and helper.
Full route tests and production build were not runnable in this environment:
the Windows process is denied writes to repository Vite/Next temporary output
directories. Those commands must be run by wyzmind in the elevated deployable
environment before release.
