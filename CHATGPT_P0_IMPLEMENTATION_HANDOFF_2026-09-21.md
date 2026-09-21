# ChatGPT P0 implementation handoff — 2026-09-21

Base observed locally: `909abfd` on `mutation-observer-fix`.

## Completed working-tree changes

### Restricted album object privacy and WebM MIME support

- `sql/migrations/0022_secure_album_storage_and_webm.sql` expands the public-media bucket to permit `audio/webm` / `video/webm` (25 MB) and creates the private `muse-private` bucket for album photos.
- `/api/muse/upload` stores `folder=album` objects privately as `storage://muse-private/<path>`; the album GET path issues one-hour signed URLs only after existing owner/private/invite authorization.
- New private-object uploads return a signed URL for owner-side optimistic UI. Legacy public objects cannot newly be marked Private/Invite until re-uploaded, preventing a false privacy claim.

### Recording consent and call age-gate

- `sql/migrations/0023_require_call_recording_consent.sql` creates one consent record per participant per call.
- Call age verification now fails closed: DB errors or missing participant rows return 503 instead of allowing a call.
- LiveKit Egress recording requires both participants’ persisted consent. The call hook records the initiating party’s consent and prompts the peer to explicitly consent before recording starts.

### Deletion/retention policy alignment

- Privacy and Terms copy no longer promise a 30-day/7-year schedule that the immediate-deletion code did not implement. It now accurately states prompt removal of accessible account/content with only legally/safety/fraud/dispute/recordkeeping-required retention.
- This is the approved policy-alignment option, not a soft-delete/purge-system implementation. Counsel review remains required.

## Files touched

- `sql/migrations/0022_secure_album_storage_and_webm.sql` (new)
- `sql/migrations/0023_require_call_recording_consent.sql` (new)
- `src/app/api/muse/upload/route.ts`
- `src/lib/muse-actions/albums.ts`
- `src/lib/muse-actions/get.ts`
- `src/app/api/muse/call/route.ts`
- `src/app/(muse)/muse/hooks/useCall.ts`
- `src/app/muse/privacy/page.tsx`
- `src/app/muse/terms/page.tsx`

## Verification

- `npx tsc --noEmit --incremental false` completed without TypeScript diagnostics.
- Standard `npx` prints a local npm-prefix access warning in this environment.
- `git diff --check` completed with no whitespace errors.

## Required verifier follow-up

1. Apply migrations `0022` then `0023` before deploying code that references the bucket/table.
2. Test raw URL denial, authorized signed URL creation, invite revocation, and WebM upload against the real bucket.
3. Test both-party consent from two accounts; one user must not start Egress alone.
4. Obtain counsel review of updated public retention wording before broad beta.

## Round 3 follow-up

After wyzmind merged and verified the P0 implementation as `95b7544`, the only remaining wording ambiguity was that “promptly” could imply a delayed soft-delete flow. Privacy and Terms now say account access and associated content are removed **immediately**, matching the current route behavior. `npx tsc --noEmit --incremental false` again completed with no TypeScript diagnostics; the local `npx` wrapper still emits its unrelated npm-prefix access warning.

## Round 4 — P1 registration account-enumeration fix (pending wyzmind review)

- `src/app/api/muse/auth/route.ts` no longer queries `muse_profiles` for an email before registration and no longer returns `409 Email already registered`.
- Registration now uses Supabase's verification-first public `signUp` flow. New and pre-existing addresses receive the same `202` `registrationPending` response and no authentication session, so response status/body do not reveal whether an address has an account.
- The profile insert is performed only for a real newly-created auth user; Supabase's existing-email obfuscated user (no identities) is not given a duplicate profile.
- `src/app/(muse)/muse/page.tsx` handles `registrationPending` by clearing the password, switching to Log In, and showing the neutral verification/sign-in guidance. It never assumes a `user` object is returned.
- Verification: `node_modules/.bin/tsc.cmd --noEmit --incremental false` and `node_modules/.bin/vitest.cmd run` both exited 0; `git diff --check` passed.

Reviewer checks before merge: confirm Supabase Auth's **Confirm email** setting is enabled in production and confirm its verification-email template/redirect returns users to `/muse`. This change intentionally makes verification a required registration step; that is what removes the previous oracle instead of merely rewording it.

## Round 4 — P1 authenticated rate-limit identity (pending wyzmind review)

- `src/app/api/muse/upload/route.ts` now uses `checkRateUser(profileId, ...)` for both upload and upload-delete after authentication rather than trusting `x-real-ip` / `x-forwarded-for` for a per-user quota.
- `src/app/api/muse/call/route.ts` likewise keys the call quota to the authenticated profile.
- This closes the forwarded-header evasion path for these authenticated, high-cost actions and prevents multiple legitimate users behind one NAT/mobile carrier from sharing a quota.
- Re-ran `node_modules/.bin/tsc.cmd --noEmit --incremental false`, `node_modules/.bin/vitest.cmd run`, and `git diff --check`; all exited 0 after this edit.

## Round 4 — P1 QR analytics IP pseudonymization (pending wyzmind review)

- `src/app/api/qr/route.ts` previously stored a reversible Base64 prefix of `x-forwarded-for` in a column called `ip_hash`. It now stores a full SHA-256 HMAC of the normalized client IP, keyed by `ANALYTICS_IP_HASH_SECRET`.
- If that secret is missing, the route stores `null` rather than silently falling back to raw, encoded, or unsalted IP data. This preserves the privacy claim and avoids collecting the value until operations configure the secret.
- Deployment requirement: add a high-entropy `ANALYTICS_IP_HASH_SECRET` in Vercel before relying on repeat-scan analytics. Existing historical values remain a data-governance cleanup task.
- Re-ran `node_modules/.bin/tsc.cmd --noEmit --incremental false`, `node_modules/.bin/vitest.cmd run`, and `git diff --check`; all exited 0.

## Round 4 — regression coverage added

- Added `does not reveal an existing account during registration` to `src/app/api/muse/auth/auth.route.test.ts`. It mocks Supabase's no-identities existing-user response and asserts the neutral 202 pending-registration shape, with neither address nor “already registered” text exposed.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0 after adding the test.
- Local Vitest verification was subsequently blocked before execution by `EPERM` creating `V:\Muse\node_modules\.vite-temp\vitest.config...mjs`; please run `npx vitest run` in wyzmind's unrestricted shell to verify the new test alongside the suite. No test failure was reported—the runner never loaded its config.

## Round 4 — environment-template completion

- `.env.example` now documents `OAUTH_STATE_SECRET` (required dedicated OAuth-state signing key) and `ANALYTICS_IP_HASH_SECRET` (optional keyed QR IP pseudonymization). Both include high-entropy generation guidance.
- It now explicitly sets `NEXT_PUBLIC_DEMO_MODE=true` in the example and documents that it remains enabled for internal review until an explicit real-user-launch decision and rebuild/redeploy.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0 after this documentation-only change. Wyzmind subsequently reported `360 passed` for the full Vitest suite after updating the call/upload rate-limit mocks.

## Round 5 — mobile Discover accessibility (pending wyzmind review)

- Live mobile AX inspection found the three visual stack cards were all fully exposed to assistive technology. `src/app/(muse)/muse/screens/DiscoverScreen.tsx` now applies `aria-hidden` and native `inert` to the two non-active preview cards.
- This preserves the visual stack while preventing duplicate profile narration and tab focus from landing on controls covered by the active card.
- The card deck is also now a labelled `region` rather than an `application`; the latter unnecessarily suppresses normal screen-reader reading/navigation behavior for a standard content carousel.
- Added useful text labels for profile-photo, prompt, and portfolio-photo navigation, including portfolio dot controls, instead of leaving assistive technology to announce arrow glyphs or unnamed buttons.
- Replaced generic Discover image alt text with `Profile photo of {name}` and `{name}'s portfolio photo {n}` so the card's visual work has meaningful context.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0. Please run the normal full Vitest suite before merge.

## Round 5 — media-label accessibility bundle (pending wyzmind review)

- Replaced generic avatar alt text in BTS, Feed composer/detail, and notification rows with the creator/sender's name where available.
- Follow-on identified, intentionally not mass-edited: numerous legacy interactive informational badge spans in Collab, Community, Network, Profile, and Sessions are pointer-focusable but lack Enter/Space handlers. This needs a systematic component-level keyboard-a11y pass plus regression coverage, rather than a brittle search-and-replace across unrelated flows.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0 for the complete current bundle. Please run the normal full Vitest suite before merge.

## Round 5 — keyboard badge bundle (pending wyzmind review)

- Added Enter/Space activation to every interactive category/status badge on Collab briefs (TFP, Paid, Open Call, Ideas, Urgent, and 18+) and to the “Interested” / locked “Pro” labels in Muses.
- These were already announced as buttons and focusable, but mouse/touch-only; keyboard users can now open the same explanatory badge information.
- The remaining cross-screen badge inventory is still documented above for a systematic follow-on (Community, Network, Profile, Sessions). `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0 after this bundle.

## Round 5 — Community and Profile keyboard badge bundle (pending wyzmind review)

- Added Enter/Space activation to Community detail category/18+ badges and Profile founding-tier/earned-badge controls.
- The remaining known keyboard-badge screens are Network and Sessions, plus the repeating Community list badges; these are suitable for wyzmind's next systematic bundle if desired.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0.

## Round 5 — complete Sessions keyboard badge variants (pending wyzmind review)

- Completed the remaining high-use booking variants in Sessions: skill tags, requester-side member verification, payment state, and booking state now activate with Enter/Space.
- Current unmerged source bundle spans BTS/Feed/notifications media labels and the Collab, Community detail, Muses, Network, Profile, and Sessions keyboard fixes. Wyzmind should run the full Vitest suite, commit, deploy, then re-check the mobile AX tree.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0.

## Round 5 — Network and Sessions keyboard badge bundle (pending wyzmind review)

- Added Enter/Space activation to Network “Seeking” and professional-signal badges, plus the first booking-card host-verification, payment-state, and session-state badges in Sessions.
- This closes the high-traffic card instances from the original keyboard badge inventory. Additional duplicate detail-card variants in Sessions and Community list-card badges remain a low-risk cleanup pass if wyzmind wants to complete every legacy instance.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `git diff --check` exited 0.
