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

### 2a. The match score is client-side on demo data
- **[CODE]** `calcMatch()` lives in `components/types.ts` and runs on `PROFILES` demo data. It is NOT a
  live server-side re-ranker for real profiles. There's no real "similar to this profile" /
  "recommended for you" endpoint that queries the live DB. Fix: port the scoring to the server against
  real `muse_profiles` rows, or add a dedicated recommendations query.

### 2b. Discovery quality vs volume
- **[PRODUCT]** Discover currently surfaces by match-score on a small pool. On a real marketplace the
  winning UX is **filter-plus-search** (already built: faceted search, map, count) on top of the match
  score. The score can feel gimmicky; the filters are where professionals actually find work.

### 2c. "Vibe" matching can hurt a professional marketplace's credibility
- **[PRODUCT]** The match score weighs **zodiac / Chinese zodiac / MBTI / life path**. This is a bold
  differentiator, but for a "safe professional booking" brand it can read as dating-app energy and
  undercut trust with the industry/buyer side. **Recommendation:** keep it as a secondary "vibe"
  layer, but rank primarily on **professional fit** (styles, role, availability, verified, reviews).
  See `MUSE_CLAUDE_CRITIQUE.md`.

### 2d. No public trust surface for the *buyer* side
- **[CODE/PRODUCT]** When a brand/agency wants to hire, they need to see a creative's **completion pace,
  review history, response rate, verified identity** at a glance. Endpoints exist (reviews, criteria,
  verified, hostCompletedSessions) but there's no single "hire this creative" trust card.

---

## 3. Making money — the gaps that actually matter

### 3a. Muse Studio tier ($29.99/mo) isn't purchasable
- **[CODE]** `TIERS_BY_SIDE.industry` lists Muse Studio at $29.99/mo, but the Stripe price map in
  `api/checkout/route.ts` only registers `muse_pro`, `muse_pro_annual`, `muse`, `sovereign`. **There is
  no Stripe price for Muse Studio** — so the high-value industry tier can't actually be bought.
  Fix: add a `muse_studio` price + webhook handling. *(Highest-ROI money fix available.)*

### 3b. No pay-per-boost for free users
- **[CODE]** `boostActivate` requires **Pro** (403 for free tiers). So the single most obvious
  monetization lever for free users — "boost my profile for $5" — is **unbuilt** (flagged in HANDOVER
  as "À la carte boosts, Stripe one-off"). Fix: add a Stripe one-off boost purchase + boost
  **duration** (24h/72h/7d).

### 3c. Boost has no duration/persistence model
- **[CODE]** Boost is a single weekly "×1" for Pro (tied to `muse_activity_log`). `boostAnalytics` exists
  (I shipped it), but there's no boost *expiry* or real visibility-multiplier on the live discover
  order. Add for the paid-boost path (3b).

### 3d. Booking monetization depends on hosts onboarding Stripe Connect
- **[CODE]** `create-booking-checkout` requires the host's Stripe Connect account to be **fully
  onboarded** (`charges_enabled`). If a host hasn't onboarded, no booking can be paid. **This is the
  #1 friction in the booking→money path.** Fix: a clear, low-friction host-onboarding flow + a
  pre-onboarding nudge. (`create-account` → `create-booking-checkout` → `account-status` are all built.)

### 3e. No self-serve refund/dispute resolution surfaced
- **[CODE/PRODUCT]** Payment holds and cancels, but there's no explicit buyer-facing **refund** or
  **dispute** flow (no-show, damaged delivery, scope dispute). Stripe handles the mechanics; the
  product needs a visible resolution prompt. (STRATEGY.md lists "own escrow/insurance vs third-party"
  as an open question.)

### 3f. No CSAM/NSFW monetization clarity (deliberate)
- **[PRODUCT]** NSFW + payment is **hard-blocked** (`disclosures.ts`). Fine-art/figure/body work is a
  real niche (Figure Art Collective, Fine Art Agent, body-paint briefs) — but paid NSFW is off-limits
  (Stripe + App-Store + minors risk). This is strategic, not a bug. Just be clear internally that the
  profitable niche is **non-explicit** fine art.

---

## 4. Booking — the gaps / friction points

### 4a. Payment is manual-capture only at completion; no time-release
- **[CODE]** Funds hold until `bookingComplete` captures them. There is **no automatic time-release**
  (e.g., release after the booked slot ends). If neither party clicks complete, funds sit. Add an
  auto-capture cron (the `cron/capture-bookings` route exists — verify it's wired) so money doesn't
  hang.

### 4b. No scheduling/calendar availability
- **[CODE]** Sessions have a `date` field, but there's no real **availability calendar** for a host
  (Studio availability is only in `studios.ts` static data, and `booking-reminders` I shipped only
  surfaces upcoming). Fix: host availability slots + conflict detection before booking.

### 4c. Booking reminders are built but not surfaced
- **[CODE]** I shipped `booking-reminders` (upcoming in next 7 days) but the UI may not call it. Wire it
  to a "your shoot is coming up" card.

### 4d. No video/voice pre-meet
- **[PRODUCT]** HANDOVER flags video/voice chat (Daily.co) as the remaining booking-enabler — a pre-shoot
  or remote-collab call. Blocked on a Daily.co API key. This also unlocks remote/online shoots.

---

## 5. The cross-cutting adjustment (the real recommendation)

The product is **feature-complete but not market-complete.** Almost every gap above reduces to one
thing:

> **Muse needs real supply + a functioning transaction loop before it's a marketplace.** The heaviest
> engineering debt (`page.tsx` monolith, deferred a11y, no staging/Sentry/analytics) is real but
> secondary. A boardroom cares about: **can a creative get discovered, book, get paid, and get a
> review — reliably, on a live DB, today?**

Recommended focus order (matches STRATEGY.md's GTM):
1. **Fix Muse Studio pricing** (3a) — money, immediately shippable.
2. **Seed real supply** (1) — launch in one city (LA or Chicago) with real Mixers/FB creatives.
3. **Ship the paid boost** (3b + 3c) — the free→paid visibility lever.
4. **Make discovery read live data + professional-fit ranking** (2a/2c) — real "get discovered."
5. **Reduce host-onboarding friction** (3d) + **auto-capture** (4a) — so the money loop closes itself.
