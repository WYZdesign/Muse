# MUSE — GAPS & ADJUSTMENTS

> What's missing or needs adjusting in the three areas that matter most to a boardroom: **booking**,
> **making money**, and **getting discovered.** Each item is grounded in the actual code (verified) and
> tagged **[CODE]** (change is in code) vs **[PRODUCT]** (a product/business decision) vs **[OPS]**
> (operational). This is a live working list — the technical backlog lives in `HANDOVER.md`.

---

## 1. THE BIG ONE — supply is seeded as demo data

**The single most important gap.** The product's discovery layer (PROFILES, BRIEFS, SESSIONS,
COMMUNITIES, EVENTS, FORUM_POSTS) is a rich **hardcoded demo corpus** in `components/types.ts`. Real
users sign up into a live Supabase backend, but the experience and the marketing demos run on fake data.

- **[PRODUCT]** Until real supply exists, "getting discovered" and "making money" are demonstration, not
  a functioning marketplace. **The two-sided-market chicken-egg is unsolved.**
- **[OPS]** Fix: seed with **real creatives from the FD Mixers + FB groups** before public open
  (STRATEGY.md's "seed 20 creatives"). Make discovery read live DB rows, and keep the demo corpus only
  for the public marketing screen until supply is real.

---

## 2. Getting discovered — the gaps that actually matter

### 2a. The match score is client-side on demo data — SHIPPED ✅
- **[CODE — SHIPPED]** `calcMatch` was client-side on demo `PROFILES`. Now there's a server-side mirror
  (`calcMatchScore` + `CREATIVE_SIDE` in `get.ts`) and a live-ranked endpoint `discover-ranked` that:
  fetches real `muse_profiles`, scores each against the requesting user (professional fit + vibe),
  and surfaces **boosted + complementary-side** profiles first. "Getting discovered" now runs on live
  rows. A dedicated "similar to this profile" can layer on top of the same scorer.

### 2b. "Vibe" matching can hurt a professional marketplace's credibility — ADDRESSED
- **[PRODUCT — partially addressed]** The vibe layer (zodiac/MBTI/life-path) is still in the score, but
  discovery now ranks primarily on **professional fit** + boosted/side-matching (not vibe). The scorer
  weights style/reliability/verified alongside vibe, so the industry/buyer side gets a professional
  ranking. Recommendation stands: keep vibe secondary, never lead with it in copy.

### 2c. No public trust surface for the *buyer* side — SHIPPED ✅
- **[CODE — SHIPPED]** `creative-trust` GET aggregates all buyer-facing trust signals for one creative:
  verified, age-verified, review rating + count + structured criteria (communication/reliability/
  creative quality/professionalism/safety), completed bookings as host, profile completion %, and
  boosted state. Sessions already surface `hostVerified` + `hostCompletedSessions`; professionals
  surface `reviewRating`/`reviewCount`/`reviewCriteria`.

---

## 3. Making money — the gaps that actually matter

### 3a. Muse Studio tier ($29.99/mo) — SHIPPED ✅
- **[CODE — SHIPPED]** `api/checkout/route.ts` maps `muse_studio` → `price_muse_studio_monthly` +
  `DEV_FALLBACK_PRICING`. Webhook `KNOWN_TIERS` includes `muse_studio`. Live Stripe price
  `price_muse_studio_monthly` exists and is active.

### 3b. Pay-per-boost for free users — SHIPPED ✅
- **[CODE — SHIPPED]** `create-boost-checkout` action in `api/muse/connect/route.ts` creates a Stripe
  one-off Checkout Session. **3-tier duration pricing:**
  - 24h boost: $3.99
  - 72h boost: $9.99
  - 7d boost: $19.99
  `boost-purchase-complete` (in misc.ts) grants the boost inventory idempotently (guarded by a
  `muse_boost_purchases` row, retry-safe). Requires the `muse_boost_purchases` table (migration 013).
  Webhook marks purchases as `paid` before granting inventory (security hardened).

### 3c. Boost inventory + duration/expiry — SHIPPED ✅
- **[CODE — SHIPPED]** Boost is now a **unified inventory model** (migration 013):
  `boost_inventory` (earned via quests or bought) + `boost_expires_at` (active boost expiry).
  `boostActivate` accepts `duration` (24h/72h/7d), spends inventory first then the Pro weekly
  allowance, and extends an active boost instead of stacking. Quest `boost` rewards now grant
  inventory. `boost-status` returns the current state; `boost-analytics` reads the active window.
  Server-side ranked discovery (`discover-ranked`) surfaces boosted profiles first.

### 3d. Booking monetization depends on hosts onboarding Stripe Connect
- **[CODE]** `create-booking-checkout` requires the host's Stripe Connect account to be **fully
  onboarded** (`charges_enabled`). If a host hasn't onboarded, no booking can be paid. **This is the
  #1 friction in the booking→money path.** Fix: a clear, low-friction host-onboarding flow + a
  pre-onboarding nudge. (`create-account` → `create-booking-checkout` → `account-status` are all built.)

### 3e. Self-serve refund/dispute resolution — SHIPPED ✅
- **[CODE — SHIPPED]** `admin-refunds` (list open refund requests) + `admin-resolve-refund` (resolve
  with note + audit log) are live. Users can request refunds through the sessions flow; admins resolve
  them with structured resolution notes. Full audit trail via `admin-audit-log`.

### 3f. No CSAM/NSFW monetization clarity (deliberate)
- **[PRODUCT]** NSFW + payment is **hard-blocked** (`disclosures.ts`). Fine-art/figure/body work is a
  real niche (Figure Art Collective, Fine Art Agent, body-paint briefs) — but paid NSFW is off-limits
  (Stripe + App-Store + minors risk). This is strategic, not a bug. Just be clear internally that the
  profitable niche is **non-explicit** fine art.

---

## 4. Booking — the gaps / friction points

### 4a. Payment is manual-capture only at completion; no time-release — SHIPPED ✅
- **[CODE — DONE]** `api/cron/capture-bookings` already auto-captures any `pending`/`held` payment
  older than `CAPTURE_SAFETY_DAYS` (4 days, conservative vs the shortest ~4d18h card window),
  re-verifying the PaymentIntent is still `requires_capture` before capturing. Runs every 6h
  (vercel.json). This is the general-availability auto-capture that prevents money hanging.

### 4b. Scheduling/availability calendar — SHIPPED ✅
- **[CODE — SHIPPED]** `host-availability` returns a host's pending/confirmed bookings (the occupied
  slots to render a calendar + prevent double-booking); `toggle-session-availability` lets a host mark
  a session open/closed (owner-gated). A full per-time-slot calendar UI is the remaining frontend step.

### 4c. Booking reminders — SHIPPED ✅
- **[CODE — SHIPPED]** `booking-reminders` returns upcoming (next 7 days) bookings with session
  + other-party info. **Frontend rendered** in `SessionsScreen.tsx` as "Upcoming shoots" card with
  session details, date, other party, and action buttons.

### 4d. No video/voice pre-meet
- **[PRODUCT]** HANDOVER flags video/voice chat (Daily.co) as the remaining booking-enabler — a pre-shoot
  or remote-collab call. Blocked on a Daily.co API key. This also unlocks remote/online shoots.

---

## 5. Security & authentication — SHIPPED ✅

### 5a. Two-factor authentication (2FA/TOTP) — SHIPPED ✅
- **[CODE — SHIPPED]** `/api/muse/mfa` route wrapping Supabase Auth MFA (TOTP). GET: `mfa-status`,
  `mfa-factors`. POST: `enroll` (returns secret + QR URI), `verify-code` (challenge+verify),
  `challenge`, `unenroll`. Supabase Auth already has TOTP MFA enabled on the project. Client helpers:
  `mfaStatus`, `mfaEnroll`, `mfaVerify`, `mfaUnenroll` in `lib/api.ts`. **Settings UI SHIPPED ✅** —
  `SettingsScreen.tsx` has the full Two-Factor Authentication sub-page (status, enroll with QR +
  secret, verify, unenroll).

---

## 6. Partner studios — LISTINGS LIVE, PARTNERSHIP PENDING

### 6a. Apex Photo Studios & Hubble Studio — ASPIRATIONAL LISTINGS
- **[CODE — SHIPPED]** Both studios are listed in the Studios browser with professional descriptions,
  pricing (market-rate placeholder), rules, and oracle FAQs. **Not officially partnered.** Listings are
  aspirational — real studios in LA that Muse would like to partner with. Pricing reflects comparable
  market rates for self-service hourly studios in LA. Booking links go to the studios' own sites.
  - **Apex Photo Studios** (Downtown LA): Multi-Set $44.99/hr, Cyc Wall $39.99/hr
  - **Hubble Studio** (Arts District): Modular Space $49.99/hr, Boutique Stage $44.99/hr

---

## 7. The cross-cutting adjustment (the real recommendation)

The product is **feature-complete but not market-complete.** Almost every gap above reduces to one
thing:

> **Muse needs real supply + a functioning transaction loop before it's a marketplace.** The heaviest
> engineering debt (`page.tsx` monolith, deferred a11y, no staging/Sentry/analytics) is real but
> secondary. A boardroom cares about: **can a creative get discovered, book, get paid, and get a
> review — reliably, on a live DB, today?**

### Recommended focus order (updated):
1. **Seed real supply** — launch in one city (LA or Chicago) with real Mixers/FB creatives.
2. **Reduce host-onboarding friction** (3d) — so the money loop closes itself.
3. **Ship video/voice pre-meet** (4d) — needs Daily.co API key.
4. ✅ **Notification preferences persistence — SHIPPED** — persisted server-side (`save-preferences`) and enforced (gates both email + push via `pushToProfile`/`emailProfile`).
5. ✅ **Settings 2FA toggle UI — SHIPPED** — full TOTP setup UI live in `SettingsScreen.tsx`.
6. **Split `page.tsx` monolith** — architectural debt, blocks maintainability.
