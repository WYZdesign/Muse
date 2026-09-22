# P0: verification modal demo and privacy hardening — 2026-09-22

## Local changes

`src/app/(muse)/muse/components/AgeVerificationModal.tsx`

- Demo mode now stops before any verification-provider call and explicitly
  tells the visitor that no document, selfie, booking, or payment action will
  start.
- Replaced absolute storage/encryption claims with bounded, accurate UI copy:
  Stripe Identity processes the required ID/selfie; Muse receives the status
  needed for booking eligibility; the Privacy Policy is the source for
  processing/retention details.
- Kept the existing focus-trapped dialog semantics and raised the Not now
  target to 44px minimum.
- Replaced the unsupported “Expired” state label with “Not verified,” made the
  re-verification label conditional, and raised/wrapped verification-banner
  actions to preserve mobile target size without horizontal overflow.

## Local validation

- TypeScript syntax transpilation passed.
- `git diff --check HEAD` found no whitespace errors (line-ending notices
  only).

## Required release evidence

1. Privacy/security/counsel must verify every final Stripe-processing and
   retention statement against deployed provider, webhook, logging, backup,
   and access-control behavior.
2. Verify demo invocation never sends a provider request.
3. Verify non-demo staging lifecycle: valid, expired, pending, failed, retry,
   cancellation, and appeal/support behavior.
4. Run elevated build, full tests, and keyboard mobile E2E before deployment.
