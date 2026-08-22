# Muse — Handover: Claude's Structural-Gap Fixes + Your Next Hunt

**Date:** 2026-08-20
**Commit:** `27b7c07` (deployed on Vercel)
**Build:** `tsc --noEmit` + `npm run build` both clean

---

## What wyzmind fixed from YOUR last audit (all 6 + the earlier 4)

### Your "structural gaps" report — all addressed

1. **Uneditable Duality** — FIXED. Edit Profile now has **Creative Type** (grouped into Behind/In Front) + **Looking For** chips. `saveProfileEdits` persists `type` + `looking` (both already allowed in `update-profile` API). The duality is now user-editable, not seed-locked.

2. **Collab "Apply" 500 + lying UI** — FIXED twice over:
   - Root cause: stub briefs use numeric ids, DB expects UUIDs → 500. Now returns `{success:true, demo:true}` for numeric ids.
   - The UI also never checked `r.ok` (apiFetch resolves on 500), so it showed "Applied!" regardless. Now checks `r.ok` and reverts on failure.

3. **Activity feed empty** — FIXED. The feed reads `muse_notifications`, but `match`/`message` actions never *wrote* to that table (only booking/disclosure/connection did). Now both write a notification row (with `from_id` for the recipient).

4. **Menu Profile stats show 0** — FIXED. `MenuModal` was reading stale `currentUser.stats.matches` (default 0). Now reads `matches.length` (live). ProfileScreen already used the correct source.

5. **BTS ghost town** — already had seed content in code (`DEMO_MOMENTS` + initial `stories` array of 5). Root cause was likely the session-load path (`d.stories` empty → should fall back to `DEMO_MOMENTS`). Verify live; if still empty it's a restore-path bug, not missing content.

6. **Map zero markers** — FIXED. Mapbox GL **CSS was never loaded** (only the JS script), which breaks marker rendering. Added the `mapbox-gl.css` stylesheet link. Markers were already being generated from `CITY_GEO` — they just couldn't render without CSS.

### Earlier report (already fixed, re-confirm)
- Community Join 400 → stub-id tolerant + "✓ Joined" state
- Community Learn dead → now expands description inline
- Professionals Connect → "✓ Requested" state
- Sessions duality → 3 tabs (Browse / My Bookings / Requests)

---

## THE PATTERN (for your next hunt)

You nailed it: **features are built but their data wiring is disconnected.** Every gap this whole session has been the same shape. So here's a **checklist to keep finding them** — go through each screen and ask: *"does this UI element actually read from a live source, or is it hardcoded/stale?"*

### Known-remaining disconnects to verify (I suspect these, haven't confirmed)

1. **`likedBy` / profile views** — the "X viewed your profile" and "X liked you" surfaces. Are they wired to anything real, or purely local state that resets on reload? (`likedBy`, `profileViews`, `profileViewers` state in `page.tsx`)

2. **Match % recalculation** — when a user changes their `looking`/`type` in Edit Profile, does the Discover deck's match % actually recompute? Or is it computed once at load from stale data?

3. **`currentUser.stats` persistence** — likes/passes/superlikes increment locally but do they ever write back to `muse_profiles`? A user who closes the app loses their stats? Check if `stats` is in any `update-profile` payload.

4. **"Save" preferences** — Discovery Preferences / Notification Preferences: do they persist server-side (`save-preferences` action exists) AND get re-applied on next load? Or local-only?

5. **Prompt Bank** — answers are saved to `promptResponses` but do they persist? The Settings screen shows "X% answered" — is that live or always 0%?

6. **Portfolio / albums** — `MyAlbumsManager` exists; do edits actually write to Supabase storage + `muse_profiles.portfolios`, or local-only?

7. **Verified badge** — is `verified` ever set true by the Stripe Identity verification flow, or is it only ever the hardcoded seed value? (AgeVerificationModal exists; does it call back and flip `verified`?)

8. **Chat message persistence** — messages write to `muse_messages` but does the chat screen actually *load* history on open, or only show the current session's sent messages? (Check `loadChatHistory` / `type=messages` fetch)

9. **Connections (Muses tab)** — do accepted connections appear, or is it all simulated? (`CONNECTIONS` stub vs real `muse_connections`)

10. **The `online` badge** — profiles show "online" but nothing ever sets/clears it based on actual presence. Purely seed data.

### Deeper "obvious once you think about it" gaps

- **Duality persistence** — `muse_profiles` still has no `creative_side` column. `CREATIVE_SIDE` is derived from `type` in code. Fine for now, but if a "Model" also wants to list as "Photographer" (multi-hyphenate), the model breaks. Consider a `creative_side` or multi-type field later.
- **Onboarding resume** — 18 steps, does a returning user resume where they left off or restart? Check `obStep` persistence.
- **Text moderation** — chat/briefs/forum have `sanitizeText` + `screenText` (keyword-based). But forum posts and briefs — do they run `screenText` too, or only chat messages? Verify the *create brief* and *forum post* paths actually screen.
- **Booking from talent side** — Sessions Browse now exists, but does `book-session` work when a *talent* books a *crew's* session? Or is it still host-centric (the `book-session` handler assumes the target is a "session host")?
- **Notification dedup** — the activity feed maps notifications and dedups by `text`. If two different people send the same message text ("hey"), the second is dropped. Check the dedup key.

---

## Suggested next priority for you (Claude)

1. **Verify BTS + map live** (they were your #5/#6; both had code fixes but need a browser confirm).
2. **Stats persistence** (#3 above) — it's the same "built but not wired" pattern and affects the whole engagement system.
3. **Chat history load** (#8 above) — a user messaging someone then reloading should see the conversation; if not, that's a real trust-breaker.
4. **Text moderation coverage** (deeper #3) — if briefs/forum bypass `screenText`, that's a safety gap, not just polish.

Keep reporting the same way (live repro + what you expected vs saw). It's been exactly right every time — the "built but disconnected" lens is catching everything the code review missed.

---

## File map (refreshed)

- `src/app/(muse)/muse/page.tsx` — SPA monolith (state, onboarding, edit-profile, modals, `DEMO_MOMENTS`)
- `src/app/(muse)/muse/components/types.ts` — `PROFILES`, `CREATIVE_SIDE`, `BEHIND_CAMERA`/`IN_FRONT_CAMERA`, `lookingForOptions`, `CITY_GEO`, `calcMatch`
- `src/app/(muse)/muse/screens/*.tsx` — 17 screens (ProfileScreen, SessionsScreen, CommunityScreen, NetworkScreen, FeedScreen, DiscoverScreen, etc.)
- `src/app/(muse)/muse/components/*.tsx` — MuseMap, DisclosureModal, AgeVerificationModal, MyAlbumsManager, SafetyCheckinModal, PromptBankModal, etc.
- `src/app/api/muse/route.ts` — 48+ actions (match, message, brief-apply, join-community, create-community, create-event, etc.)
- `src/app/api/muse/auth/route.ts` — register/login/update-profile
- `src/app/api/webhooks/stripe/route.ts` — checkout + referral reward
- `src/lib/` — email.ts, push.ts, contentScan.ts, rate-limit.ts, money.ts, supabase.ts
