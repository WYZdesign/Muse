# Authenticated-App Indexing & Privacy Bundle — ChatGPT — 2026-09-22

## Live evidence

The authenticated application route `https://muse.wyzdesign.com/muse` currently emits `meta[name="robots"] = "index, follow"`.

For a creative-network app containing identity, matching, messages, booking, and profile context, indexing policy must be explicit. A client-side auth gate is not a crawler/privacy boundary by itself.

## Deliver as one indexability policy bundle

1. Classify every route/surface:
   - public marketing/landing pages: indexable only where intended;
   - intentionally public creator portfolio/profile pages: indexable only with clear privacy controls and canonical URLs;
   - authenticated app, inbox, matches, settings, bookings, safety, admin, drafts, and any personalized feed: `noindex, nofollow` plus server-side access control.
2. Emit route-appropriate `<meta name="robots">` and server `X-Robots-Tag`; do not rely on client rendering or `robots.txt` as a privacy control.
3. Ensure Open Graph/Twitter metadata for private/authenticated routes does not expose a user’s name, photo, location, relationship state, or personalized content.
4. Set canonical URLs only for public, stable content. Prevent query/session/filter/deep app URLs from becoming indexable duplicates.
5. Add a deploy test/crawler snapshot verifying index/noindex policy and public metadata by route class.

## Acceptance gate

- `/muse` and all authenticated/private subflows emit `noindex, nofollow` before client hydration.
- Public pages retain intentional search discoverability.
- No personalized or private metadata appears in crawler-visible HTML, OG, Twitter, sitemap, or canonical output.
- Server authorization remains the enforcement boundary regardless of indexing directives.
