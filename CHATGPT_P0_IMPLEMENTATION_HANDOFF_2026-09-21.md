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
