# Muse — Handover: The Duality + Full Session Epiphanies

**Date:** 2026-08-20
**Final commit:** `639a8a1` (deployed READY on Vercel)
**Build:** `npm run build` passes clean (all ~30 routes)

---

## THE BIG EPIPHANY — Muse is a DUALITY

The app was accidentally built around **behind-the-camera** creatives (photographers, directors, editors). Torreé realized during onboarding that the **in-front-of-camera** talent (models, actors, content creators, influencers) felt like an afterthought — the "Looking For" list was almost all crew.

**The fix (shipped):**
- Two first-class sides in `types.ts`:
  - `BEHIND_CAMERA` = Photographer, Director, Videographer, Editor, Writer, Producer, Designer, MUA, Stylist
  - `IN_FRONT_CAMERA` = Model, Actor, Content Creator, Influencer, Dancer, Musician
- Added missing roles: **Influencer, Dancer, Musician** (Musician was in LOOKING_FOR but missing from CREATIVE_TYPES — a real gap)
- Onboarding "Creative Type" now shows **two labeled groups** ("🎬 Behind the Camera" / "📸 In Front of the Camera")
- "Looking For" is now **dynamic** — crew sees talent first, talent sees crew first (`lookingForOptions()`)
- `calcMatch` boosts +6 for **cross-side** matches, +4 more when both are mutually looking across the aisle

**Why this matters for YOU (Claude):** any future feature should ask "does this serve BOTH sides equally?" Booking, sessions, briefs, forum categories — all should surface the duality, not default to crew-centric language.

---

## Other Epiphanies This Session (things that were "obvious once you think about it")

1. **Vercel deploys were silently failing** for a whole stretch — the FAQ page was a client component (`useState`) that had `export const metadata` added directly. `tsc` passed, but `next build` failed. **Lesson: always run `npm run build`, not just `tsc`, before declaring done.** Fixed by moving metadata to `faq/layout.tsx`.

2. **Free users had unlimited likes** — `dailyLikes`/`superLikes` defaulted to `999` and `showUnlimitedBadge` to `true`. A fresh free account got unlimited swipes until the daily-reset effect fired. Fixed to 10/3/false.

3. **The founding counter was counting junk** — 43 test/audit accounts (from Playwright/Claude testing) polluted `muse_profiles`, so the landing page showed "100 of 150 spots left" when the real count was 5. Purged 43 test accounts; counter now reads real profiles.

4. **Stub users are hardcoded, not in the DB** — the Discover deck (ARCANA, MITRI, ASHONDI, etc.) lives in `types.ts` `PROFILES[]`, NOT `muse_profiles`. "Remove stubs before beta" = edit `types.ts`, don't delete DB rows.

5. **Referral "free month" was a broken promise** — the Stripe webhook updated tier but never triggered `redeem-reward`. Fixed: `grantReferralReward()` in the webhook now grants both sides a free month (idempotent).

6. **"Repost" on Feed made no sense** — no personal profile feeds exist, so it's now a **Share** button (X/Facebook/LinkedIn/WhatsApp/Email/Copy + native share).

7. **Email was "wired" but silent** — only waitlist confirmation actually sent. Now 12 events fire email: signup, match, message, booking, disclosure, connection, suspension, verification, referral signup/reward, report ack.

8. **Push was half-built** — subscriptions were stored but nothing sent. Added `web-push` sender + VAPID keys (generated, in Vercel + vault).

9. **Community/Sessions showed stubs forever** — `bootstrapData()` never fetched `communities`/`sessions`. Now live.

10. **Users couldn't create anything** — only join/RSVP. Added `create-community`, `create-event` (forum already had `forum` action).

---

## What's Still Open (for Claude or Torreé)

1. **18 landscape top-cards + CITLALI** — awaiting Claude's visual audit (Claude was on hold). The 18 are: AUDREY, JEREMY, MARISSA, ADRIENNE, AECH DOT, BROCK, BROOK, CLAUDIA, CRISTINA, DARRYL, DOT, HANNAH, JANELLE, KAYLEN, LORIE, MAYA, RANISHA, REBECCA. CITLALI: `Bodypaint-25.webp` leading (safe), nudity shot `Bodypaint-120.webp` is 3rd.

2. **Onboarding tweaks** — Torreé will describe later.

3. **AECH_DOT** — unresolvable (100% landscape pool, no Drive folder). Needs new photoshoot or removal.

---

## Claude — Your Turn: Fill In What We Overlooked

Here's the "obvious once you think about it" list I want you to hunt for. What did we miss?

- **Empty states everywhere?** Are there screens with zero data that render blank (not a friendly empty state)?
- **Cold-start UX** — a brand-new user with 0 matches/connections: does every tab feel alive or dead?
- **Engagement loops** — what brings a user back on day 2? Streaks? Daily resets? Notifications that actually fire?
- **The duality in the data model** — `muse_profiles` has no `creative_side` column. Should behind/front be persisted, not just derived from `type`?
- **Booking flow from the talent side** — can a model actually BOOK a photographer, or only photographers host sessions? (SessionsScreen is host-centric.)
- **Dead buttons** — I removed the Filter button on Discover. Are there others? (I suspect the "Boost" button, the "Online Status" toggle is non-functional, and some onboarding social toggles are cosmetic.)
- **Onboarding abandonment** — 18 steps is long. Can users resume mid-flow, or do they restart?
- **SEO for individual creatives** — `/muse/profile/[id]` now has dynamic OG tags, but are the stub profiles even indexed? (They're hardcoded, so no — only real DB profiles get pages.)
- **Content moderation gaps** — uploads are scanned by Rekognition, but what about text (forum posts, chat, briefs)? Is there profanity/harassment filtering on text?
- **The "Muse Pro" value prop** — the pricing screen lists features, but are any actually gated in code (unlimited likes, boosts, incognito)? Or is Pro currently cosmetic?

These are the gaps I'd flag as "obvious once someone finally thinks about them." Go deeper — find what else.

---

## File Map (quick reference)

- `src/app/(muse)/muse/page.tsx` — the ~2460-line SPA monolith (all state, onboarding, modals)
- `src/app/(muse)/muse/components/types.ts` — stubs, CREATIVE_TYPES/duality, calcMatch, PROFESSIONALS
- `src/app/(muse)/muse/screens/*.tsx` — 17 screens
- `src/lib/email.ts`, `src/lib/push.ts`, `src/lib/contentScan.ts`, `src/lib/rate-limit.ts`
- `src/app/api/muse/route.ts` — 48+ actions
- `src/app/api/webhooks/stripe/route.ts` — referral reward
- `sql/MUSE_APPLY_ALL.sql` — canonical schema
