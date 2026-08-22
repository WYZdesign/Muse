# Muse — Handover: Claude's Patch Applied + Remaining Dark Areas

**Date:** 2026-08-22
**Commits:** Claude's `a3e8ce7` + wyzmind's `952eb49` (both pushed, deployed)
**Build:** `tsc --noEmit` + `npm run build` clean
**SQL:** `MUSE_STATS_PERSIST_20260822.sql` **APPLIED** to production Supabase (verified `stats` column exists)

---

## 1. Claude's patch — verified + applied + SQL migrated

Claude pushed `a3e8ce7` directly (it had push access after all). I verified every piece:

| Item | Status |
|------|--------|
| Chat history load on open (`fetchConversationHistory` + effect) | ✅ in `muse-realtime.ts` + `page.tsx` |
| Stats persistence (`stats` jsonb) | ✅ code in route.ts + page.tsx |
| Stats SQL migration | ✅ **I applied it** via Supabase Management API — `stats` column now exists (Claude had flagged it as "must run"; it was NOT applied) |
| Brief/forum moderation (`screenText` + 403 SAFETY_BLOCK) | ✅ in route.ts |
| Forum "Post" lying-UI fix (`r.ok` check) | ✅ in NetworkScreen.tsx |
| `tsc` + `build` + 53 tests | ✅ confirmed clean |

**One thing I cleaned:** the stray `0001-claude-structural-fixes-20260822.patch` file (untracked) — removed it. Also confirmed Claude's commit is on `main` and `origin/main` is synced.

---

## 2. wyzmind's follow-up fixes (this session, `952eb49`)

From the "remaining dark areas" audit, three more confirmed disconnects fixed:

1. **Verified badge never flipped** — Stripe Identity "verified" only set `age_verified`, never `verified` (which drives the Verified Pro badge + `calcMatch` +3). Now sets both.

2. **Discovery Preferences never persisted** — client sent `{ action:"save-preferences", preferences: {...} }` but the whitelist didn't match the nested shape, so it always 400'd. Now accepts both flat + nested, merges (not overwrites), and whitelists `ageMin`/`ageMax`/`gender`.

3. **Match % never recomputed** — the deck showed static seed `profile.score`; editing your type/looking never changed match %. Now `filteredProfiles` runs `calcMatch` live and takes `max(seed, live)`, with `obData.type/looking/styles` in the memo deps.

---

## 3. Remaining dark areas (audited, NOT yet fixed — for Claude)

I ran a 12-item audit. Here's the definitive status of everything left:

### DISCONNECTED (real, unfixed)

- **likedBy / profile views** — purely local state, seeded by `Math.random() > 0.4` (`page.tsx:1012`). No backend read/write. The "X liked you" and "X viewed your profile" surfaces are fake — they reset on reload and never reflect real activity.
- **Notification Preferences** (`notifPrefs`) — localStorage-only. No action writes it, nothing reads it back server-side. Toggling notifications does nothing durable.
- **online badge** — hardcoded in `PROFILES` seed + `Math.random() > 0.5` for matches. No presence heartbeat exists. Every "online" dot is fiction.
- **Onboarding resume (cross-device)** — `obStep` persists to localStorage (same-browser resume works) but not `muse_profiles`, so a new device/cleared storage restarts onboarding.

### PARTIAL (partially wired)

- **Prompt Bank** — server side WIRED (`save-prompt-response` → `muse_prompt_responses`, `get-prompt-responses` reads back). **Not confirmed** whether `PromptBankModal`/`page.tsx` actually call these vs localStorage. Needs a 1-file check.
- **Portfolio/albums** — server side WIRED (full CRUD in route.ts:995-1121 + storage upload). **Not confirmed** whether `MyAlbumsManager` calls these actions and whether `currentUser.portfolios` ↔ `muse_profiles.portfolios` are connected. Needs a 1-file check.
- **Connections (Muses tab)** — `GET type=matches` reads `muse_matches` (WIRED), but the fallback seeds matches from `PROFILES.slice(0,6)` when empty, so it's hard to tell live vs stub. Needs a live check.

### WIRED (correct, no action)

- **book-session talent-side** — `route.ts:866-888` correctly derives host from session and treats the caller as booker regardless of side. ✅
- **Chat history** — now WIRED (Claude's fix). ✅
- **Stats persistence** — now WIRED (Claude's fix + my SQL apply). ✅

---

## 4. Claude — your next hunt (ranked by impact)

1. **likedBy/profile views** — highest value. These are the "someone likes you / viewed you" dopamine triggers, and they're 100% fake right now. Wire them to `muse_activity_log` (already records match/like events) or `muse_notifications`. A real user will notice these resetting.

2. **Prompt Bank + Portfolio** — confirm whether the client calls the already-built server actions. If not (likely, given the pattern), wire them. Two of the core profile-completion features may be localStorage-only despite having working backend endpoints.

3. **Notification Preferences** — `notifPrefs` needs a server write (the `save-preferences` whitelist already has a `"notifications"` key) + a read-back on session load. Otherwise "mute push/email" toggles are cosmetic.

4. **online badge** — either implement a real presence heartbeat (last-seen timestamp on `muse_profiles`, updated on session load) or remove the dot entirely. A fake "online" badge is worse than no badge.

5. **Onboarding cross-device resume** — persist `obStep` to `muse_profiles` (a `onboard_step` int column, updated on step change + read on session load). Low priority but cheap.

6. **Connections tab** — verify live vs stub on a real account.

---

## 5. The meta-pattern (still the key)

Every single gap this whole effort has found is the same shape: **a feature was built (UI + sometimes backend), but the data wiring between them was never completed end-to-end.** The fix for almost everything is: "make the UI read from the backend, and make the action write to it." Claude's "live repro, expected vs saw" method keeps catching these perfectly — keep using it.

The three fixes in `952eb49` (verified badge, prefs, match %) were all caught by *reading the code with the "is this actually wired" lens*, not by clicking — so that lens works too, and it's faster for the remaining items.

---

## File map (refreshed)

- `src/app/(muse)/muse/page.tsx` — SPA monolith (state, filteredProfiles/match%, edit profile, modals)
- `src/app/(muse)/muse/components/types.ts` — PROFILES, CREATIVE_SIDE, calcMatch, CITY_GEO
- `src/app/(muse)/muse/screens/*.tsx` — 17 screens
- `src/app/(muse)/muse/components/*.tsx` — MuseMap, DisclosureModal, MyAlbumsManager, PromptBankModal, etc.
- `src/app/api/muse/route.ts` — 48+ actions (match, message, brief-apply, save-preferences, sync, etc.)
- `src/app/api/muse/auth/route.ts` — register/login/update-profile/session
- `src/app/api/muse/verification/route.ts` — Stripe Identity (now also flips `verified`)
- `src/app/api/webhooks/stripe/route.ts` — checkout + referral reward
- `src/app/muse-realtime.ts` — realtime + fetchConversationHistory (Claude's)
- `src/lib/` — email, push, contentScan, rate-limit, money, supabase
- `sql/` — migrations (MUSE_STATS_PERSIST_20260822.sql now APPLIED)
