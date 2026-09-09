# MUSE — STATUS SNAPSHOT (2026-09-08)

> Single source of truth for where Muse stands today. Boardroom-ready. Updated after each major session.

---

> **What is Muse?** A professional creative-networking platform — photographers, models, filmmakers, musicians, designers, artists — for collaboration, booking, and portfolio work. Explicitly not a dating app. Live at muse.wyzdesign.com.

---

## TL;DR

**Feature-complete. Not market-complete.** Muse is a professional creative-networking platform with a full booking/escrow/review loop, 15% marketplace take (7% host + 8% buyer via Stripe Connect), $9.99/mo Pro and $29.99/mo Studio subscriptions, 3-tier pay-per-boost, MFA/2FA, live server-side discovery, and 8 themes. 180+ API actions, 15 DB migrations, 285 tests passing. The gap is real supply (no real users transacting yet), non-functional email/push notifications, and demo scaffolding that must be gated before open beta. The moat is trust data that only a running marketplace accumulates.

---

## What's built and live (production, verified)

### Core product
- **Discover** — swipeable cards, match %, map view (Mapbox), search, grid/list toggle, server-side ranked discovery (`discover-ranked`) scoring real DB profiles
- **Muses** — matches + chat (icebreakers), message-request inbox (accept/decline/block)
- **Collab Briefs** — post paid/volunteer/concept/TFP projects, apply, dismiss
- **Sessions & Bookings** — priced listings, book/respond/cancel/complete, escrow (Stripe Connect), reminders, auto-capture cron (4-day safety window)
- **Portfolio** — albums, access levels (public/invite/private), shared Lightbox
- **Moments / BTS** — 24-hour stories with auto-advance
- **Communities & Events** — groups with rules/roles/bans/mutes/join-requests, events with RSVP
- **Forum** — nested threaded discussions, votes, pin/lock, reports
- **Network** — professionals + a marketplace of creatives
- **Profile** — portfolios, prompts, personality "vibe" traits, verification, completion %, badges
- **Analytics** — profile views, boost analytics, viewers, earnings, reviews
- **Quests** — gamified onboarding/action incentives (XP, superpowers, Pro days, boost inventory)
- **Referrals** — earn Pro by referring friends; QR-tracked invite sources

### Revenue system
- **Subscriptions** — Muse Pro ($9.99/mo or $79.99/yr), Muse Studio ($29.99/mo) — both live Stripe prices
- **Marketplace take** — 15% blended (7% host commission + 8% buyer service fee), escrowed via Stripe Connect
- **Boosts** — 3-tier pricing configured in Stripe ($3.99/24h, $9.99/72h, $19.99/7d) + Pro weekly free boost + quest-granted inventory. **Note: server-side paywall enforcement not yet wired — pricing is live but paywall is cosmetic only.**
- **Refund/dispute queue** — admin-resolve-refund with audit log

### Trust & safety
- **Verification** — phone + face (Stripe Identity), 18+ age gate on all paid paths (sessionBook, create-payment, create-booking-checkout), re-verify funnel (~150 days)
- **Disclosure + consent** — signed before booking, hard-block on NSFW + payment
- **Safety check-ins** — pre-shoot 24h, proceed/cancel, auto-cancel booking + release PaymentIntent on cancel
- **Trusted contact + location share** — SMS/email to emergency contact
- **Two-way reviews** — 1–5 rating + text + 5 structured criteria (communication, reliability, creative quality, professionalism, safety)
- **Moderation** — AWS Rekognition scans on every upload, AI triage, reports with outcomes, strikes + auto-suspension (threshold: 3)
- **Blocking** — full block/unblock/mute system, bidirectional enforcement in Discover + matches + messaging
- **MFA/2FA** — Supabase Auth TOTP (enroll/verify/challenge/unenroll), Settings UI live

### Infrastructure
- **15 DB migrations** applied (001–015, all verified on live Supabase)
- **180+ API actions** across all route files
- **8 themes** — 4 dark (lasunset/deepspace/nebula/deepsea) + 4 light (sunrise/daylight/sky/rose)
- **37 test files, 285 tests passing**
- **Vercel auto-deploy** — pushed to main = production in ~90s

### Partner studios (aspirational)
- **Apex Photo Studios** (Downtown LA) — listed with market-rate pricing ($39.99–$49.99/hr), rules, oracle. Not officially partnered. Booking links go to studio's own site.
- **Hubble Studio** (Arts District) — same treatment ($44.99–$49.99/hr). Not officially partnered.

---

## Compliance & Legal (investor-critical)

| Item | Status |
|------|--------|
| Terms of Service | Live at `/terms` (20 sections). Needs counsel review. |
| Privacy Policy | Live at `/privacy`. Needs CCPA/GDPR review. |
| DMCA | Live at `/dmca`. Designated-agent filing registered (DMCA-1078382). |
| NCMEC/CSAM pipeline | Code complete. ESP application submitted (2026-08-13), awaiting approval. Until approved, CSAM is detected and accounts suspended, but reports are staged not transmitted. **18 U.S.C. 2258A requires reporting — this is the single highest-risk open item.** |
| Geo-blocking | TX (HB 1181), LA (Act 440), AR, UT — ID verification required for adult content. Implemented via IP geolocation. |
| Age verification | Stripe Identity (document + selfie) required before paid bookings. Re-verification every ~150 days. |
| Image moderation | AWS Rekognition `DetectModerationLabels` on every upload. Fails-closed for CSAM. |
| Counsel review | **Not started.** Liability cap, arbitration clause, age-verification language, CCPA/GDPR exposure all need counsel sign-off before open beta. |

---

## Mobile app readiness

- **Capacitor wrappers** exist for iOS and Android (`capacitor.config.ts`, `android/`, `ios/` directories)
- **RevenueCat** integration stub configured but API keys are empty
- **App store submission** is explicitly a "separate later effort" per HANDOVER_APP.md — open beta runs as web/PWA first
- Native push notifications are a deliberate no-op; web push (VAPID) is the current target

---

## What's blocked (needs external input)

| Item | Blocker | What's needed |
|------|---------|---------------|
| Push notifications | No VAPID sender | Backend stores subscriptions but no server-side dispatch. Users get zero push. |
| Email notifications | Only waitlist sends | 11 of 12 email events (signup, match, booking, etc.) are silent. |
| Referral free-month reward | Stripe webhook gap | `redeem-reward` never triggered by webhook. Referred users never get free month. |
| Legal counsel sign-off | Not started | ToS, Privacy, DMCA, age-verification language need review before open beta. |
| Video/voice chat | No Daily.co API key | Provider key + WebRTC integration |
| NSFW monetization | Product decision | Strategic clarity on fine-art vs explicit |
| Real supply seeding | Ops action | Seed 20 creatives from FD Mixers/FB groups |
| NCMEC/CSAM pipeline | NCMEC ESP approval | Legal/compliance gate — highest-risk open item |
| Waitlist confirmation emails | Resend API key + DNS | `RESEND_API_KEY` in Vercel + `wyzdesign.com` domain verification |

---

## What's partially built (backend done, frontend missing)

| Item | Backend status | Frontend needed |
|------|---------------|-----------------|
| Community/Sessions live data | API endpoints exist | `bootstrapData()` never fetches them; screens show hardcoded demo arrays |
| Mark-all-read persistence | DB writes on every event | "Mark as read" only flips React state, never writes back to `muse_notifications` |
| Nested forum threading | Migration 006 ready (`parent_reply_id`) | Real threading UI needed (currently flat) |
| Booking reminders | ✅ Endpoint + SessionsScreen card | **Done** — move to "What's built" |

---

## Tech debt (known, blocking or near-blocking)

- **`page.tsx` monolith** — ~3,252 lines, ~100+ `useState`, 237 `setShow`. Extraction plan exists (4 phases) but deferred. This is the root of most future pain — every new feature makes it worse. Blocks maintainability and parallel development. Should happen before adding new features.
- **Demo scaffolding still live** — fake matches (30% random inflation), simulated chat replies, fake social connect, hardcoded profiles/briefs/sessions in `types.ts`. Real discovery works via `discover-ranked`, but Community and Sessions screens still show entirely hardcoded demo arrays. Must be gated or removed before open beta.
- **Email system 1/12 wired** — only waitlist signup sends email. 11 events (signup welcome, new match, booking confirm, etc.) are silent.
- **Push notifications non-functional** — backend stores VAPID subscriptions but no server-side sender dispatches. Native (Capacitor) push is a deliberate no-op.
- **Notification mark-read is client-only** — resets on every page reload. Never writes back to `muse_notifications`.
- **25 SyntaxWarnings** — invalid escape sequences in Windows paths (benign).

---

## Key numbers

| Metric | Value |
|--------|-------|
| API actions | 180+ (across all route files) |
| DB migrations | 15 (001–015, all applied to live Supabase) |
| Test files | 37 |
| Tests | 285 (all passing) |
| Themes | 8 (4 dark + 4 light) |
| `page.tsx` lines | ~3,252 |
| `page.tsx` useState | ~100+ |
| Route files | 12 (api/muse/, api/cron/, api/webhooks/) |
| Stripe prices live | 3 (Pro monthly, Pro annual, Studio monthly) |
| Boost tiers | 3 ($3.99/$9.99/$19.99) — pricing configured, paywall not enforced |

---

## Next priority (recommended order)

### Must-do before open beta
1. **Seed real supply** — 20 creatives from FD Mixers/FB groups (ops, not code)
2. **Legal counsel sign-off** — ToS, Privacy, DMCA, age-verification language review
3. **Gate or remove demo scaffolding** — fake matches, simulated chat, fake social connect, hardcoded Community/Sessions data
4. **Wire email notifications** — 11 silent events need `sendEmail()` calls (~1 hour, biggest trust win)
5. **Fix referral free-month reward** — Stripe webhook never triggers `redeem-reward`

### High-value, low-effort
6. **Push notification sender** — VAPID dispatch for match/message/booking events
7. **Community/Sessions live data** — `bootstrapData()` needs to fetch from API instead of hardcoded arrays
8. **Mark-all-read persistence** — write back to `muse_notifications` on mark-read
9. **Split `page.tsx`** — architectural debt, blocks parallel development. Should happen before new features.

### When unblocked
10. **Daily.co video/voice chat** — when API key is obtained
11. **Counsel review** — liability cap, arbitration, CCPA/GDPR exposure
