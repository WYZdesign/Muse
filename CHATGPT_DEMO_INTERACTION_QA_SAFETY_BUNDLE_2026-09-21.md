# Demo Interaction QA & Test-Data Safety Bundle — 2026-09-21

## Goal

Enable comprehensive real-user-flow testing in demo mode—swipes, likes, matches, chat, bookings, safety flows, uploads, and deletion—without polluting shared fixtures or creating irreversible demo-state drift.

## Deliver together

### Deterministic QA actors and fixtures

- Create clearly named, non-production QA actors for creator, client, moderator, under-18/age-unverified, verified adult, blocked/reported, host, and requester paths.
- Seed deterministic Discover deck ordering for QA actors so interaction tests can reliably target expected card IDs.
- Mark fixture content/media with a test namespace and prevent it from being surfaced to non-QA accounts in any future non-demo environment.

### Reset and observability

- Provide an authenticated, admin-only demo reset endpoint/script that resets only the isolated QA namespace: swipes, matches, messages, reactions, bookings, reports, notifications, storage fixture objects, and test payment state.
- Make reset idempotent and log actor, scope, timestamp, and result.
- Add a read-only QA status page/API: seeded deck IDs, match state, pending action count, active test session, and last reset.

### Interaction correctness contracts

- Every mutation endpoint accepts and records an idempotency key for automated/mobile retries where applicable.
- Expose an action-complete signal that tests can await (state version, event ID, or durable mutation result), not just animation timing.
- Ensure client action locks release only after success/failure resolution; errors restore the active card safely.

### Demo safeguards

- Demo mode banner/indicator remains explicit but dismissible for focused QA.
- No real payments, outbound emails/SMS/push, external social posting, or third-party identity verification should be triggered by QA fixture flows.
- Mock payment/identity/provider adapters must produce recognizable test results and never silently call live credentials.

## Full interaction matrix

1. Discover: Pass, Like, Super Like, Like + Note, Rewind, profile/prompt/portfolio carousel, rapid taps, rapid swipe.
2. Muses: match receipt, inbox state, accepted/declined/expired paths.
3. Feed/BTS: compose validation, photo/video/voice failure/retry, comments, report, save, filter state.
4. Collab/Network: filter/search, apply/respond, save, book, report, detail navigation.
5. Sessions: browse, request, accept/decline, cancellation policy, payment mock, calendar/availability edge cases.
6. Safety/privacy: block, report, identity/age gates, NSFW restriction, export, deletion lifecycle.
7. Accessibility: keyboard-only traversal and screen-reader names across every preceding flow.

## Acceptance gate

- One command/test job resets demo fixtures, runs the entire matrix at 320/390/414px, asserts mutation counts/state, and emits a concise artifact report.
- No fixture test may mutate an account or external integration outside the QA namespace.
- Demo reset and full run are repeatable three consecutive times with identical expected state.
