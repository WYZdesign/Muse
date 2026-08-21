# Muse App — Handover for Claude (opencode)

**Date:** 2026-08-20  
**Commits pushed:** `69cac88`, `51253c2`, `505331f`, `f1c7c27`, `fccddf5`, `de9958d`, `11ee95e`  
**Build status:** Clean (`tsc --noEmit` + `npm run build` both pass)  
**Vercel:** Auto-deploys from `main`

---

## CRITICAL — Stub Users Are Hardcoded, Not In the Database

**Finding (confirmed 2026-08-20 by Chrome Claude + verified against repo):**
The Discover deck profiles (ARCANA, MITRI, ASHONDI, AUDREY, CHER, etc. — ~68 profiles) are **NOT in Supabase**. They are hardcoded in `src/app/(muse)/muse/components/types.ts` in the `PROFILES` array (plus `BRIEFS`, `COMMUNITIES`, `EVENTS`, `SESSIONS`, `AESTHETICS`, `CREATIVE_TYPES`, `LOOKING_FOR`).

**Implication for "remove stub users before beta":**
This is a **code edit, not a database delete**. To remove stub users before beta:
1. Edit/reduce the `PROFILES` array in `types.ts` (line 17 onward, ~90 entries)
2. Do NOT go looking for `muse_profiles` DB rows to delete — they won't be there (only ~5 real audit accounts exist, mostly empty avatars)

**How the deck is assembled** (`page.tsx` line 795):
- `const base = [...PROFILES]` → shuffled → merged with real `liveProfiles` from Supabase
- So the demo profiles render first, real users appended after

**Image storage reality:**
- Demo images: static files in `public/models/` (79 model folders, `.webp`)
- Real user uploads: Supabase storage bucket `muse-uploads` (public, currently 0 objects)
- `photoOrientation.ts` already tags every model image portrait/landscape (`PORTRAIT_IMG` map) — used to pick 3-5 portrait cards for swipe

**Deck image paths live in these columns on `muse_profiles`:** `avatar`, `portfolio`, `photos` (currently mostly empty / Unsplash placeholder URLs).

---

## Owner Decisions (locked in 2026-08-20)

| Topic | Decision |
|-------|----------|
| **Email** | Send email "any chance it gets" — consistent, transparent comms. Sender = `info@wyzdesign.com` (may change later). Provider = **Resend** (fail-open, no SDK dep). |
| **Strikes** | Combine ALL strikes, weight equally. No per-severity tracks. 3 active strikes → suspension; `suspension`/`permanent_ban` severity still = instant action. |
| **Vision audits** | Claude (Chrome) owns all visual/frontend audits — it navigates without screenshots and explains findings in detail so opencode fixes with full context. opencode does NOT run Playwright screenshot audits anymore. |
| **Pricing layout** | Fixed — lone card now spans full width at ≤920px. |
| **Debris** | Cleaned — audit scripts + stale reports removed, dirs gitignored. |
| **Closed beta** | Starts at 150+ REAL landing signups (newsletter/email signups who actually register for the app). Not before. |
| **Open beta** | ~1 month after closed beta (or after enough feedback), runs until ~500–1k users (TBD). |
| **Founding cap** | 150 is the real cap. Count must reflect ACTUAL newsletter/app signups, not inflated. |
| **Side job** | Claude is currently auditing all match-card profile images (attractive / centered / portrait). |

---

## What Was Fixed This Session

### 1. Subscription/Settings double-page-scroll (commit `69cac88`)
**Problem:** Muse Pro and Settings screens rendered their own full phone-frame while the main app's phone-wrap stayed visible as empty scrollable content on desktop.

**Fix:**
- `src/app/(muse)/muse/muse.css` line 568: Added `.phone-wrap-standalone-hidden{display:none!important}`
- `src/app/(muse)/muse/page.tsx` line 1605: Conditional className hides main phone-wrap when `screen==="subscription"||screen==="settings"`

### 2. Landing page fixes (commit `51253c2`)
- 10 legal/placeholder pages created (terms, privacy, pricing, faq, about, blog, careers, press, guidelines, safety)
- Mobile hamburger nav added for ≤720px viewport
- Viewport zoom fix: `maximumScale: 5` (was `1` with `userScalable: false`)

### 3. App polish (commit `505331f`)
- **SubscriptionScreen header:** "Profile" text was invisible — had `backgroundClip: "text"` + `WebkitTextFillColor: "transparent"` but no `background` gradient. Fixed: now shows "Muse Pro" with gold-to-lavender gradient.
- **Image fallback improved:** `handleImgError` in `page.tsx` now shows dark background with gold camera icon or initials instead of garish pink/purple gradient.
- **Tutorial spotlight overlay:** 5 tutorials had `anchor: "card"` with no `selector`, causing highlight ring to cover 84%×52% of viewport. Added real selectors: `.conn-card` for community/forum/sessions/events, `.brief-card` for collab.

---

## Known Issues Still Open

### Resolved this session (commit `f1c7c27`)
- **§3 Founding-member "already yours" badge** — ✅ Implemented. Added gold-to-lavender "✓ You have this" pill badge on the current tier card + "Browse plans below anytime — you won't be charged" reassurance line under the founding banner in `SubscriptionScreen.tsx`.
- **§4 BTS empty-state placeholder** — ✅ Implemented. Empty-state cards now show a centered camera icon + "No moments yet" label instead of a bare gradient rectangle.
- **§6 SQL catch-up migration** — ✅ VERIFIED applied. All 7 tables (`muse_waitlist`, `muse_landing_analytics`, `muse_qr_events`, `muse_verification_sessions`, `muse_rate_limits`, `muse_events_log`, `muse_ncmec_reports`) + 4 columns (`founding_tier`, `pro_expires_at`, `age_verified`, `suspended`) confirmed live via PostgREST (status 200).

### From HANDOVER_V3 (Chrome extension Claude) — still open
1. **Waitlist confirmation email** — ✅ CODE DONE. `sendEmail(waitlistWelcome(...))` now fires after signup. **BLOCKER: needs `RESEND_API_KEY` in Vercel + `wyzdesign.com` domain verified in Resend (SPF/DKIM DNS).** Until then it fail-opens silently (logs a warning, never breaks signup).
2. **§4 Discover card "blank" appearance** — Downgraded to false alarm by Chrome Claude: card was fully loaded 1s later, lazy-load/render-timing artifact. No further action.

### Remaining
3. **Onboarding full tab-by-tab visual audit** — OWNED BY CHROME CLAUDE now (per owner decision). Not opencode's job anymore.
4. **Pricing section narrow-viewport (≤920px) layout** — ✅ FIXED. Third `.muse-tier-card.standard` now spans full width at ≤920px.

---

## Architecture Notes for Claude

### Navigation
- **Hamburger menu** (`openHamburger` → `MenuModal`): Activity, Community, Sessions, Network, Profile, Settings, Muse Pro
- **Screen switching:** `showScreen("screenName")` for direct nav; `setHamburgerScreen("sub")` for sub-menus
- **Bottom Nav:** `<Nav>` component in each screen, uses `active` prop + `onNavigate` callback

### Onboarding Flow (18 steps)
0. Find your Muse → "Get Started"
1. Your Info → name (required), location, bio → "Next"
2. Creative Type → select chip → "Next"
3. Looking For → select chips (multi) → "Next"
4. Aesthetic Style → select chips (multi) → "Next"
5. Know Yourself? → "Skip, Set Up Later" → step 14
6-9. Zodiac/Chinese/MBTI/LifePath (all skippable)
10-13. Discovery tests (skippable)
14. Photo → skip → 15
15. Portfolio → skip → 16
16. Socials → skip → 17
17. "Enter Muse" → Discover

### Key Files
| File | Purpose |
|------|---------|
| `src/app/(muse)/muse/page.tsx` | ~2459-line SPA monolith, all state + routing |
| `src/app/(muse)/muse/muse.css` | All app styles |
| `src/app/(muse)/muse/screens/*.tsx` | Individual screen components |
| `src/app/(muse)/muse/screens/tutorials.ts` | Tutorial definitions with selectors |
| `src/app/(muse)/muse/screens/MenuModal.tsx` | Hamburger menu panel |
| `src/app/(muse)/muse/components/Nav.tsx` | Bottom navigation bar |
| `src/app/api/muse/*.ts` | API routes (auth, waitlist, etc.) |

### Supabase
- **Production:** `ejbwjmzrazfgtisqsamf`
- **Staging:** `rwgofoxqycpzsvxfnozt` (user wants to delete this manually)

### Stripe
- **Muse account:** `acct_1U0n04AlrkQDEH7C`
- **MUSEBETA promo code:** $0 checkout verified working

### Email (Resend)
- **Module:** `src/lib/email.ts` — single source of truth for all outbound email.
- **Sender:** `Muse <info@wyzdesign.com>`
- **Entry points:** `sendEmail(msg)` core; templates `waitlistWelcome()`, `betaAccess()`, `notify()`.
- **Wired so far:** waitlist signup confirmation (`/api/muse/waitlist` → `sendEmail(waitlistWelcome(...))`).
- **TO ACTIVATE:** set `RESEND_API_KEY` in Vercel + verify `wyzdesign.com` domain in Resend (SPF/DKIM DNS records). Until then all sends fail-open silently.
- **Design rule:** email must NEVER block a user flow — every call is fail-open, fire-and-forget (`.catch(() => {})`).

### Run Audit
```bash
python _audit/run_audit.py
```

---

## Project Map — Paths, Files & Folders

### Repo & root
- **Local root:** `V:\Muse`
- **Git remote:** `https://github.com/WYZdesign/Muse.git` (branch `main`)
- **CI/CD:** Vercel auto-deploys from `main` (project `prj_JMdRLrJ57tAB1jTwJd2GqirZClvr`)
- **Build tooling:** Next.js 16.3.1 (Turbopack), TypeScript, Vitest (unit tests), Playwright (E2E/audit), Capacitor (native wrappers)

### Top-level directories
| Path | Purpose |
|------|---------|
| `src/app/` | All Next.js routes (App Router) |
| `src/components/` | Shared UI components |
| `src/lib/` | Shared logic (Supabase, Stripe, rate-limit, AI) |
| `sql/` | 33 migration SQL files (run manually against Supabase) |
| `public/` | Static assets (icons, manifest, og-image) |
| `scripts/` | Build/deploy helper scripts |
| `tests/` | Test suites |
| `.github/` | GitHub Actions workflows |
| `.vercel/` | Vercel project config |
| `android/`, `ios/` | Capacitor native shell projects |
| `_audit_artifacts/`, `_AUDIT_SHOTS/`, `_STATE/`, `temp_screens/`, `test-results/` | Audit/debug debris — safe to delete |
| `.next/` | Build output (generated, do not edit) |

### Route structure (`src/app/`)
| Path | Route | Notes |
|------|-------|-------|
| `(muse)/muse/page.tsx` | `/muse` | **Main SPA monolith** (~2459 lines) — all app state, routing, screens |
| `(muse)/muse/muse.css` | — | All app styles |
| `(muse)/muse/screens/` | — | 17 screen components (see below) |
| `(muse)/muse/components/` | — | `Nav.tsx`, shared UI |
| `(muse)/muse/hooks/`, `lib/` | — | App-specific hooks + helpers |
| `(muse)/muse/admin/` | `/muse/admin` | Admin + moderation pages |
| `(muse)/muse/profile/[id]/` | `/muse/profile/[id]` | Public profile pages |
| `(muse)/muse/post/[id]/` | `/muse/post/[id]` | Public post pages |
| `(muse)/muse/offline/`, `reset-password/` | — | Offline + reset-password pages |
| `muse/landing/` | `/muse/landing` | **Landing page** (promo splash + waitlist) |
| `muse/terms|privacy|pricing|faq|about|blog|careers|press|guidelines|safety/` | `/muse/*` | 10 legal/placeholder pages |
| `muse/verify/` | `/muse/verify` | Verification page |
| `terms/`, `privacy/`, `safety/`, `dmca/` | `/terms`, `/privacy`, `/safety`, `/dmca` | Top-level legal pages |
| `layout.tsx`, `globals.css` | — | Root layout + global styles |
| `sitemap.ts` | `/sitemap.xml` | SEO sitemap |

### Screen components (`src/app/(muse)/muse/screens/`)
`BtsScreen.tsx` (BTS/moments), `ChatScreen.tsx`, `CodexScreen.tsx`, `CollabScreen.tsx` (briefs), `CommunityScreen.tsx`, `DiscoverScreen.tsx`, `FeedScreen.tsx` (connections), `MenuModal.tsx` (hamburger panel), `MusesScreen.tsx` (matches), `NetworkScreen.tsx`, `PortfolioScreen.tsx`, `ProfileScreen.tsx`, `SessionsScreen.tsx` (bookings), `SettingsScreen.tsx`, `SubscriptionScreen.tsx` (Muse Pro), `TutorialOverlay.tsx`, `tutorials.ts` (tutorial definitions)

### API routes (`src/app/api/`)
| Path | Purpose |
|------|---------|
| `muse/route.ts` | **Main action dispatcher** (48+ actions) |
| `muse/auth/` | Authentication |
| `muse/waitlist/` | Landing waitlist signup (POST) |
| `muse/landing-stats/` | Landing stats count (GET) |
| `muse/checkout/` | Stripe Checkout session |
| `muse/verification/` | Stripe Identity verification |
| `muse/content-scan/`, `muse/embed/`, `muse/embeddings/` | AI moderation + vector embedding |
| `muse/match/`, `muse/connect/`, `muse/referral/`, `muse/support/`, `muse/push/`, `muse/upload/` | Feature-specific endpoints |
| `muse/cache-version/` | Cache versioning |
| `checkout/` | Checkout (top-level) |
| `qr/` | QR code generation |
| `geocode/` | Mapbox geocoding |
| `cron/`, `webhooks/`, `backup/`, `health/` | Ops + webhooks |

### Shared libs (`src/lib/`)
`supabase.ts` (Supabase clients + service role), `money.ts` (Stripe amount parsing), `rate-limit.ts` (durable rate limiting), `email.ts` (Resend email — all outbound mail), `ai.ts` + `aiModeration.ts` + `aiDocs.ts` (AI pipeline), `contentScan.ts` (content scanning), `errorTracker.ts`, `http.ts`, `request-safety.ts`. Test files: `*.test.ts` (Vitest, 53 tests).

### Shared components (`src/components/`)
`BackgroundScene.tsx` + `.css` (animated aurora/sunset background), `SplashScreen.tsx` (pre-login splash), `ErrorBoundary.tsx`, `CardPreloader.tsx`, `ScreenSkeleton.tsx`.

### SQL migrations (`sql/`)
33 files. Key ones: `MUSE_CATCHUP_ALL_20260819.sql` (**APPLIED** — creates 7 tables + rate-limit RPC + founding trigger), `MUSE_SCHEMA_FULL_20260813.sql`, `MUSE_FOUNDING_MEMBERS_20260805.sql`, `MUSE_RATE_LIMIT_20260819.sql`, `MUSE_NCMEC_20260813.sql`, `MUSE_TRUST_SAFETY_20260803.sql`. Run manually via Supabase SQL editor — never via code.

### Handover docs (root)
`HANDOVER_APP.md` (this file), `HANDOVER_LANDING.md`, `HANDOVER_V3_UX_AUDIT.md`, `HANDOVER.md`, `CLAUDE_HANDOFF*.md`, `CLAUDE_VISUAL_AUDIT_HANDOVER.md`, `COMPLIANCE_HANDOFF.md`, `OPS_RUNBOOK.md`, `ROADMAP.md`, `STRATEGY.md`, `NCMEC_MANUAL_FALLBACK.md`.

### Env vars (`.env.local` — NEVER commit)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_EMBED_MODEL`, `OPENROUTER_CHAT_MODEL`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `AWS_*`, `ADMIN_EMAILS`, `CRON_SECRET`, `OLLAMA_URL`, `QDRANT_URL`.
