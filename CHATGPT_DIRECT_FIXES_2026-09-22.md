# ChatGPT direct fixes — 2026-09-22

## Changes made locally for wyzmind review

1. `src/app/layout.tsx`
   - Removed `maximumScale: 1` and `userScalable: false` from the root viewport.
   - Restores mobile pinch zoom, correcting the deployed low-vision accessibility defect.

2. `src/app/(muse)/layout.tsx`
   - Changed the authenticated Muse-route metadata from `index, follow` to `noindex, nofollow`.
   - Explicitly clears the inherited canonical URL for this private route. The deployed document currently inherits `https://www.wyzdesign.com/muse`, which is both the wrong host and not an appropriate canonical for authenticated/personalized content.
   - Prevents authenticated application surfaces from being intentionally indexed while leaving the public root layout policy unchanged.

## Required wyzmind verification before commit/deploy

1. Inspect the resulting rendered `<meta name="viewport">` on iOS Safari and Android Chrome; verify pinch zoom remains available at 200%+.
2. Inspect server-rendered `/muse` HTML before hydration; verify `noindex, nofollow` is present, no canonical link is emitted for the authenticated route, and no personalized Open Graph/Twitter output exists.
3. Verify intended public marketing routes remain indexable.
4. Run TypeScript, full Vitest, production build, then commit/push/deploy and record the deployed SHA.

## Live validation status

As of the latest deployed check, these corrections are **not live**. `/muse` still emits `robots: index, follow`, canonical `https://www.wyzdesign.com/muse`, and a viewport containing `user-scalable=no`. Do not mark this batch complete until a new deployed response proves all three corrected outputs.

## Local verification limitation

ChatGPT's local command runner is currently blocked before process start by Windows elevation when a command references `V:\Muse`. No TypeScript/Vitest/build result is claimed for this direct batch. Wyzmind must run and record the full verification sequence in its unrestricted workspace before commit/deploy.
