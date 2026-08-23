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

### Session 7 (Claude + Torree, 2026-08-22)
Torree asked for a swipe-feel pass + dark/light-mode fix + tutorial overlay + settings reorg. Multiple patches applied across sessions 7a-7d.

| Fix | File | What changed |
|-----|------|-------------|
| Swipe feel (touch-action race) | `muse.css` | `.swipe-card` was `touch-action:pan-y`, which hands vertical touch movement to the browser's native scroll handler first. Set to `none` so JS has uncontested control. |
| Swipe-up (super like) was dead | `page.tsx`, `DiscoverScreen.tsx` | Fully wired: y-axis tracking, upward-release threshold calling `doSwipe("super")`, missing `.label-super` div rendered. |
| Photo-nav zones blocked gesture | `page.tsx` | `.card-photo-zone` removed from block list — drag starts anywhere on card. |
| Pointer capture on wrong element | `page.tsx` | `setPointerCapture` on `e.currentTarget` not `e.target`. |
| Dark/light-mode native controls | `globals.css`, both `layout.tsx` | `color-scheme: dark` set globally. |
| NSFW checkbox accent | `CommunityScreen.tsx` | `accentColor: "#ffd700"` added. |
| Tutorial overlay: invisible ring | `TutorialOverlay.tsx`, `page.tsx` | `onStepSelector` callback forces radial menu open. Rects <4x4px fall back to generic. |
| Tutorial overlay: off-screen tooltip | `TutorialOverlay.tsx` | Space-based placement, viewport clamping, `maxHeight`+`overflowY:auto`. |
| Settings reorganization | `SettingsScreen.tsx` | 4 groups → 6 groups: Account, Appearance, Discovery, Payments, Safety, Legal. |
| Activity panel back button | `MenuModal.tsx` | ← arrow when inside sub-screens, X on main menu. |
| Notch-safe headers | `CollabScreen.tsx`, `FeedScreen.tsx`, `PortfolioScreen.tsx` | Right-side spacer added so titles stay left-aligned. |
| Feed comment input | `FeedScreen.tsx` | Post button embedded inside input field. Action buttons widened to `flex: 1.05`. |
| CommunityScreen rewrite | `CommunityScreen.tsx` | Event/group cards open detail modals. RSVP/Join/Share all working with toasts + loading states. Web Share API. |
| NetworkScreen rewrite | `NetworkScreen.tsx` | Gradient header (blue→cyan). Pro cards tap to open profile modal. Connect button graceful error handling. Forum comments expand inline. |
| Match logic bug fix | `page.tsx:1682` | `Math.random()>0.5` → `DEMO_MODE&&Math.random()<0.3` in intent picker. |
| SQL migration done | Supabase Dashboard | `muse_profiles.last_seen_at` column added. |

### Session 8 (Claude, continued)
| Fix | File | What changed |
|-----|------|-------------|
| BTS page: BeReal/Snapchat integration | `BtsScreen.tsx` | Dual camera prompt, 2-minute window, grid layout, reactions, real-time feel. |

### Session 8 (Claude, 2026-08-22) — Full site wiring audit
Torree asked for a full pass: every button/form/action across the whole app, cross-referenced frontend↔backend. Used parallel sub-agents to enumerate all 120+ backend handlers (all 21 route files) and every frontend trigger (all ~37 client files), then matched them by hand. Full report delivered to Torree as `muse_site_wiring_audit.md` — summary here for the loop.

**Headline: the app is overwhelmingly well-wired** — 100+ confirmed call sites match a real handler exactly (swipe/match, chat, briefs, forum, feed, communities, events, bookings, payments, albums, disclosures, safety check-ins, referrals, admin tools, data export, account deletion, push). The items below are the exceptions found, not the norm.

**Fixed this session:**

| Fix | File | What changed |
|-----|------|-------------|
| Discovery Preferences "Save" did nothing | `page.tsx` | ageMin/ageMax/distance/gender were 100% local state — Save just closed the modal + toasted "saved". Backend already whitelists these in `save-preferences` (unlike filterStyles/filterScore, which already had persistence). Wired Save to actually POST, added restore-on-login. |
| Unblock didn't actually unblock server-side | `page.tsx`, `SettingsScreen.tsx` | Block modal never added the target to local `blockedUsers`; Settings' Unblock button only spliced the (already-wrong) local list, never called the real `unblock` action. Since block enforcement is live (session 3), this meant a "successfully unblocked" user was still actually blocked underneath. Block now updates local state, a new effect fetches the real list via the previously-uncalled `get-blocks` endpoint on login, Unblock calls the real action. |
| Safety Center "Share Details" tab fully dead | `SafetyCheckinModal.tsx` | Three buttons (SMS/Email/Copy Link) had zero `onClick` at all, despite a fully working `onShareDetails` callback already built in `page.tsx` (real backend call + toast). Wired all three, defaulting to the most relevant booking. |

**Found, NOT fixed — flagging for next round (see full report for detail):**
- "Send Like + Note" — the note text never actually sends as a real message (like itself registers, note doesn't). Data-loss-flavored, worth prioritizing.
- "Unmatch" — local-only, no backend `unmatch` action exists at all (would need a new endpoint, unlike block/unblock which are already a pair).
- CollabScreen "Book" button (paid briefs) — stub, toast only.
- MenuModal (hamburger submenu) has three dead spots: "Learn" (community, toast-only — CommunityScreen's own version works), "Online Status" toggle (no onClick at all, permanently shown on), "View" on BTS submenu (that whole submenu is 6 hardcoded fake stories, unrelated to the real working BtsScreen).
- Connected Accounts toggles (IG/FB/Spotify/SoundCloud) are fully fake — no OAuth backend exists at all. Possibly intentional placeholder pending a real integration decision, not clearly a "bug" to fix blindly.
- Checked and confirmed NOT a bug: Subscription promo code — client-side check looked like a bypass but `/api/checkout` independently re-validates server-side.

**Compile status:** Clean (tsc exit 0), `npm run build` clean, 53/53 vitest tests pass

### Session 9 (Claude, 2026-08-22) — Continued wiring audit, cleared most of Session 8's backlog

Extended the audit to the public marketing pages (`src/app/muse/*`, separate from the app at `src/app/(muse)/muse/*`), then worked through Session 8's "found, not fixed" backlog.

**New gaps found (public marketing pages, previously unaudited):**
- QR code source attribution — `source` param was only embedded inside the encoded target URL, backend never read it (always defaulted to "default"). Fixed: sent as its own query param.
- Hero waitlist form silently swallowed non-OK responses. Fixed: added `heroError` state, parses and surfaces real error message.
- Pricing page had no CTA at all. Fixed: added "Join the Waitlist" button pointing at the landing page's real `#join` waitlist form.

**Session 8 backlog cleared:**

| Fix | File(s) | What changed |
|-----|---------|--------------|
| "Send Like + Note" note never sent | `page.tsx` | Note now goes through `persistMessage` (real message-send path), with optimistic UI + rollback + toast on failure. |
| "Unmatch" was local-only | `route.ts`, `page.tsx`, `MatchCard.tsx`, `useChatState.ts` | Added real `unmatch` backend action (deletes `muse_matches` row in both directions). `unmatchTarget` changed from bare name to `{id, name}` across 4 call sites. Confirmation modal calls real action with rollback on failure. |
| CollabScreen "Book" button (paid briefs) | `CollabScreen.tsx` | Opens a real chat with the brief's author instead of fake toast. |
| MenuModal "Learn" (community submenu) | `MenuModal.tsx` | Navigates to real CommunityScreen instead of faking a toast. |
| MenuModal "Online Status" toggle | `page.tsx`, `MenuModal.tsx` | Wired to new `showOnline` state, persisted via `save-preferences` (field already whitelisted but unused). |
| "IG" share button fallback | `page.tsx` | Copies profile link with "paste in IG bio/story" toast instead of opening instagram.com. |

**Still open — genuinely bigger scope than a wiring fix:**
- MenuModal "View" on BTS/Moments submenu — 6 hardcoded fake story cards, stale duplicate of real `BtsScreen.tsx`. Needs product call.
- Connected Accounts toggles (IG/FB/Spotify/SoundCloud) — fully fake, no OAuth backend exists. Product decision needed.
- `get-strikes` / `appeal-strike` / `admin-resolve-appeal` — backend actions exist with zero frontend callers. Missing feature, not wiring miss.

**Dark spot #1 (`profileViews`) — gated:** `DEMO_MODE` flag controls fake data. The "who viewed you" screen is gated behind `muse_pro` tier.

**Dark spot #2 (`activityFeed`) — already wired:** `page.tsx` notifications-merge effect reads real rows from `muse_notifications` table (not `muse_activity_log`), deduped by body text.

---

## THE DARK SPOTS — What's Left to Explore

No HIGH PRIORITY items open — #1 gated, #2 already wired. Next up is MEDIUM.

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

### Session 10 (Claude, 2026-08-22) — Deeper pass, one severe bug found

Chrome vision access came back this session, so a few screens were visually spot-checked against production (e.g. "Show Distance" really rendered permanently off and "Online Status" permanently on, matching code-level predictions). Ran 4 parallel sub-agents over admin/moderation, onboarding, Settings/Profile/Portfolio, and Sessions/booking/payment.

**The big one:** Onboarding's final profile save has been silently failing for every user. The "Enter Muse" button POSTed `{action:"update-profile", auth_id, updates:{...}}` but the backend reads fields flat off the body (`body.name`, `body.type`, etc), never from a nested `updates` object. Every submission hit `Object.keys(updates).length === 0` → 400 → swallowed by empty `catch{}`. Name/type/bio/styles/looking/zodiac/etc never reached the server; only local state/localStorage held them, so device-switch or storage-clear showed an incomplete profile. Fixed by flattening the payload + adding a failure toast.

**Also fixed:** `update-profile` allowlist missing `zodiac`/`chinese`/`mbti`/`life_path` (now added); hamburger "Show Distance" toggle was bound to `setShowNsfw` (bypassing age-verification) — gave it a real `showDistance` preference; "Edit Profile" no longer shows "Saved!" on failure; referral-code apply failure now toasts; double-payment guard on `create-booking-checkout` (409 if payment already `held`/`succeeded`); `?payment=success`/`cancelled` redirect toasts; admin appeal-resolve UI (Uphold/Overturn); booker "Cancel booking" control.

**Still flagged (not fixed):** onboarding Portfolio step fully fake (hardcoded stock photos, never sent to server); Connect Your World OAuth stubs; double-payment guard needs independent review; "Pay" button doesn't hide after paid (bookings query doesn't join `muse_booking_payments`); no user-facing strikes/appeal UI (`get-strikes`/`appeal-strike`); legacy `type === "admin"` stats endpoint looks dead.

### Session 11 (Claude, 2026-08-23) — rate-limit gaps, push-toggle sync, Feed/BTS/Network rollback

Answered Session 10's follow-up asks (rate-limit audit, Feed/BTS/Network/Codex). Codex turned out to be a fully static local glossary — nothing to wire.

**Fixed:** `create-booking-checkout` had no rate limit (now 10/min); `book-session` email-bomb risk (now 15/min); `confirm-disclosure` + `respond-checkin` safety actions (10 & 15/min); upload `DELETE` matched to its `POST` sibling (60/min). Settings push toggle now syncs to the browser's real subscription state on load (was always "off"). Feed BTS/moment composer no longer claims "posted locally" on failure — rolls back the optimistic insert. Feed/BTS like buttons + Feed reply box roll back optimistic state on failed request. NetworkScreen's forum comment box (`addComment`) was a pure local stub with zero backend call — wired to the real `forum`/`reply` endpoint.

**Left open (deliberately):** realtime layer has no reconnect/backoff (flagged as top pick for next round); message dedup keys on `text+"|"+img` not id; dead push-notification code paths (`usePushNotifications.ts`, `useWebPush()`); `checkRate` keys by IP not user (systemic).

### Session 12 (Claude, 2026-08-23) — realtime reconnect with backoff

Took Session 11's top pick. `subscribeToConversation` reported `disconnected` on `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` but never retried — a dropped Supabase channel mid-chat silently missed new messages until navigating away/back. Rewrote it to own an internal reconnect loop: exponential backoff (1s→2s→5s→10s→20s→30s, capped, retries until `unsubscribe()`), resets backoff on `SUBSCRIBED`, fresh channel name per attempt. Fully self-contained in `muse-realtime.ts` — no `page.tsx` changes.

**Caveat:** NOT tested against a real dropped connection. Recommend manual test: open chat, kill/restore network, confirm messages catch up without navigating away.

**Still open:** message-dedup-by-content fix (needs `client_msg_id` threaded through send path); everything else from Session 11's "left open" list.

### NOTE TO CLAUDE — you now have browser + vision (new capability, use it)

Claude now has full agentic browsing with vision. This unlocks live verification that prior rounds couldn't do. **Prioritize these live tests before the next round of code-only audit:**

1. **Realtime reconnect (Session 12) — top priority, still unverified.** The reconnect/backoff fix in `muse-realtime.ts` has never been tested against a real dropped connection. Live test: open a conversation between two accounts, kill/restore the network (or pause the Supabase realtime socket via devtools), send a message from the other side while "disconnected," and confirm the recipient's chat catches up automatically WITHOUT navigating away from the chat screen. If it doesn't, that's a real bug to fix now that it can actually be observed.

2. **Visual re-verification of every UI bug confirmed only at code level.** With vision, screenshot-and-confirm (or disprove) the fixes already landed: the "Show Distance" / "Online Status" toggles now render correctly, the onboarding final-save actually persists (register a fresh account, complete onboarding, hard-reload, confirm name/type/bio/styles survive — the severe bug Session 10 fixed), and the NetworkScreen forum comment + Feed reply box actually persist to the server on reload.

3. **`showDistance` server-side withholding** — Session 10 flagged that the toggle now *saves* but nothing server-side actually withholds `distanceMi` when a user sets `showDistance:false`. Live-verify: set it off on one account, view that account from another, confirm distance is still leaking. If so, that's a real follow-up fix (match/discover query needs to check the viewed user's preference).

---

## SESSION STATE
- **Build status:** Clean (tsc exit 0), `npm run build` clean, 53/53 vitest tests pass
- **Last compile:** 2026-08-23 (Session 12)
- **Last commit:** Session 12 — realtime chat reconnect/backoff in `muse-realtime.ts`, on top of Session 11 (rate-limits + push-toggle sync + Feed/BTS/Network rollback fixes) on `main`
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

### Session 10 — Deep Audit Findings (WYZMIND, 2026-08-22)

Ran a deeper sweep beyond the surface-level button audit. Found these NEW gaps that Sessions 8-9 missed:

**Critical (data loss / trust-safety broken):**
1. **FeedScreen "get-replies" has NO backend handler** (`FeedScreen.tsx:262`) — clicking to expand comments on feed posts sends `action:"forum", type:"get-replies"` but route.ts only handles `forumType === "reply"` (insert) and `"vote"`. The request silently fails. Users can never see replies on feed posts. **Fix:** Add a `"get-replies"` branch in the forum handler that queries `muse_forum_replies` by `post_id`.
2. **NetworkScreen Report button does nothing** (`NetworkScreen.tsx:617`) — `onClick={() => showToast("Reported")}` with no API call, no `target_id`, no `reason`. Users think they reported someone but nothing happened. Trust/safety feature is broken. **Fix:** Wire to `apiFetch("/api/muse", { action: "report", ... })` like page.tsx:2224 does.

**Medium (misleading UX / incomplete features):**
3. **SubscriptionScreen MUSEBETA promo is client-only** (`SubscriptionScreen.tsx:50`) — sets `promoApplied = true` and shows "Muse Beta applied — $0/month" toast, but never sends the code to the server. User thinks they got free Pro but their tier in DB is still "free". **Fix:** Send promo code to server, validate, update profile tier if valid.
4. **`get-disclosures` has no frontend caller** (`route.ts:1355`) — backend returns the user's disclosures but no screen ever fetches them. Users can create/confirm disclosures but can't see a list of pending/completed ones. **Fix:** Add a disclosures list to the Safety screen or Settings.
5. **`appeal-strike` has no frontend caller** (`route.ts:1371`) — strikes can be issued but users have no UI to view or contest them. **Fix:** Add a strikes/appeals section to the Safety screen.

**Low (dead code / cosmetic):**
6. **`showUnlimitedBadge` state never used** (`page.tsx:112`) — declared, never set or read.
7. **SessionsScreen "View Profile" shows redundant toast** (`SessionsScreen.tsx:192`) — opens profile correctly but also toasts unnecessarily.

### Instructions for Claude — Double-Check + Go Deeper

**Phase 1: Verify my findings above.** Don't trust my grep — some of these are complex enough that I might have missed a caller or misread the flow. For each of the 7 findings:
- Confirm the dead handler / missing caller by grepping ALL .tsx files
- Check if there's a different code path I missed
- If confirmed, fix it

**Phase 2: Go up the ladder of discovery.** The button audit is surface-level. Now dig into:

1. **Data flow integrity** — For each screen, trace the full lifecycle of its data: where it's fetched, how it's stored, what mutations exist, and whether the mutations actually persist. Look for screens that fetch data but never save changes, or save changes that never get fetched.

2. **Race conditions** — The app uses optimistic UI everywhere (update local state first, then API call). Look for places where:
   - Two rapid clicks could duplicate an action (double-book, double-like, double-join)
   - A failed API call doesn't roll back correctly
   - Local state diverges from server state after a sync

3. **Auth/permission gaps** — Check if any screen exposes data or actions that should be gated behind `muse_pro` tier or age verification. The `isUnlimited` prop exists but might not be checked everywhere it should be.

4. **Edge cases in the new wiring** — The session 8-9 fixes added a lot of new code. Stress-test it mentally:
   - What happens if `get-blocks` returns a 500? Does the app crash or degrade gracefully?
   - What happens if `unmatch` fails after the optimistic UI already removed the match?
   - What happens if `save-preferences` fails after the toast says "saved"?
   - Are there any new useEffects with missing cleanup functions that could cause state updates on unmounted components?

5. **SQL injection / input validation** — The new `unmatch` action takes `target_id` from the request body and passes it directly to `.eq("target_id", target_id)`. Verify that `UUID_RE` validation is sufficient and that no string could bypass it.

6. **The BTS submenu fake stories** — Session 8 flagged this but didn't fix it. Make a product decision: either delete the duplicate submenu entirely (since `BtsScreen.tsx` is the real feature) or wire it to real data. Don't leave it as-is.

**Phase 3: Write your own audit.** After fixing the above, run the same deep sweep I did above but on YOUR changes. Look for the same categories of bugs. Add your findings to this HANDOVER.md.

**Phase 4: Commit + push everything.**

Good luck. 🎮
