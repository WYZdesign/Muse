# MUSE APP — Agent Handover
## Session: 2026-08-20 → 2026-08-22

---

## THE MISSION

We're playing a **"dark spots" game** — like Diablo fog-of-war. The MUSE app is a full-featured dating app scaffold. We've uncovered and fixed many disconnected/fake features, but there are still dark spots. Your job: find them, assess them, and fix the ones that are safe to fix.

**Pattern:** Features are built (UI, API, DB schema) but disconnected — fake data, Math.random() seeded, localStorage-only, or dead API paths. We've been systematically wiring them to real backends.

---

## WHAT WE FIXED (Previous Sessions)

### Session 1 (Previous) — Major Fixes
| Fix | What was fake | How it's real now |
|-----|--------------|-------------------|
| Chat replies | `Math.random()` canned responses | Gated behind `DEMO_MODE` flag |
| Match inflation | Random matches on every swipe | Gated behind `DEMO_MODE` |
| Match daily limit | `dailyLikes` never enforced | Gated behind `DEMO_MODE` |
| DiscoveryPrefs persistence | localStorage only | Saved to server `preferences` JSONB |
| Portfolio/albums | Assumed disconnected | **Already wired** — `MyAlbumsManager` uses `authFetch("/api/muse", ...)` |
| Prompt Bank | Assumed disconnected | **Already wired** — `save-prompt-response` / `get-prompt-responses` both functional |

### Session 2 (This Session) — Fixes Applied
| Fix | File | What changed |
|-----|------|-------------|
| `likedBy` random seeding | `page.tsx:1022,1589` | Gated behind `DEMO_MODE` — no more phantom "X liked you" |
| `online` badge | `page.tsx:445` | `!!p.online` instead of `Math.random() > 0.5` |
| Notification prefs save | `MenuModal.tsx:380` | Now sends `{ ...discoveryPrefs, notifications: notifPrefs }` |
| Notification prefs load | `page.tsx:519-522` | Reads `d.profile.preferences?.notifications` on session restore |
| `obStep` cross-device | `page.tsx:523-526` | Reads `d.profile.preferences?.onboardingStep` on session restore |
| `obStep` auto-save | `page.tsx:488-500` | Debounced 2s useEffect saves to server on change |
| `notifPrefs` auto-save | `page.tsx:502-510` | Debounced 2s useEffect saves to server on change |
| `onboardingStep` whitelist | `route.ts:939` | Added to `ALLOWED_PREFS` in `save-preferences` action |

**Compile status:** Clean (exit 0)

### Session 3 (Claude, 2026-08-22) — Fixes Applied
Patch applied via `git am`. Claude had no push access (known Anthropic sandbox bug).

| Fix | File | What changed |
|-----|------|-------------|
| Block enforcement (dark spot #8) | `route.ts` — `type=profiles`, `match`, `message` | `muse_blocks` was write-only. Now: blocked users filtered from Discover, `match`/`message` return 403 if blocked. |
| Message-send lying UI | `page.tsx` — `sendMsg`, `sendChatImg` | `persistMessage()` return was discarded — showed "sent" even on failure. Now rolls back optimistic bubble + toasts on failure. |
| Real online presence | `auth/route.ts`, `sql/MUSE_LAST_SEEN_20260822.sql` | Added `last_seen_at` heartbeat on session check. Run the SQL migration in Supabase Dashboard. |
| Real matches fetch | `page.tsx` — new `MATCHES: fetch real matches` effect | `GET type=matches` was never called from client — always showed demo fallback. Now fetches real matches on login, computes online from `last_seen_at`. |
| BTS regression fix | `page.tsx` — `MOMENTS: fetch real BTS moments` effect | Unconditional `setStories(mapped)` wiped demo fallback with empty array. Now only overwrites when `mapped.length > 0`. |

**SQL Migration Required:** Run `sql/MUSE_LAST_SEEN_20260822.sql` in Supabase Dashboard.

### Session 4 (2026-08-22) — Sunrise Theme
| Fix | File | What changed |
|-----|------|-------------|
| Light mode theme | `muse.css`, `page.tsx`, `SettingsScreen.tsx` | Added "sunrise" theme: cream `--bg: #fdf4ec`, gold `--gold: #e8a84c`, coral accents, 25+ light-mode CSS overrides, swatch gradient, type union, settings grid. |

### Session 5 (2026-08-22) — Dark Spot Fixes
| Fix | File | What changed |
|-----|------|-------------|
| iPhone 13 notch fix | `BtsScreen.tsx`, `CodexScreen.tsx`, `MusesScreen.tsx` | Replaced inline `padding: "12px 18px"` with `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` to respect iPhone notch safe area. |
| Forum vote API | `route.ts:730`, `NetworkScreen.tsx:173`, `MenuModal.tsx:296` | `forumType === "vote"` handler wired. Client calls `action: "forum", type: "vote"` on ▲/▼ clicks. |
| Feed like API | `route.ts:666`, `FeedScreen.tsx:251` | `like-feed-post` action handler + client wiring with optimistic toggle. |

### Session 6 (2026-08-22) — Final Wiring
| Fix | File | What changed |
|-----|------|-------------|
| filterStyles/filterScore cross-device | `page.tsx:520-527`, `route.ts:939` | Debounced 2s useEffect saves to `preferences` JSONB. Restored on session load. Added to `ALLOWED_PREFS`. |
| BtsScreen moments like | `BtsScreen.tsx:19,31,127`, `route.ts:693-703` | Added `apiFetch` prop. Wired like button to call `like-moment` action. New route handler updates `muse_moments.likes`. |
| savedBriefs cross-device | `page.tsx:567-570`, `CollabScreen.tsx:182-190`, `route.ts:939` | Bookmark button calls `save-preferences` with `savedBriefs` array. Restored from `preferences.savedBriefs` on session load. Added to `ALLOWED_PREFS`. |

**Compile status:** Clean (exit 0) — `95de36c` on `main`.

---

## THE DARK SPOTS — What's Left to Explore

### HIGH PRIORITY — Real Bugs / Disconnected Features

#### 1. `profileViews` / `profileViewers` — Still Fake
- **Location:** `page.tsx` lines 213-214, 467-468, 1022-1023 (now gated)
- **Problem:** `profileViews` is a count, `profileViewers` is an array of `{name, avatar, time}`. Both are seeded from localStorage only. No backend writes exist. No `muse_profile_views` table.
- **Fix options:**
  - A) Gate behind `DEMO_MODE` (like likedBy) — simplest
  - B) Wire to `muse_activity_log` with `action: 'view-profile'` — reads real data but needs writes on every card view (high-frequency)
  - C) Create `muse_profile_views` table — cleanest but most work
- **Recommendation:** Option A for now. The "who viewed you" screen is a premium feature in most dating apps — could be gated behind `muse_pro` tier.

#### 2. `activityFeed` — Partially Fake
- **Location:** `page.tsx` lines 1024, 1591 — random "liked your profile" entries added to feed
- **Problem:** Activity feed entries are created client-side with `Math.random()` gating. No server-side activity log writes on like/match events.
- **Backend exists:** `muse_activity_log` table (inserted on `match`, `message`, `brief_apply` events via route.ts)
- **Fix:** Read from `muse_activity_log` on session load instead of building fake entries client-side. The `GET /api/muse?type=activity` endpoint may already exist — check.

### MEDIUM PRIORITY — Potential Issues

#### 3. `notifPrefs` Toggle Immediate Feedback
- **Location:** `SettingsScreen.tsx:147-148`, `MenuModal.tsx:374-375`
- **Problem:** Toggle switches update local state immediately (good), but server save is debounced 2s. If user closes settings before 2s, save may not fire. Consider saving on close/blur as well.

#### 4. `chatImages` — Image Cache
- **Location:** `page.tsx` line 415
- **Problem:** Chat image cache stored in localStorage. Check if it's bounded (last 20 entries per chat) and doesn't bloat storage.

#### 5. `testLevels` / `obSelects` — Onboarding Test State
- **Location:** `page.tsx` lines 462-463
- **Problem:** Test results and onboarding selections. Check if they sync to server properly.

### LOW PRIORITY — Enhancement Opportunities

#### 6. `connect` / `connections` System
- **Location:** `ConnectionsScreen.tsx`, `route.ts` connections actions
- **Problem:** Connection requests/acceptances — verify end-to-end flow works.

#### 7. `sessions` / `bookings` System
- **Location:** `SessionsScreen.tsx`, `route.ts` booking actions
- **Problem:** Session booking/payments — verify Stripe integration works.

#### 8. `communities` System
- **Location:** `CommunitiesScreen.tsx`, `route.ts` community actions
- **Problem:** Community creation/joining/posts — verify end-to-end.

#### 9. `safety` / `verification` System
- **Location:** `SafetyScreen.tsx`, `route.ts` safety actions
- **Problem:** Age verification, ID verification — verify flow works.

#### 10. `codex` / `refer` Systems
- **Location:** `CodexScreen.tsx`, `ReferralPanel.tsx`
- **Problem:** Knowledge base and referral system — verify functionality.

---

## HOW TO INVESTIGATE

### 1. Server-Side Audit
Check `route.ts` for all registered actions and verify each has a client-side caller:
```bash
# List all actions handled by the API
grep -n "actionType ===" "V:\Muse\src\app\api\muse\route.ts"
```

### 2. Client-Side Audit
Check which actions the client actually calls:
```bash
# List all apiFetch/authFetch calls with action payloads
grep -n "action:" "V:\Muse\src\app\(muse)\muse\page.tsx"
```

### 3. Cross-Reference
Compare the two lists. Any server action with no client caller = dead code. Any client call with no server handler = broken feature.

### 4. Database Table Check
Verify all tables exist and have expected schema:
```bash
# Check Supabase dashboard or run:
grep -n "from(\"muse_" "V:\Muse\src\app\api\muse\route.ts" | sort -u
```

### 5. Visual Inspection
Use vision to check:
- Does the UI actually render the feature?
- Are there loading states / error states?
- Does the feature degrade gracefully when backend is unavailable?

---

## KEY FILES

| File | Purpose |
|------|---------|
| `src/app/(muse)/muse/page.tsx` | Main app — 2600+ lines, all state, all screens |
| `src/app/api/muse/route.ts` | API — 1800+ lines, all actions |
| `src/app/api/muse/auth/route.ts` | Auth — session, signup, login, update-profile |
| `src/app/(muse)/muse/screens/*.tsx` | Individual screens (20+) |
| `src/app/(muse)/muse/components/*.tsx` | Shared components |
| `src/lib/profiles.ts` | Seed data (PROFILES, DEMO_MOMENTS) |

---

## DEPLOYMENT RULES

1. **Compile check:** `cd "V:\Muse" && npx tsc --noEmit` — must exit 0
2. **No inline python:** Save to .py file, execute separately
3. **No comments in code** unless explicitly asked
4. **Paste-ready diffs:** No placeholders, no "fix this yourself"
5. **Test with vision:** When possible, screenshot the UI to verify rendering

---

## SESSION STATE

- **Build status:** Clean (tsc exit 0)
- **Last compile:** 2026-08-22
- **Last commit:** `95de36c` — savedBriefs cross-device
- **DEMO_MODE flag:** Controls fake data generation (chat replies, match inflation, likedBy)
- **Supabase tables:** muse_profiles, muse_messages, muse_matches, muse_briefs, muse_forum_posts, muse_feed_posts, muse_connections, muse_community_members, muse_bookings, muse_notifications, muse_activity_log, muse_moments, muse_blocks, muse_rsvps, muse_albums, muse_album_photos, muse_album_access, muse_album_likes, muse_prompt_responses, muse_prompts, muse_safety_profiles, muse_push_tokens
- **Preferences JSONB keys:** notifications, onboardingStep, filterStyles, filterScore, savedBriefs, discovery prefs (ageMin, ageMax, gender, openToTravel, distance, tags, nsfw, showOnline, showDistance)

---

## NOTE TO CLAUDE

You have the same tools as the previous agent — bash (PowerShell), read, edit, grep, glob, webfetch, websearch, and vision. Use them aggressively. The codebase is large (2600+ line page.tsx, 1800+ line route.ts) so use grep/glob to navigate, not reading entire files.

**Approach:**
1. Start with the server-side audit (grep all actions in route.ts)
2. Cross-reference with client calls (grep all apiFetch calls)
3. Identify dead actions and broken flows
4. Fix the high-priority items first
5. Use vision to verify UI rendering when possible
6. Run compile check after every change

**Be bold.** The previous agents have established a safe pattern: gate fake data behind DEMO_MODE, wire real backends where they exist, add debounce for persistence. Follow that pattern.

Good luck. 🎮
