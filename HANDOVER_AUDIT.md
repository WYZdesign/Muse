# Muse App — Full Audit: What Else We Can Do

**Date:** 2026-08-20
**Scope:** Everything actionable outside CSAM/NCMEC reporting and attorney/legal review (both explicitly out of scope).

---

## Priority 1 — Email: only 1 of ~12 events wired (highest-value, matches your "email everywhere" directive)

`src/lib/email.ts` has 3 templates (`waitlistWelcome`, `betaAccess`, `notify`) but **only `waitlistWelcome` is ever called** (`waitlist/route.ts:58`). Every other event is silent. You said "send emails any chance it gets" — this is the gap.

| Event | Wired? |
|---|---|
| Waitlist signup | ✅ yes |
| Account signup welcome | ❌ |
| Beta access granted (`betaAccess()` orphaned) | ❌ |
| New match | ❌ |
| New message | ❌ |
| Booking request / confirm / cancel / complete | ❌ |
| Verification complete | ❌ |
| Report received (ack to reporter) | ❌ |
| Referral redeemed (free month) | ❌ |
| Disclosure sent / confirmed | ❌ |
| Account suspended | ❌ |

**Fix:** add `sendEmail(...)` calls at each event site, using the existing `notify()` helper. ~1 hour of work, huge user-trust win. The `betaAccess()` template already exists for the "your spot is ready" email when you open beta.

---

## Priority 2 — Push notifications: backend half-built, nothing actually sends

- `api/muse/push/route.ts` stores/unstores subscriptions (`subscribe`/`unsubscribe`).
- Frontend `muse-pwa.ts` has full registration plumbing, `page.tsx:490` auto-registers on session.
- **But:** no server-side VAPID sender exists anywhere. When a match/message/booking happens, nothing dispatches a push.
- Native (Capacitor) push is a deliberate no-op (`usePushNotifications.ts:83-89`); web fallback `useWebPush()` returns empty stubs (`:95-97`).

**Fix:** add a Web Push sender (e.g. `web-push` npm package + VAPID keys) that fires on match/message/booking. Skip native push until the App Store builds actually happen (your call — web/PWA is what's live now).

---

## Priority 3 — QR code: replace external placeholder with local package

`api/qr/route.ts:7-10` calls `api.qrserver.com` (external dependency, third-party uptime + privacy). Comment says "in production use qrcode npm package."

**Fix:** `npm i qrcode`, generate QR server-side locally. Removes external call + the SVG text-fallback hack. ~30 min.

---

## Priority 4 — Referral "free month" loop is broken end-to-end

- `apply` (onboarding) ✅ wired — `page.tsx:1930`.
- `status`, `generate` ✅.
- **`redeem-reward` is never triggered.** The intended trigger (Stripe webhook) does NOT call it — `webhooks/stripe/route.ts` only updates `muse_profiles.tier` on subscription, never touches referral rewards. So when a referred user subscribes, **nobody actually gets their free month**.

**Fix:** in `webhooks/stripe/route.ts` `checkout.session.completed`, look up whether the subscribing user has `referred_by` set and call the referral redeem-reward logic (grant both sides a free month). Or trigger it in `connect/route.ts` `create-booking-checkout`. Pick one source of truth.

---

## Priority 5 — Community / Sessions screens render stubs only

`bootstrapData()` (`page.tsx:344-388`) fetches `match/briefs/feed/forum/events` but **never fetches `communities` or `sessions`**, even though the API exposes them (`route.ts:271-279`). So Community and Sessions always show the hardcoded `COMMUNITIES` / `SESSIONS` arrays from `types.ts`.

**Fix:** fetch those two in `bootstrapData()` and merge like the others. ~30 min.

---

## Priority 6 — In-app notifications: mark-read is client-only

`muse_notifications` rows are written on every event, and `type=notifications` GET returns them. But "mark as read" only flips a `read:true` flag in local React state (`page.tsx:1564` `onOpenActivity`) — it **never writes back to the DB**. So every reload shows all notifications unread again.

**Fix:** add a `mark-read` action to `route.ts` (update `muse_notifications.read`) and call it from the activity feed. ~20 min.

---

## Priority 7 — Dead / fake features (decide: finish or hide)

- **Simulated chat replies** — `page.tsx:1162-1170` fakes canned replies after 1.2–2s (comment: "simulated reply only when no real remote partner is present"). Fine for demo, but should be removed or clearly flagged once real messaging is live.
- **Fake matches** — `page.tsx:972`: `isMatch = matchScore > 55 || Math.random() < 0.3`. Random 30% match inflation.
- **Fake social connect** — `page.tsx:1132` `toggleSocial` just toasts "Connected!" (no OAuth link).
- **Simulated chat partner** — matches/chat against a bot when no live partner.

These are demo scaffolding. Before open beta, either remove the randomness/simulation or gate it behind a `DEMO_MODE` flag.

---

## Priority 8 — Polish / smaller items

- `console.log` sweep — the TODO/FIXME/placeholder grep was clean, but a `console.log` pass wasn't completed.
- Stub `TIERS` array (`types.ts:149`) vs. live Stripe tiers — subscription screen partly hardcoded.
- `PROFESSIONALS`, `CONNECTIONS`, `FORUM_POSTS`, `EVENTS` stubs still feed parts of Network/Community/Forum.
- Admin "AI brain" (`route.ts:1473-1575`) is keyword/rule-based, not a real LLM — fine for now, just know its limits.

---

## Recommended build order

1. Email on all events (Priority 1) — matches your directive, biggest trust win.
2. Referral free-month loop fix (Priority 4) — a real broken promise to users.
3. Notifications mark-read (Priority 6) — cheap, obvious bug.
4. Community/Sessions live data (Priority 5) — cheap.
5. QR local package (Priority 3) — cheap, removes external dep.
6. Push sender (Priority 2) — bigger lift, do when ready.
7. Demo-scaffolding cleanup (Priority 7) — do before open beta.

---

*Nothing here requires the attorney or NCMEC. All items are code changes wyzmind (opencode) can implement directly.*
