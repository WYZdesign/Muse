# Route JSON Validation Inventory — 2026-10-03

Prepared for the active Zod rollout. This is a contract plan only; it does not
change app-source files owned by the active source-work stream.

## Rule for implementation

Parse the request once, validate a discriminated `action` union at the route
boundary, and pass only typed values to action handlers. Reject unknown keys
where practical on privileged or money-moving actions. Preserve existing
rate-limit and authentication checks; validation does not replace either.

## Priority 0 — money, identity, privileged operations

| Route | Action/schema slices required | Notes |
|---|---|---|
| `/api/checkout` | `plan`, `promoCode` | Restrict plan to known price-map keys; bounded promo code. |
| `/api/muse/connect` | `create-account`, `create-account-session`, `account-status`, `create-payment`, `transfer`, `create-booking-checkout`, `create-boost-checkout` | Discriminated union; UUIDs, currency/amount bounds, booking/session IDs and return URLs require narrow schemas. |
| `/api/muse/verification` | `create-verification-session`, `create-age-gate-session`, status/read action | No client-controlled verification result or profile ID. |
| `/api/muse/mfa` | `enroll`, `challenge`, `verify`, `verify-code`, `unenroll` | Factor/challenge UUIDs and code length/character constraints. |
| `/api/muse/admin/promote-waitlist` | email/promote payload | Admin authorization stays before mutation; strict normalized email. |
| `/api/muse/auth` | `register`, `login`, `session`, `logout`, `forgot-password`, `update-password`, `update-profile`, `delete-account` | Separate schemas per action; never log password/access-token fields. |

## Priority 1 — access-controlled user operations

| Route | Action/schema slices required | Notes |
|---|---|---|
| `/api/muse` | `type`/action dispatch plus each action payload | Largest route. Split schemas by existing action handler rather than one permissive object. |
| `/api/muse/call` | call start/end/list, recording-consent, recording start/stop | UUIDs, room/session fields, bounded message text; server derives actor. |
| `/api/muse/push` | `send`, `subscribe`, `unsubscribe` | Server derives sender; restrict target UUID and notification payload. |
| `/api/muse/referral` | `generate`, `apply`, `redeem-reward`, read actions | Code format, UUIDs; ignore client claims of eligibility. |
| `/api/muse/embed` | profile embedding, bulk/seed/status actions | Explicit admin/service-only schemas; do not allow arbitrary profile IDs from normal users. |
| `/api/muse/embeddings` | search/embed/status action | Text size limit, action enum, optional bounded filters. |
| `/api/muse/upload` | delete payload | Require a normalized storage path belonging to the authenticated actor; upload remains `FormData` validation. |
| `/api/muse/unsubscribe` | JSON/form fallback | Strict email and signed/unsubscribe-token verification where applicable. |

## Priority 2 — public or lower-risk endpoints

| Route | Action/schema slices required | Notes |
|---|---|---|
| `/api/muse/waitlist` | email, name/city/referral fields | Existing validation work should be retained and verified. |
| `/api/muse/support` | question/message | String length cap; no arbitrary model configuration. |
| `/api/qr` | URL/content options | Permit only expected URL origins/options; preserve rate limit. |

## Non-JSON exceptions

- `/api/webhooks/stripe` uses raw text and must retain signature verification
  before event handling.
- `/api/muse/upload` and multipart unsubscribe paths use `FormData`; validate
  file type/size/path or form fields after extraction.
- Cron routes use scheduled authorization and should not gain JSON parsing
  unless they actually accept a documented payload.

## Acceptance checks

1. Every JSON route has malformed-JSON, unknown-action, and invalid-shape tests.
2. Each privileged route has an unauthenticated and unauthorized test.
3. Payment, Connect, verification, and admin tests confirm client fields cannot
   select another user, mutate money, or assert verification.
4. Error responses are stable 400/401/403/429 classes without secret detail.
5. Test fixtures cover valid action branches before any source cleanup.
