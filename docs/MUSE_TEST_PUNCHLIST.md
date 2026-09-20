# Muse — Two-Account Interaction Punch-List

Two test accounts exist so every user-to-user interaction can be exercised
end-to-end. Both are pre-verified (age_verified, 100% profile) and the host has
a bookable session seeded.

| Account | Email | Role | Notes |
|---------|-------|------|-------|
| A (host) | `torree.marcel+musetest1@gmail.com` | Photographer | Has 1 seeded session ("Test Portrait Session", $150/60 min) |
| B (booker) | `torree.marcel+musetest2@gmail.com` | Model | Books/messages A |

Password: stored in the vault as `MUSE_TEST_PASSWORD`. Both are real Supabase
auth users with `email_confirmed_at` set, so no inbox step is needed.

> Reset helper: `DATABASE_URL=... python scripts/seed_test_accounts.py` (idempotent)
> recreates the profiles + session if they're ever wiped.

---

## 1. Auth & session
- [ ] Sign in as A in one browser profile, B in another (incognito).
- [ ] Session persists across refresh; sign-out clears it.
- [ ] Password reset email arrives and the link works.

## 2. Profile
- [ ] Edit profile as A (name, bio, type, styles, location) → save → persists.
- [ ] Avatar/photo upload succeeds and renders on the card.
- [ ] Profile completion % updates after editing.
- [ ] Public profile of B is viewable from A and vice-versa.

## 3. Discover / swipe / match
- [ ] A sees B in Discover (and vice-versa).
- [ ] Swipe/like from A → B's "interested" / likes list updates.
- [ ] Mutual like → match created → **match overlay** shows one of the 10 variants with a real apostrophe ("It's a Match!") and fades in/out (no scale/zoom).
- [ ] Match appears in both Muses/Match lists.

## 4. Messaging
- [ ] A sends a **message request** to B (unmatched path) → B sees it under requests.
- [ ] B accepts → real conversation opens for both.
- [ ] Matched chat: send both directions; realtime delivers without refresh.
- [ ] Read receipts / last-seen update.

## 5. Feed / Moments / likes
- [ ] A posts to the Feed → B sees it.
- [ ] B likes/comments A's post → counts update for both.
- [ ] A posts a Moment → B views it.
- [ ] **Photo like** (migration 0015): like the same image from two surfaces → one shared count.

## 6. Community / Forum
- [ ] A joins a community; B sees the member list + role badge.
- [ ] B requests to join a private community → A (admin) approves → B is a member.
- [ ] A posts a forum topic; B replies (nested reply-to-reply → migration 0006).
- [ ] A locks/pins the post (migration 0011) → B can't reply to a locked post.

## 7. Bookings (money path)
- [ ] A's session appears in B's Sessions list.
- [ ] B books A's session → booking row created, status pending.
- [ ] B pays via Stripe Checkout → success redirect → payment status `held`.
- [ ] A completes the booking → funds captured/transferred to A's Connect account.
- [ ] Payment history shows base + itemized Muse service fee for B.
- [ ] Double-pay is blocked (second checkout returns 409).

## 8. Refund / dispute
- [ ] B files a refund request on a completed booking (migration 0014).
- [ ] B cannot file a second open request (409 DUPLICATE).
- [ ] B withdraws the request.
- [ ] Admin resolves it.

## 9. Boost
- [ ] A buys a boost (migration 0013) → `muse_boost_purchases` row.
- [ ] Boost inventory increments; active boost shows an expiry.
- [ ] Boosted profile ranks higher in Discover.

## 10. Quests / streak
- [ ] Daily login popup shows the **flame** (SVG gradient fix) and today's checkmark.
- [ ] Completing an action (swipe, message, post) progresses the matching quest.
- [ ] Claiming a quest reward grants likes/boost.
- [ ] Streak increments on consecutive-day login.

## 11. Notifications & email
- [ ] Match/message/booking each produce an in-app notification for the recipient.
- [ ] Notification preferences toggles actually suppress the matching email.
- [ ] Transactional emails render correctly in Gmail + Outlook (table layout, solid button colour, readable body text).
- [ ] Unsubscribe link works.

## 12. Safety / moderation
- [ ] B blocks A → A disappears from B's Discover and can't message B.
- [ ] B reports A → `muse_reports` row with `status='open'` (migration 0004).
- [ ] Admin resolves the report → status `actioned`/`dismissed` + `resolved_at` set.
- [ ] A suspended account can't sign in.

## 13. Two-factor
- [ ] Settings → Two-Factor → Set Up → QR renders, code verifies, 2FA enabled.
- [ ] Cancel mid-setup unenrolls the pending factor (no stale factor left).
- [ ] Re-entering Set Up after an abandoned attempt works (self-heals).
- [ ] Disable works; login no longer prompts for a code.

## 14. Stripe Connect (host onboarding)
- [ ] A: Settings → Marketplace Payments → Set Up → onboarding URL opens.
- [ ] Onboarding completes → `charges_enabled`/`payouts_enabled` true.
- [ ] If it fails, the alert now shows the real Stripe message (not "Server error").

---

## Known open issues (not regressions)
- `/api/muse/match?limit=50` returns 0 live candidates for some accounts —
  backend/Supabase-data issue; Discover falls back to the static demo deck.
