# Password Security Decision — 2026-10-03

## Verified state

Supabase’s production advisor reports leaked-password protection disabled.
Supabase’s current password-security documentation states that its HIBP-backed
leaked-password protection is available on the **Pro plan and above**. The
project constraint is no additional spending, so this setting cannot be treated
as a free operational toggle.

## Decision required

Choose one of these release paths before broad beta:

1. **Fund the Supabase plan feature** and enable leaked-password protection in
   **Authentication → Providers → Email → Password security**, then verify a
   known-compromised password is rejected in a non-production test account.
2. **Keep the no-spend posture** and accept this as a documented residual risk
   for a deliberately limited, invitation-only closed beta. In this path,
   implement the no-cost controls below before opening broader cohorts.

## No-cost baseline for the active source work

- Require at least 12 characters at registration and password reset.
- Require at least three of lowercase, uppercase, number, and symbol; reject
  whitespace-only and common placeholder values.
- Enforce the same rules server-side in `/api/muse/auth`, never only in the UI.
- Keep login/reset/update-password rate limits and generic error language.
- Offer MFA prominently after onboarding and before sensitive account changes.
- Add registration, reset, and update-password tests for weak, malformed, and
  valid passwords; never include real credentials in fixtures.

## Verification record

After either path, record the dashboard setting (without secrets), the exact
test outcome, and the beta cohort decision in the release ledger. Existing
users should receive a non-blocking password-upgrade prompt rather than a
surprise lockout.
