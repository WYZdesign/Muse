# Discover ranked-card production regression handover — 2026-10-10

## Severity
**P0 for closed beta.** A signed-in user can reach Discover and receive no swipe cards.

## Verified evidence
- Production URL: `https://muse.wyzdesign.com/muse`
- Browser request: `GET /api/muse?type=discover-ranked`
- Production response: HTTP **400**, body `{"error":"Unknown type"}`
- The same live runtime also returned HTTP 400 for `type=matches`, `type=notifications`, and `type=notification-count`.
- Source at main commit `d086110cc3e71d7b19706742064c4e7ffc544e4f` contains the corresponding GET handlers in `src/lib/muse-actions/get.ts`, and `src/app/api/muse/route.ts` exports that handler.

This is deployment/runtime parity failure evidence, not proof that the database has no eligible profiles.

## User-facing cause
`useDiscoveryData` expected `{ profiles: [...] }`. When the 400 payload arrived, the client silently left `liveProfiles` empty. Production mode deliberately does not substitute demo people, so `buildFilteredProfiles` produced an empty deck.

## Proposed code safeguard
This branch:
1. treats a non-2xx ranked-discovery response or malformed payload as an error;
2. shows a truthful error toast instead of failing silently;
3. adds a focused regression test for the observed `400 Unknown type` response.

It intentionally does **not** show fake people as a production fallback.

## Release-owner action
1. In Vercel, locate the deployment currently aliased to `muse.wyzdesign.com`.
2. Confirm its source commit and routing output match main `d086110cc3e71d7b19706742064c4e7ffc544e4f` or the merged fix commit.
3. Redeploy/reattach the correct deployment if the alias is stale or the function bundle predates the current GET handler.
4. Authenticate in production and confirm:
   - `GET /api/muse?type=discover-ranked` returns 200 and a `profiles` array;
   - Discover renders at least one real eligible card when data exists;
   - the failure toast appears, rather than an empty silent deck, if the endpoint is intentionally made unavailable.
5. Record the deployed commit in `DELIVERY_STATUS.md`.

## Ownership
- **Release/Vercel:** wyzmind
- **Source guard and regression test:** Codex, this PR
- **Do not make unrelated page.tsx refactors:** Claude Code may be working in adjacent source areas.

## Links
- Incident: https://github.com/WYZdesign/Muse/issues/14
- Source-guard PR: created from branch `codex/discover-ranked-production-guard`
