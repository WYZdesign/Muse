# HANDOVER: Audit Fixes Applied by ox-alpha (2026-09-12)

## Status: COMMITTED + PUSHED (42e5771)

Applied on top of Claude's UI overhaul (7a38ed7). All fixes are surgical
to avoid overlap with Claude's screen refactoring work.

## Fixes Applied (14 total, 13 files)

### CRITICAL (2)

| Fix | File | What changed |
|-----|------|-------------|
| SubscriptionScreen Rules of Hooks | `screens/SubscriptionScreen.tsx` | Moved `useState` calls + `useEffect` above the early `return null`. Hooks must be called unconditionally. |
| ChatScreen ref overwrite | `screens/ChatScreen.tsx` | Added local `scrollSentinelRef` for the sentinel div. `messagesEndRef` was assigned to both the messages container AND the sentinel — second assignment overwrote first, breaking scroll-to-bottom. |

### HIGH (7)

| Fix | File | What changed |
|-----|------|-------------|
| Email HTML injection | `lib/email.ts` | `waitlistWelcome` interpolated raw `email`, `signupWelcome` interpolated raw `name` (via `who`). Both now use `escapeHtml()`. |
| XSS sanitization | `lib/request-safety.ts` | `sanitizeText` now encodes HTML entities (`&`, `<`, `>`, `"`, `'`) after stripping tags. Prevents double-encoding bypass. Also blocks `data:` URIs. |
| Rate-limit memory leak | `lib/rate-limit.ts` | Added `memCleanup()` that runs every 60s, deletes `MEM_RATE` keys where all timestamps are stale (>60s). Prevents unbounded memory growth on warm instances. |
| QR SSRF prevention | `api/qr/route.ts` | Both GET and POST now validate URL format, reject non-http/https protocols, block localhost/loopback/link-local addresses. |
| FeedScreen shared comment text | `screens/FeedScreen.tsx` | Added `postCommentTexts` state (`Record<number, string>`). Both inline reply and detail modal reply now use per-post state instead of the shared prop. |
| DiscoverScreen portIdx -1 | `screens/DiscoverScreen.tsx` | Moved `if (!albumPhotos.length) return` BEFORE `portIdx` computation. Previously `Math.min(portfolioPhotoIdx, -1)` returned -1 when empty. |
| QuestPanel division by zero | `screens/QuestPanel.tsx` | Added `q.target > 0` guard before `q.progress / q.target`. |

### MEDIUM (5)

| Fix | File | What changed |
|-----|------|-------------|
| FeedScreen optimistic rollback | `screens/FeedScreen.tsx` | Post button optimistically added post, but on API failure the post was never removed. Now captures `optimisticId` and filters it out on catch. |
| CodexScreen icon bundle | `screens/CodexScreen.tsx` | `import * as icons from "react-icons/gi"` (~4000 icons) replaced with 4 named imports: `GiMoon`, `GiCrown`, `GiButterfly`, `GiPaintBrush`. |
| RevenueCat debug logging | `hooks/useRevenueCat.ts` | `LOG_LEVEL.DEBUG` was always set. Now `DEBUG` in dev, `INFO` in prod. |
| SettingsScreen Facebook icon | `screens/SettingsScreen.tsx` | Facebook entry used `FiTwitter` (bird icon). Changed to `FiFacebook`. Added `FiFacebook` to import. |
| Gold referral discount | `page.tsx` | Gold (>=20 referrals) showed `discount:20` — same as Platinum. Changed to `discount:15`. |

## What Claude Already Fixed (no action needed)

These were already addressed by Claude's recent commits (pre-existing):

- **MenuModal Rules of Hooks**: `ActivityPanel` is already a proper function component (line 174)
- **FeedScreen recording timeout**: `recTimeoutRef` tracked + cleared in `closeCamera` + unmount cleanup (line 172, 186, 196)
- **Auth error toast**: No longer shows "Upload failed" on auth errors
- **Debug window.__exp**: No longer present

## What's STILL Left for Claude

### page.tsx (small targeted fixes OK, splits/cleanup = Claude only)

| Issue | Status | Notes |
|-------|--------|-------|
| `role="presentation"` on 25+ modal overlays | Not fixed | Architectural pattern across 25+ files — needs consistent `role="dialog" aria-modal="true"` on content containers |
| 160+ useState calls | Not fixed | Needs `useReducer` refactor |
| ~40 deps on `saveState` useCallback | Not fixed | Recreated constantly, triggers debounce re-fire |
| Unmatched setTimeouts in `doSwipe` (lines 1240-1261, 1748-1751) | Not fixed | Multiple untracked timeouts for swipe lock/confetti/overlay — needs refs + cleanup |
| `discoverSearch` IIFE per card | Not fixed | Runs every render per card, should be memoized |
| `allPhotos`/`portraitPics`/`landscapePics` in IIFE | Not fixed | Should be memoized |

## Build Status

- **tsc**: 3 pre-existing errors from `useSpatialDepth.ts` missing `@tensorflow/*` types (Claude's new file)
- **vitest**: 285/285 pass
- **npm run build**: Not run (Vercel is authoritative build gate)

## Visual Audit (2026-09-13)

Full audit report: `VISUAL-AUDIT-20260913.md`

**Result: 25/26 screens PASS** (1 FAIL = Quests menu item not individually clickable — accessed via streak widget instead)

### Key Findings
- Login works with correct password (`Torye91?!`)
- All 6 bottom nav screens render correctly (Discover, Feed, Collab, Muses, BTS, Menu)
- Menu slide-out panel functional with Sessions, Network, Profile, Settings, Quests, Muse Pro
- Settings page has all preference controls (age range, distance, show me, notifications)
- Landing subpages (about, pricing, faq, safety, guidelines, terms, privacy, blog, careers, press) all render
- 404 page renders with gold CTA
- Daily streak overlay appears after login (11 day streak, View Quests / Later)
- "Verify your identity" banner visible on Discover for unverified accounts

### Minor Issues (non-blocking)
- Muses list: profile names slightly truncated at right edge
- Menu: blurred background bleed on left edge (cosmetic, standard slide-out pattern)
- Profile Completion shows 0% (expected for test account)

### Screenshots
All screenshots in `test-screenshots/visual-audit-20260913/`

---

## Session 2: Security Hardening (8195eb9, 2026-09-12)

### Status: COMMITTED + PUSHED

Applied 11 critical/high security fixes + edge proxy + 30 new tests.

### CRITICAL Fixes (5)

| Fix | File | What changed |
|-----|------|-------------|
| Push endpoint auth bypass | `api/muse/push/route.ts` | Moved auth check BEFORE `send` action. Was letting anyone send push notifications to any user without authentication. Added `isAdminEmail` guard for cross-user sends. |
| OAuth state tampering | `lib/oauth-state.ts` + `social/route.ts` + `social/callback/route.ts` | New HMAC-SHA256 signed state parameter. Previously was unsigned base64url — anyone could forge the `{profileId, provider}` payload. |
| Edge proxy (NEW) | `src/proxy.ts` | Created Next.js 16 proxy.ts (replaces deprecated middleware.ts). Adds CORS origin gating for mutating API requests, edge rate limiting for 6 sensitive routes, blocked user agents, security headers. |
| Verification crash | `api/muse/verification/route.ts` | Changed `.single()` → `.maybeSingle()` for profile lookup. Was throwing when no profile found. |
| MFA brute-force | `api/muse/mfa/route.ts` | Added rate limiting (30/min general, 5/min for verify actions) + try/catch with proper error responses. |

### HIGH Fixes (5)

| Fix | File | What changed |
|-----|------|-------------|
| Push rate limiting | `api/muse/push/route.ts` | Added `checkRate(ip, "push-send", 30)` for send actions |
| Embeddings error checking | `api/muse/embeddings/route.ts` | Added `error` checking on all Supabase queries (search, info). Was silently ignoring DB errors. |
| Track-event payload limit | `api/muse/route.ts` | Added 10KB JSON payload limit on `track-event` and `track-error` to prevent abuse via huge props blobs. |
| Referral reward redemption | `api/muse/referral/route.ts` | Re-implemented with Stripe subscription verification. Was disabled (HTTP 410) due to fraud surface. Now requires admin + active Stripe subscription on referee. |
| Blog page | `app/muse/blog/page.tsx` | Replaced "Coming soon" placeholder with 5 real blog post entries. |

### MEDIUM Fixes (1)

| Fix | File | What changed |
|-----|------|-------------|
| Geocode error handling | `api/geocode/route.ts` | Moved `checkRate()` inside try/catch. Was throwing unhandled if rate-limit check failed. |

### OAuth State Signing Helper
- `lib/oauth-state.ts` — new file
- `signState()`: HMAC-SHA256 signs base64url-encoded JSON
- `verifyState()`: verifies signature + checks expiry (default 10 min)
- Uses `OAUTH_STATE_SECRET` env var (falls back to `STRIPE_SECRET_KEY`)

### New Test Files (30 tests, 315 total)

| File | Tests | Coverage |
|------|-------|----------|
| `lib/oauth-state.test.ts` | 6 | Round-trip, tampered payload/sig, expiry, garbage |
| `verification/verification.route.test.ts` | 5 | Auth, maybeSingle null, status, unknown action, age verified |
| `mfa/mfa.route.test.ts` | 11 | Auth, status, factors, enroll, verify, challenge, unenroll, unknown |
| `embeddings/embeddings.route.test.ts` | 8 | Auth, embed, search, batch, info, unknown |

### Build + Tests
- `next build`: passes (Proxy active, Turbopack)
- `vitest`: 315/315 pass
