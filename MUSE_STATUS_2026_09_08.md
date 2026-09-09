# MUSE — STATUS SNAPSHOT (2026-09-08)

> Single source of truth for where Muse stands today. Boardroom-ready. Updated after each major session.

---

## TL;DR

**Feature-complete. Not market-complete.** The product works — 280+ API actions, 15 DB migrations, 8 themes, full booking/escrow/review loop, MFA/2FA, partner studio listings, 3-tier boost system, live server-side discovery. The gap is real supply (no real users transacting yet) and a few frontend polish items. The moat is trust data that only a running marketplace accumulates.

---

## What's built and live (production, verified)

### Core product
- **Discover** — swipeable cards, match %, map view (Mapbox), search, grid/list toggle, server-side ranked discovery (`discover-ranked`) scoring real DB profiles
- **Muses** — matches + chat (icebreakers), message-request inbox (accept/decline/block)
- **Collab Briefs** — post paid/volunteer/concept/TFP projects, apply, dismiss
- **Sessions & Bookings** — priced listings, book/respond/cancel/complete, escrow (Stripe Connect), reminders, auto-capture cron
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
- **Boosts** — 3-tier pay-per-boost ($3.99/24h, $9.99/72h, $19.99/7d) + Pro weekly free boost + quest-granted inventory
- **Refund/dispute queue** — admin-resolve-refund with audit log

### Trust & safety
- **Verification** — phone + face (Stripe Identity), 18+ age gate, re-verify funnel (~150 days)
- **Disclosure + consent** — signed before booking, hard-block on NSFW + payment
- **Safety check-ins** — pre-shoot 24h, proceed/cancel, auto-cancel booking on cancel
- **Trusted contact + location share** — SMS/email to emergency contact
- **Two-way reviews** — 1–5 rating + 5 structured criteria (communication, reliability, creative quality, professionalism, safety)
- **Moderation** — AWS Rekognition scans, AI triage, reports with outcomes, strikes + auto-suspension
- **Blocking** — full block/unblock/mute system
- **MFA/2FA** — Supabase Auth TOTP (enroll/verify/challenge/unenroll), backend + client helpers live

### Infrastructure
- **15 DB migrations applied** (001–015, all verified on live Supabase)
- **280+ API actions** registered in `api/muse/route.ts`
- **8 themes** — 4 dark (lasunset/deepspace/nebula/deepsea) + 4 light (sunrise/daylight/sky/rose)
- **37 test files, 285 tests passing**
- **Vercel auto-deploy** — pushed to main = production in ~90s

### Partner studios (aspirational)
- **Apex Photo Studios** (Downtown LA) — listed with market-rate pricing ($39.99–$49.99/hr), rules, oracle. Not officially partnered. Booking links go to studio's own site.
- **Hubble Studio** (Arts District) — same treatment ($44.99–$49.99/hr). Not officially partnered.

---

## What's blocked (needs external input)

| Item | Blocker | What's needed |
|------|---------|---------------|
| Video/voice chat | No Daily.co API key | Provider key + WebRTC integration |
| NSFW monetization | Product decision | Strategic clarity on fine-art vs explicit |
| Real supply seeding | Ops action | Seed 20 creatives from FD Mixers/FB groups |
| NCMEC/CSAM pipeline | NCMEC ESP approval | Legal/compliance gate |
| Waitlist confirmation emails | Resend API key + DNS | `RESEND_API_KEY` in Vercel + `wyzdesign.com` domain verification |
| Real partner studio deals | Business development | Formal agreements with Apex/Hubble/FD |

---

## What's partially built (backend done, frontend missing)

| Item | Backend status | Frontend needed |
|------|---------------|-----------------|
| 2FA/TOTP | ✅ `/api/muse/mfa` route live | Settings toggle UI |
| Notification preferences | ✅ `notification-prefs` GET endpoint | Persist toggles to server (currently cosmetic) |
| Per-album privacy | ✅ `access_level` + `muse_album_access` table | MyAlbumsManager.tsx access controls |
| Onboarding checklist | ✅ `profile-completion` endpoint | Settings/profile card showing completion % |
| Data export (GDPR) | ✅ `export` handler | Settings button |
| Booking reminders | ✅ `booking-reminders` endpoint | Rendered in SessionsScreen ✅ |

---

## Tech debt (known, not blocking)

- **`page.tsx` monolith** — ~3,251 lines, 166 useState, 237 setShow. Extraction plan exists (4 phases) but deferred until visual verification is possible.
- **25 SyntaxWarnings** — invalid escape sequences in Windows paths (benign).
- **Demo corpus** — hardcoded profiles/briefs/sessions in `types.ts` still serve as fallback for new users. Real discovery works on live DB via `discover-ranked`.

---

## Key numbers

| Metric | Value |
|--------|-------|
| API actions | 280+ |
| DB migrations | 15 (all applied) |
| Test files | 37 |
| Tests | 285 (all passing) |
| Themes | 8 (4 dark + 4 light) |
| `page.tsx` lines | ~3,251 |
| `_ENGINE/` Python files | 570 (WYZMIND infra) |
| Vectors (Qdrant) | 217,808 |
| Services up | 5/5 core |
| Stripe prices live | 3 (Pro monthly, Pro annual, Studio monthly) |
| Boost tiers | 3 ($3.99/$9.99/$19.99) |

---

## Next priority (recommended order)

1. **Seed real supply** — 20 creatives from FD Mixers/FB groups (ops, not code)
2. **Settings 2FA toggle UI** — backend done, needs frontend component
3. **Notification preferences persistence** — server write + read-back
4. **Data export (GDPR) button** — Settings UI for existing handler
5. **Onboarding checklist card** — completion % badge in profile/settings
6. **Per-album privacy UI** — access level controls in MyAlbumsManager
7. **Split `page.tsx`** — architectural debt, blocks maintainability
8. **Daily.co video/voice** — when API key is obtained
