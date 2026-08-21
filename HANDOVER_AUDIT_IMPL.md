# Muse — Handover: Full Audit Implementation + SEO + VAPID

**Date:** 2026-08-20
**Commits this session:** `3ea6cec`, `cb86480`, `ec6cfcf` (all pushed, git clean)
**Build:** `tsc --noEmit` passes (0 errors)
**Vercel:** auto-deploys from `main`

---

## 1. Email — now wired on ALL user-facing events

`src/lib/email.ts` gained `signupWelcome()` + `trySend()`. Every event now fire-and-forget emails (fail-open, never blocks the user flow):

| Event | File |
|---|---|
| Waitlist signup | `api/muse/waitlist/route.ts` (pre-existing) |
| Account signup welcome | `api/muse/auth/route.ts` |
| New match | `api/muse/route.ts` (`actionType === "match"`) |
| New message | `api/muse/route.ts` (`message`) |
| Report received (ack) | `api/muse/route.ts` (`report`) |
| Booking request / update | `api/muse/route.ts` (`book-session`, `respond-booking`) |
| Disclosure confirmed | `api/muse/route.ts` (`confirm-disclosure`) |
| Connection request | `api/muse/route.ts` (`connect`) |
| Account suspension | `api/muse/route.ts` (`applyStrikeAndEscalate`) |
| Identity verified | `api/muse/verification/route.ts` |
| Referral signup + reward | `api/muse/referral/route.ts` |

Helper `emailProfile()` in `route.ts` fetches a profile's email and sends a branded `notify()` email. Sender: `Muse <info@wyzdesign.com>` via Resend.

---

## 2. Referral "free month" loop — FIXED

`api/webhooks/stripe/route.ts` now calls `grantReferralReward()` on `checkout.session.completed`. When a referred user subscribes, both parties get their free month (idempotent — skips `reward_issued`). Previously the reward was never triggered — a real broken promise.

---

## 3. Notifications mark-read — FIXED

- `route.ts` gained a `mark-read` POST action (updates `muse_notifications.read` by id).
- `page.tsx` `onOpenActivity` now calls it with unread ids.
- Notification merge now uses the DB `n.id` (not local `uid()`) so mark-read targets real rows.

---

## 4. Community + Sessions — now live

`bootstrapData()` in `page.tsx` now fetches `communities` + `sessions` and sets `liveCommunities`/`liveSessions` (previously only briefs/feed/forum/events were fetched, so those screens always showed stubs).

---

## 5. QR code — local

`npm i qrcode`; `api/qr/route.ts` generates QR server-side (removed `api.qrserver.com` external dependency + SVG-injection fallback).

---

## 6. Web Push — full stack

- `npm i web-push`; new `src/lib/push.ts` (`pushToProfile()` — fail-open, drops expired subscriptions).
- Wired into `emailProfile()` so match/message/booking/disclosure/etc. also fire browser push.
- **VAPID keys generated + set in Vercel** (all 3 keys match across production/preview/development):
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - Also stored in vault.
- Requires a redeploy to take effect (env vars are read at build/runtime).

---

## 7. Demo scaffolding gated

`DEMO_MODE` flag (`NEXT_PUBLIC_DEMO_MODE=true` to enable) gates: simulated chat replies, random 30% match inflation. `toggleSocial` still shows a toast (onboarding placeholder).

---

## 8. SEO — full pass

- **Sitemap** 6 → 16 routes (all legal/info pages at correct priorities).
- **robots.txt** — profile/post pages now indexable (were incorrectly disallowed).
- **JSON-LD**: Organization, WebSite (SearchAction), WebApplication (root layout); FAQPage schema (FAQ page).
- **Metadata** on all 14 legal/info pages + landing layout (title/description/canonical/OG/Twitter).
- **Dynamic `generateMetadata`** on `/muse/profile/[id]` + `/muse/post/[id]` — per-creative/per-post OG tags (biggest SEO win).

---

## 9. Monetization bug fix

`dailyLikes`/`superLikes` default was `999` and `showUnlimitedBadge` defaulted `true` — free users effectively had unlimited likes until the daily-reset effect fired. Now default `10`/`3`/`false` (correct free-tier).

---

## Remaining / not done

- **18 landscape top-cards** + **CITLALI** decision — still waiting on Claude's visual verification (Claude is on hold until its usage resets). These need per-file swaps once confirmed.
- **Deeper user-journey audit** — the app already has empty states on every screen, a badge/achievement system, daily-like reset, match streak, referral tiers, and event tracking. No further obvious gaps found in this pass, but a line-by-line journey audit (onboarding dead-ends, cold-start UX) is still worth doing when Claude is back.
- **VAPID redeploy** — push needs one redeploy (or wait for next push) to pick up the new env vars.

---

## Owner-owned items (unchanged)

- Attorney review of Terms/Privacy
- NCMEC ESP registration (post-launch; manual web form works until then)
- Facebook App → Live (done), Google/X OAuth (live)
- Resend domain verified (email live)

---

## VAPID keys (for reference — also in vault)

```
VAPID_PUBLIC_KEY:  BAHY6m3uprfOXViAV5-3DXYB4zEa6AQrGzIhGVfw2rianeBARQ3BbwziS0EkC9g_1FEzyhPbCXMI1eIbpPWeU_o
VAPID_PRIVATE_KEY: (in vault)
```
