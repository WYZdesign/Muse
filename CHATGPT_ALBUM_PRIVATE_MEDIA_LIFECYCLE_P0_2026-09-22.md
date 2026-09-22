# Album Private-Media Lifecycle P0 — Source Evidence 2026-09-22

## Scope

Read-only source review of `src/lib/muse-actions/albums.ts` and
`src/app/api/muse/upload/route.ts`. The upload route correctly routes new
`folder=album` uploads to private bucket `muse-private`, persists an internal
`storage://muse-private/...` locator, and later exchanges it for a signed URL.
That is positive remediation progress.

## P0-1 — Private albums can still be created/populated with public media locators

`albumCreate` accepts `cover_url` for a `private`/`invite` album without
requiring the private-storage locator. `albumAddPhoto` verifies album ownership
but does not read the album access level or require a private locator when the
album is private/invite. Its external-URL guard also permits non-private URLs
when `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` is absent or misconfigured.

The later `albumUpdate` safeguard blocks switching an existing album to
private when media is public, but it does not protect private-at-creation or
add-photo paths. Thus the product can promise private/invite access while
retaining a public storage/CDN URL.

### Required remediation

1. Centralize an authoritative album-media invariant: all private/invite
   album cover/photo locators must be `storage://muse-private/<owner-prefix>/…`
   (or an equivalent private asset ID), never a public URL.
2. Enforce it in create, update, and add-photo server actions; reject rather
   than silently accept a public URL. Validate owner prefix/path and bucket.
3. Migrate/audit existing private/invite records, revoke public access, and
   report/repair violations before beta.
4. Test direct API calls, not only normal UI uploads, for private/invite
   creation, updates, and photo addition.

## P1 — Album/photo deletion leaves private media orphaned

`albumRemovePhoto` deletes the `muse_album_photos` database row but never
removes its private storage object. `albumDelete` deletes the album database
row (and any DB-cascaded photos) but never deletes private cover/photo objects.
The generic upload DELETE route always targets `muse-uploads`, so it cannot
clean a `muse-private` object even if called with the same path.

This conflicts with deletion/retention promises, increases storage/cost risk,
and can preserve sensitive media beyond the user-visible deletion lifecycle.

### Required remediation

1. Build a server-side, owner-authorized asset-deletion service that resolves
   the bucket/path from a trusted stored locator—not a client-selected bucket.
2. On photo/album deletion, collect private locators, delete DB references and
   storage objects using an idempotent/retryable job/outbox with audit status.
   Define compensation/reconciliation for partial failures.
3. Include cover assets, thumbnails/derivatives, signed URL caches, moderation
   artifacts, backups, and retention/legal-hold exceptions in the written
   policy and implementation.
4. Add a periodic orphan scanner restricted to service credentials, with safe
   dry-run and repair workflow.

## Required acceptance tests

- Private/invite API requests carrying public `cover_url` or `img_url` are
  rejected; public albums retain intended public behavior.
- Direct unauthenticated/unrelated/matched/invited/owner storage requests are
  exercised for every visibility state.
- Deleting a photo and a whole album removes/invalidates all expected private
  objects and records a durable audit outcome; repeat requests are idempotent.
- Migration scan reports zero public URL/locator violations for non-public
  albums before launch.

## Targeted local remediation pending wyzmind review

`src/lib/muse-actions/albums.ts` now contains a narrow uncommitted guard that:

- requires private/invite album cover/photo locators to be under
  `storage://muse-private/<owner-profile-id>/…` on create and photo addition;
- enforces the same invariant when changing visibility or cover URL on update;
- preserves public-album behavior.

The initial edit was inspected and corrected before handoff; the final
`git diff --check HEAD` has no whitespace diagnostics. It needs focused unit/
integration coverage and an elevated production build before commit/deployment.
The storage-object deletion/orphan-reconciliation work remains separately
required and is intentionally not claimed fixed by this guard.

## Follow-up implementation and validation status

- `albumView` now permits an owner to view their own private album while
  retaining the rejection for every other viewer; focused unit coverage was
  added for that case.
- Focused Vitest execution was attempted directly with Node, but the local
  environment stopped before any test ran: Vitest could not create its
  temporary bundled config under `V:\\Muse\\node_modules\\.vite-temp`
  (`EPERM`). The earlier production build similarly stopped on `EPERM` writing
  `V:\\Muse\\.next\\trace`; Windows elevation was unavailable. These are
  local execution-permission blockers, not passing test/build results. Run the
  focused suite and production build from wyzmind's elevated/deployable
  environment before committing and deploying.
