# HANDOVER — Muse Sessions 52-55+ (complete continuity brief for next Claude)

## ✅ Session (this round) — CRITICAL Feed regression found + fixed, hoop tightened, advice still owed

**Found and fixed a live production bug** while running wyzmind's push-to-10/10 verification checklist: the Feed screen was rendering permanently blank in prod. Root cause was in `page.tsx`'s `bootstrapData`, in the dedup optimization added for the "no duplicate GETs" work:

- Old: `skipWrap((liveFeed?.length ?? 0) > 0 || (feedPosts?.length ?? 0) > 0, "feed")`
- `FeedScreen.tsx` does NOT render from `liveFeed` — it renders `feedPosts` (+ `feedPostsStatic` only under `DEMO_MODE`). `liveFeed`/`baseFeed`/`hasLiveFeed` exist in `FeedScreen.tsx` only for the `isLivePost` id-matching helper, never for the displayed list or the empty-state check.
- `useFeedData.ts` has its own `profileId`-gated `useEffect` that populates `liveFeed` via an independent `/api/muse?type=feed` fetch — but it never calls `setFeedPosts`.
- Net effect: once `useFeedData`'s effect resolved first, `liveFeed.length > 0` went true, so `bootstrapData`'s dedup permanently skipped the ONLY fetch that populates `feedPosts` — and since a recent commit (`f4aad2c`, gating `feedPostsStatic` behind `DEMO_MODE`) removed the demo fallback, the Feed screen rendered blank with no loading skeleton and no empty-state message either.
- Confirmed live via Chrome network/console inspection: no `type=feed` GET ever fired, zero console errors — a silent skip, not a crash.
- **Fix**: `skipWrap((feedPosts?.length ?? 0) > 0, "feed")` — key the skip on the state that's actually rendered, not on the unrelated `liveFeed`. Forum's equivalent dedup was checked and is fine as-is (`NetworkScreen.tsx`/`MenuModal.tsx` genuinely render from `liveForum`).
- Verified: `tsc --noEmit` clean, `npm run test -- --run` 157/157, `npm run build` clean.

**Other fixes this round** (per Torreé's direct asks — hoop should never touch the halo, ~10% tighter, and the Feed composer avatar was still using the old fragmented-arc look):
- `MatchCard.tsx`: `ORBIT_SIZE = RING_SIZE + 9` (was `+10`, i.e. a flat 5px gap/side) — tightened to ~4.5px/side, still clear of the halo.
- `ProfileScreen.tsx` / `MenuModal.tsx`: matching `--orbit-size` shrunk 125px→124px on the top-of-profile and side-panel "Your Profile" avatars for the same tightened gap.
- `FeedScreen.tsx`: composer avatar was missing `orbit-full` (same bug class fixed earlier for Profile/Menu — without it the hoop renders as `.avatar-orbit`'s base partial comet-arc, not a full ring). Added.
- All previously-fixed this-session items still hold: hoop de-pulsed (removed `scale()` from `hulaOrbit`, kept only `rotate()` + a small eccentric `translate()` wobble), full-ring `orbit-full` added everywhere a real ring was intended, side-panel avatar top-crop fixed (`.conn-scroll` has zero top-padding; added `paddingTop:20` to the wrapping div), Quests page restructured to `"top"|"all"` 2-tab view (top 4 claimable/closest, all + tier bubbles only on the "all" tab), quest header padding now matches the hamburger menu's safe-area-aware offset.

**Two more found while auditing the server-side security checklist items** (rate-limit fail-closed, stripped auth fields):
- `rate-limit.ts`'s `checkRate` treated an RPC result of `null`/`undefined` as an implicit ALLOW (`data === true || data === null || data === undefined ? true : ...`), contradicting its own documented fail-closed design. In current practice this branch is unreachable — the `check_rate()` SQL function always `RETURNS BOOLEAN` from a single-row upsert, so a successful call only ever returns `true`/`false` — but it was a live landmine if the RPC signature or a proxy layer ever changed. Tightened to require an explicit `true`; anything else (including null/undefined) now fails closed and logs.
- `auth/route.ts`'s `pubProfile()` helper has a comment claiming it strips `auth_id, email, suspended` from login/session/update-profile responses, but the actual destructure only omitted `auth_id, suspended, created_at, updated_at, tier` — `email` was never in the list and was slipping through into the response. Confirmed low-severity (this only ever wraps the caller's *own* profile, never another user's, and the frontend reads `email` from the separate Supabase `user` object, never `profile.email` — grepped, zero call sites), but it directly contradicted the checklist item ("login/update-profile responses no longer include auth_id/email/suspended") and the code's own stated intent. Fixed by adding `email` to the destructure.

**Also found while verifying the Menu focus-trap item**: `useFocusTrap.ts`'s setup effect had `onClose` in its dependency array, and `MenuModal.tsx` passes it as a fresh inline arrow every render — so any re-render of MenuModal while the sheet is open (a toast firing, a countdown tick, any parent state change) tore down and re-ran the whole setup effect, which re-focuses the first focusable element every time. Net effect: focus would get silently yanked back to the top of the sheet while the user was mid-interaction (e.g. typing into a field, or having tabbed several controls in). Fixed by routing `onClose` through a ref (`onCloseRef`) updated in its own effect, so the real setup effect depends on `active` alone and only runs on actual open/close — Escape, Tab-wrap, and focus-restore-on-close behavior unchanged, just no longer re-triggered by unrelated re-renders. `useFocusTrap` has exactly one caller (`MenuModal.tsx`) so this is a self-contained fix.

**Still outstanding / not yet done:**
- The monolith-split architectural advice request below (`ACTIONS wanted: MONOLITH SPLIT PLAN`) has NOT been answered yet — only preliminary research done (72-76 `ACTIONS[...]` entries enumerated, existing per-domain route pattern confirmed, ~102 frontend `apiFetch("/api/muse"...)` call sites / 99 `action:"..."` literals counted as the blast radius of any URL-based split). A full phased plan is still owed.
- Verification checklist partially done this round: confirmed live — Feed composer disabled/counter states, Discover "0 matches" live badge + "No matches here" empty state (funnel icon, "Try widening your filters..." subtext, Reset button — correctly NOT reusing "All caught up!"). Still unchecked: Discover loading skeleton on first load, active-pref dots + map/boost glow on header icons, toast error(✕red)/success(✓green) accent rendering, Menu sheet Escape-to-close + focus-trap + focus-restore. Server-side security items (NSFW gating, rate-limit fail-closed, stripped auth fields) are API-level, not pure-vision — flagging for wyzmind's own route-test coverage rather than claiming visually verified.

## 🧩 (Claude → wyzmind) — MONOLITH SPLIT: YOUR TURN (interleaved domains)
wyzmind finished the cleanly-bounded domains. The remaining handlers are **interleaved** and need careful per-handler extraction. **Follow the proven pattern** so nothing breaks:

**Pattern (verified safe, 4 domains, 157 tests green):**
1. Create `src/lib/muse-actions/<domain>.ts`, export each handler as a named function taking `ActionContext` (import `type ActionContext` from `./shared`).
2. In `route.ts`: `import { <fn> } from "@/lib/muse-actions/<domain>";` and replace the inline `ACTIONS["x"] = async ({...}) => {...}` body with `ACTIONS["x"] = <fn>;`.
3. Keep the dispatch registry + frontend call sites UNCHANGED (no URL change, no blank-screen risk).
4. Tidy any now-unused imports from route.ts.
5. `npx tsc --noEmit` + `npx vitest run` (must stay 157/157) + `npm run build` before each commit.

**Already extracted (DON'T re-do):** `shared.ts`, `quests.ts`, `albums.ts`, `feedback.ts` (get-notifications, mark-all-notifications-read, report-bug, submit-idea). route.ts is now ~1851 L.

**Remaining (interleaved — extract one domain per commit):**
- **admin-\***: admin-resolve-appeal (861), admin-brain (1203), admin-reports (1342), admin-strikes (1351), admin-suspend-user (1360), admin-scan-nsfw (1387), admin-content-scans (1441), admin-resolve-incident (1490) — internal-only, lowest risk.
- **disclosures**: create-disclosure (716), confirm-disclosure (802), get-disclosures (837).
- **strikes**: get-strikes (846), appeal-strike (851).
- **communities**: join-community (458), leave-community (474), create-community (485).
- **events**: create-event (510), rsvp (529), cancel-rsvp (542).
- **sessions/bookings**: book-session (554), create-session (581), respond-booking (885), cancel-booking (924), complete-booking (963), submit-review (1009), respond-checkin (1032), get-checkins (1060), share-safety-details (1066), save-safety-profile (1135), get-safety-profile (1154), get-prompts (1161), save-prompt-response (1169), get-prompt-responses (1196).
- Leave for LAST (highest-risk, most frontend call sites): profile, match, message, feed, forum, connect.
- **GET `type=` switch (~460 L)** — split only AFTER POST fully migrated.

**Goal:** after all cuts, `route.ts` should be down to the POST dispatcher + GET type-switch + ACTIONS registry wiring (~<400 L). Commit to `claude-work`; wyzmind reviews, merges, pushes, verifies live per domain.

## 📐 (Claude → wyzmind) — MONOLITH SPLIT PLAN (advice, no code changed)

Researched both files fully. Recommendation is below — **advice only, nothing implemented**, per your instruction. Order-of-operations, safest-first.

### `route.ts` (74 ACTIONS across 24 commented domain banners already in the file — you basically already have the split map)

The file is better organized than it looks: 24 `// ═══ SECTION ═══` banners already group the 74 actions by domain (profile, matching, feed/moments, briefs, forum, safety/moderation, communities, events/rsvp, sessions/bookings, connections, preferences, albums (9 actions, the biggest single group), disclosures, strikes, booking-mgmt, checkins, safety-profile, prompts, admin-brain, payments, admin-moderation, quests, plus ~6 unbannered tail additions). That's the split map — no design work needed there.

The real risk isn't the split, it's the ~15 shared helpers at the top (lines 1-178): `getAuthUser`, `getAuthedProfile`/`bearerTokenFromReq`, `applyStrikeAndEscalate`, `emailProfile`, `isAdminEmail`, `validateInput`/`MAX_LENGTHS`, `isConvoParticipant`, plus rate-limit/safety/AI-moderation/notification/Stripe imports. Every domain touches several of these. **Do not duplicate them per route** (the existing `auth/`, `connect/`, `referral/`, `verification/route.ts` files already duplicate the auth+rate-limit+safety boilerplate independently of each other, which is exactly the drift you want to avoid at 20+ routes). First move, before touching `ACTIONS` at all: extract those ~15 helpers into a `lib/muse-actions/shared.ts` (or similar) that both the monolith and every new per-domain route import from. That's a pure refactor, zero behavior change, and de-risks everything after it.

Then cut order, safest first: **quests** (3 actions, self-contained engine calls, low blast radius) → **admin-\*** (11 actions across admin-brain/admin-reports/admin-strikes/admin-suspend-user/admin-scan-nsfw/admin-content-scans — internal-only traffic, no public frontend regression risk if something's off) → **albums** (9 actions, the single biggest domain, but a clean self-contained feature) → **events/rsvp**, **communities**, **disclosures/safety-profile/checkins** (small, low-traffic) → leave **profile, match, message, feed, forum, connect** for last — those are the highest-traffic, highest-regression-risk domains and the ones with the most of the 102 frontend call sites hitting them, so you want the pattern proven on low-stakes domains first. Each cut: new route file re-exports the shared middleware chain (enforceRequestSafety → rate-limit → getAuthedProfile → suspended-check) around just that domain's handlers, update the frontend `apiFetch` call sites for that domain's `action:` values to the new URL, delete the corresponding `ACTIONS[...]` entries from the monolith, ship, verify, move to the next domain. `GET`'s `if (type===...)` chain (~460 lines) is a separate, independent split along the same lines — do it after POST is fully migrated, not concurrently.

### `page.tsx` (78 useState / 32 useRef / 30 useEffect / 33 useCallback)

Prop-bag size is the best safety signal here, not line count. **DiscoverScreen (~76 props) and MenuModal (~74 props)** are the deepest into shared state (swipe mechanics, cross-cutting modal visibility) — do NOT start there, they'd need a context/reducer extraction done first to even be worth touching. **QuestPanel (~8), AnalyticsScreen (~7), PortfolioScreen (~8), SubscriptionScreen (~10), CodexScreen (~4), BtsScreen (~10)** have the smallest prop surfaces and are effectively already near-presentational — start extraction there to prove the pattern with near-zero risk. **NetworkScreen** (1529 lines but a comparatively modest prop count) is a good second wave — most of its complexity is self-contained, not parent-threaded.

Recommended state clusters to peel into their own context/reducer, in order: (1) quests state (loginStreak/weeklyLogins/claimableQuests/nearQuests/topQuests) — small, isolated, matches the QuestPanel extraction; (2) UI/modal-visibility cluster (~25+ booleans like showEditProfile/showReport/showTerms/showQuests/etc.) — these are pure open/close flags with no cross-dependencies, a `useReducer` with a single `{modal: string|null}` shape would collapse 25 useState calls into one and is very low-risk; (3) auth/onboarding cluster (authMode/authEmail/obStep/obData/obTest* — the onboarding quiz sub-state is already fairly self-contained); (4) discover/swipe state — do this only after DiscoverScreen itself has been proven safe to touch via the small-screen extractions above, since this is the riskiest cluster (swipe mechanics, daily-limits, boost timers all interact).

### `sql/` migration runner

Current state: ~40 files in `sql/`, no formal numbering — ad hoc `MUSE_<FEATURE>_<YYYYMMDD>.sql` naming plus some undated legacy files, and a few manually-concatenated "apply everything" bundles (`MUSE_APPLY_ALL.sql`, `MUSE_CATCHUP_ALL_20260819.sql`). No runner script exists; these are applied by hand into the Supabase SQL editor. Recommendation: don't retrofit history — freeze current `sql/` as "pre-migration" and start a `sql/migrations/NNNN_description.sql` append-only numbered sequence from here forward (four-digit, zero-padded, matches most lightweight runners' expectations). For the runner itself, given you're already on Supabase, the **Supabase CLI's own migration system** (`supabase migration new`, `supabase db push`) is the lowest-effort choice — it's already aware of your project, needs no new dependency, and gives you a tracked `schema_migrations` table for free instead of hand-rolling one. Only reach for something like `node-pg-migrate` if you want migrations to run from CI/application code rather than the CLI.

### Route-test strategy for post-split modules

You already have the template: `auth.route.test.ts` (Vitest, `vi.mock` on `@/lib/rate-limit` and `@/lib/supabase`, a `mockReq(body, ip)` helper building a fake `NextRequest`, importing `POST` directly off the route file to assert status codes). Apply that same shape to each new per-domain route as it's cut — mock the shared `lib/muse-actions/shared.ts` helpers from the refactor above instead of re-deriving auth/rate-limit logic per test file, and add one route-test file per domain at the same time you cut it (not batched at the end), so each split ships with its own regression coverage immediately. The existing `muse.route.test.ts` (58 lines, only covers unauthenticated track-event/track-error) should be left in place through the transition and only trimmed once the actions it indirectly covers have fully moved out.

## 🧭 (Claude) — ADVICE WANTED: MONOLITH SPLIT PLAN [ANSWERED ABOVE]
wyzmind is about to split the two monoliths and wants your architectural advice (research/advice only, no code changes unless you see a clear bug). Read and respond with a concrete, phased split plan:
- **`src/app/api/muse/route.ts`** (~2504 lines, 76 `ACTIONS` handlers: auth, matches, chat, briefs, sessions, bookings, forum, quests, strikes, notifications, admin). The clean per-domain pattern already exists (`api/muse/auth|connect|referral|verification/route.ts` each own a file). How to split the 76 actions into per-domain route modules WITHOUT breaking the `ACTIONS`-registry dispatch or the existing `type=` GET switch? What's the safe cut order (which domains first), and how to keep the `enforceRequestSafety`/rate-limit/`getAuthedProfile`/`ACTIONS` wiring shared?
- **`src/app/(muse)/muse/page.tsx`** (~3030 lines, 78 useState / 32 useRef / 30 useEffect / 33 useCallback) — the SPA shell that threads enormous prop-bags into every screen. How to extract per-screen state into context/reducer slices (auth, currentUser, matches, chat, discover) while keeping the app working? Which screens are safest to extract first to prove the pattern?
- Also: is there a **migration runner** approach (number, append-only) you'd recommend for the sql/ folder, and a **route-test strategy** for the post-split per-domain modules?
Give a pragmatic, order-of-operations plan (what do FIRST to reduce risk, what to defer). Prioritize not breaking the live app over elegance.

## ⚡ (Claude) — VERIFY the latest live changes with vision + agentic browsing, then fix any gaps
wyzmind shipped a big push-to-10/10 batch. Verify each on `https://muse.wyzdesign.com/muse` (login `test_audit_99@muse.dev`/`AuditTest99!`) with VISION and report gaps on `claude-work`:
1. **Data-layer dedup** (`f2d1e33`): bootstrapData skips ~6 duplicate GETs (briefs/feed/forum/events/communities/sessions) when the hooks already loaded them. VERIFY: on first load, no blank/broken Feed/Briefs/Sessions/Community — all data still renders (partial load acceptable once).
2. **Feed composer**: Post button is now disabled/dimmed when empty + a 0/500 char counter (turns red near limit). Confirm states look right.
3. **Discover**: loading skeleton (immediately after login), "No matches here" for zero-result search (NOT "All caught up!"), active-pref dots + map/boost glow on header icons, toast error ✕ red / success ✓ green.
4. **Menu sheet**: Escape closes it (or steps back from a sub-screen), focus-trap keeps Tab inside, focus restores on close.
5. **Auth/security** (server-side, verify via API or devtools): NSFW profiles stripped for non-verified users; rate-limit fails closed (429 on burst); login/update-profile responses no longer include auth_id/email/suspended. NEW route tests cover webhook idempotency, referral, dispatcher (157 total).
If any screen regressed (blank list, wrong empty state, ghost filter), log it on `claude-work` and fix if clear.

## CRITICAL: Read this FIRST
This is a live push-to-10/10 effort. wyzmind just shipped these — verify each on `https://muse.wyzdesign.com/muse` (login `test_audit_99@muse.dev`/`AuditTest99!`) with VISION, and note any regression or better fix on the `claude-work` branch:
1. **Discover loading skeleton** — 3 shimmer cards while the deck boots (`DiscoverScreen.tsx`, `isLoading` prop). Confirm no flash/blank on first load.
2. **Distinct "No matches here"** empty state for zero-result filter/search (was wrongly reusing "All caught up!"). Confirm a zero-match search shows it, not the caught-up message.
3. **Toast variants** — error toasts now show a ✕ + red accent (e.g. failed login, "Message couldn't be sent"), success shows ✓ + green. Confirm the accent renders cleanly.
4. **Server-side NSFW/age gating** — `GET /api/muse?type=profiles` now strips NSFW profiles/photos for non-verified users. Verify an unverified account can't fetch an NSFW profile's photos.
5. **Rate-limit fail-closed** — `rate-limit.ts` denies on DB error (was fail-open). Verify high-volume bursts still 429, and no healthy user gets stuck.
If you find any visual/UX gap or a better approach, commit it to `claude-work` and note it here.

## CRITICAL: Read this FIRST
- Repo: `WYZdesign/Muse` (private, Vercel-deployed)
- Local path: `V:\Muse`
- Owner: Torreé. Tone: direct, no fluff, deliver complete diffs.
- Working style: Torreé fires off fast 1-2 line mobile messages. He is NOT stupid. He is annoyed. Read his requests literally and ship the fix — no extra commentary.
- Past 4 sessions: 52 (batched motion audit), 53 (origin-check 403 blocker), 54 (social connect/disconnect fix, Stripe checkout), 55 (business model + FD Studio). This session (56) handled UI polish, gradient matching, Muses card UX, Network tab filter cleanup, BTS gradient, profile ring centering.
- All previous commits (52-55) are live in main. This handover covers everything done in session 56 plus the open items Torreé raised mid-session that I (Claude) need to audit and finish.

## ⚠️ DELIVERY WORKFLOW (permanent — applies to EVERY session, both agents)

**The only reliable bridge is the shared repo `V:\Muse`.** Claude's session is **unable to push** to `origin` — Anthropic's git proxy denies `WYZdesign/Muse` at the session level (verified: blocked before the request reaches GitHub, so no token helps). **Decision (final): Claude works directly in `V:\Muse` and commits to branches; wyzmind merges + pushes.** Do not chase a token/push path again — it's confirmed impossible.

**Claude (the other agent):**
- Work **directly in `V:\Muse`** (device bridge gives you file access). Do NOT build in a separate clone.
- Commit your work to the branch **`claude-work`** in `V:\Muse`. Never rely on pasting commit hashes into chat or "sending a bundle" — those are unreachable to wyzmind unless the file actually lands in the shared repo.
- Do NOT try to `push` — it 403s at the proxy; leave the code on `claude-work`.
- Paste a short plain-text summary in chat (one tight block) for the record, but the REAL handoff is the committed branch.

**wyzmind (me / this operator):**
- After each Claude delivery, `git fetch`/diff `claude-work`, review, then merge/rebase onto `main`, push to `origin` (auto-deploys), and `wyz_deploy_check.py <sha>` verify live.
- Confirm Claude's work is not a duplicate of something already merged; reconcile conflicts by preferring the well-tested version.
- Prune `claude-work` after merging (recreate it fresh when needed) so it's never stale.

**Channel summary:** chat = prose/decisions only; `V:\Muse` git = the actual code handoff. If a Claude commit isn't reachable as a git object in `V:\Muse`, it doesn't exist — treat it as unshipped and re-implement or ask for the branch.

## Repo state at handover

| Branch | Commit | Status |
|--------|--------|--------|
| main | 3eb579d | LIVE on Vercel prod |
| main | e279597 | FD Photo Studio page + client guide, route from Sessions, removed feed share icon |

134/134 tests passing. `tsc --noEmit` clean. `npm run build` clean.

## What was done in session 56 (Torreé-driven UI polish)

### Muses screen — expansion removed
- **File**: `src/app/(muse)/muse/components/MatchCard.tsx`
- **File**: `src/app/(muse)/muse/screens/MusesScreen.tsx`
- **What**: Cards no longer expand in place on tap. They go straight to chat on click. Toweré said "just have it so when you tap card it opens chat."
- **Deletions**: All drag/swipe/expand machinery (dragOffset, isDragging, pointerDown/Move/Up, REVEAL_OFFSET, expanded panel, Report/Block/Unmatch reveal inside expanded). MatchCard is now ~70 lines.
- **State cleanup**: `expandedMatchId` prop and `matchActions.setExpandedMatchId` kept in props (no callers, but the type stays). `expanded={expandedMatchId === String(m.id)}` removed from MusesScreen render call.
- **Keep**: Like/chat layout. `match-actions-row` on swipe cards in Discover. Swipe-to-unmatch swipe cards in Discover.

### Network tab — filter UI cleanup
- **File**: `src/app/(muse)/muse/screens/NetworkScreen.tsx`
- **What**: Removed the old 5 `<select>` dropdowns (Experience, Rate, Skills, Looking, Sort) and the duplicate filter-bubble row. Now there's ONE horizontal-scroll row of filter bubbles (Experience, Sort, Rate, Skills, Looking, Hiring) that expand individually into their own panel. Torreé said "only one horizontal scroll filter sort line of bubble buttons that expand individually to more settings all neatly and cleanly stacked and full wide."
- **What still needs work** (audit this): the expanded panels below are still on multiple lines and wrap. I think they're fine but verify per "should be neatly and cleanly stacked and full wide" — if the expanded panel buttons (Exp: All/Rising/Established/Veteran) wrap, that's intended. If they overflow horizontally, switch flexWrap to nowrap + overflow scroll.
- **Active filter badges**: removed from the old select row. They're no longer needed because the bubble button shows `✓` when active.

### Discover title alignment
- **File**: `src/app/(muse)/muse/muse.css`
- **File**: `src/app/(muse)/muse/screens/DiscoverScreen.tsx`
- **What**: `.logo-link` had `position:absolute; left:50%; top:50%; transform:translate(-50%,-50%)` which was centering ALL title text including on Discover where it should be left-aligned. Fixed: made `.logo-link` use a `position:relative` default with `align-self:center` and a `--title-gradient` CSS variable so per-page titles can opt into absolute centering if needed. Discover title overrides to `position:static; left:auto; top:auto; transform:none; margin:0; padding:0;` and the matching gradient.

### Profile ring centering
- **File**: `src/app/(muse)/muse/muse.css`
- **What**: `.profile-ring` uses `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%)` for centering. The `ringSpin` keyframe was `to { transform: rotate(360deg) }` which clobbered the centering on every frame. Fixed: `@keyframes ringSpin { to { transform: translate(-50%,-50%) rotate(360deg) } }` so the centering is preserved through the animation.
- **Torreé was VERY upset** that I broke this after getting it right in session 51. Do not regress.

### Title gradients match nav icon gradients
- **File**: `src/app/(muse)/muse/components/Nav.tsx` (REFERENCE — these are the canonical gradients)
- **Files**: All screen headers updated: DiscoverScreen, MusesScreen, FeedScreen, CollabScreen, PortfolioScreen, CommunityScreen, SessionsScreen, SettingsScreen, SubscriptionScreen, AnalyticsScreen, NetworkScreen, BtsScreen, ProfileScreen.
- **What**: Each page's title now uses the EXACT same `linear-gradient(90deg, ...)` as its bottom-nav icon and (where applicable) the hamburger menu icon.

| Page | Bottom-nav gradient | Title gradient | Hamburger grad |
|------|---------------------|----------------|----------------|
| Discover | gold/peach | `#FFD700,#FF8C69,#FFB6C1,#FFD700,#FFA07A,#FFD700` | n/a (top-level) |
| Feed (Connections) | sky blue | `#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF` | n/a (top-level) |
| Collab (Briefs) | teal/green | `#20B2AA,#9ACD32,#00CED1,#20B2AA,#7CFC00,#20B2AA` | n/a (top-level) |
| Muses (Matches) | fire | `#FF4500,#FFD700,#FFAA00,#FF4500,#FF8C00,#FF4500` | n/a (top-level) |
| BTS (Moments) | orange→yellow | `#FF4500,#FFA500,#FFFF00,#FFA500,#FF4500` | n/a (top-level) |
| Network | (hamburger only) | `#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF` | `#B3E5FC,#64B5F6,#00BCD4` (blue) |
| Sessions | (hamburger only) | `#E1BEE7,#9C27B0,#FF4081,#E1BEE7,#9C27B0,#E1BEE7` | `#E1BEE7,#9C27B0,#FF4081` (purple) |
| Community | (hamburger only) | `#FF8A80,#FF4757,#FFD700,#FF8A80,#FF4757,#FF8A80` | `#FF8A80,#FF4757,#FFD700` (coral) |
| Profile | (hamburger only) | `#FFD700,#FFB5C2,#B388FF,#FFD700,#FFB5C2,#FFD700` | `#FFD700,#FFB5C2,#B388FF` (gold/pink) |
| Settings | (hamburger only) | `#CE93D8,#B388FF,#A5D6A7,#CE93D8,#B388FF,#CE93D8` | `#CE93D8,#B388FF,#A5D6A7` (lavender) |

### BTS — pink-to-yellow gradient
- **File**: `src/app/(muse)/muse/screens/BtsScreen.tsx`
- **What**: Title text changed from `linear-gradient(90deg, #fff 0%, #FFE4E1 50%, #FFFACD 100%)` (white/pink/cream) to `linear-gradient(90deg, #FF1493 0%, #FF69B4 50%, #FFD700 100%)` (deep pink → light pink → gold). Header background `headerGradient` also tightened: `#FF1493 → #FA8072 → #FFD700` became `#FF1493 → #FF69B4 → #FFD700` (all pink-to-gold, no orange middle).

### Session 55 — full business model (DONE before session 56)
1. **Closed-beta scope**: `MUSE_CLOSED_BETA_HIDE_SOCIAL` flag in `lib/config.ts`. Hides Community menu entry, Forum sub-tab. Default ON. Toggle to reveal post-beta.
2. **Marketplace pricing**: split-fee model in `app/api/muse/connect/route.ts` + `lib/config.ts`. `MUSE_HOST_COMMISSION_RATE=0.07` (deducted from host payout), `MUSE_BUYER_SERVICE_FEE_RATE=0.08` (added on top, itemized as separate "Muse service fee" line at checkout). Both env-overridable.
3. **PaymentHistory.tsx**: removed hardcoded "(5%)" labels. Now computes real % from `commission_cents / amount_cents`. Summary says "Muse Fee".
4. **Subscription tiers**: "Muse Pro Annual" ($79.99/yr) and "Muse Studio" ($29.99/mo) added to `components/types.ts` and `PRICE_MAP` in `app/api/checkout/route.ts`. Real Stripe Price objects needed in Dashboard before purchasable in prod. Dev/test-mode fallback creates products/prices per plan.
5. **SubscriptionScreen.tsx** tier-key bug: `tier.name.toLowerCase().replace(" ", "_")` only swapped first space. Fixed: `.replace(/ /g, "_")`.
6. **SettingsScreen.tsx** NSFW hardening: always requires Stripe Identity verification. No self-attestation fallback. Stricter than legal floor (500px App Store precedent).
7. **FD Studio integration**: `SessionsScreen.tsx` "Need a space for your shoot?" card at top of Browse tab. Outbound link to `wyzdesign.com/fd?ref=muse_sessions`. Track-event for analytics. Plain outbound, not in-house booking build yet.
8. **Business docs**: `Muse_Business_Plan.docx` and `Muse_Financial_Projections.xlsx` moved to `W:\WYZ_Command_Center\_STATE\` (from Downloads).

## What I should do / could do / did not do (audit checklist for next Claude)

### IMMEDIATE (Torreé raised this mid-session, I did not finish)
- [ ] **FD Studio integration full audit** — Torreé said: "for fd it should either show all the studios and everything in app and all links go to individual studios kinda how studios are laid out in my /fd page OR just go straight to fd all studios page." Right now `SessionsScreen.tsx` has a single "Need a space for your shoot?" card linking to `wyzdesign.com/fd?ref=muse_sessions`. Options:
  - **Option A (lighter)**: leave the card, just make the link go directly to the FD all-studios page (`/fd` or `wyzdesign.com/fd`).
  - **Option B (heavier)**: build an in-app studio list — fetch from FD API, render studio cards inside Muse Sessions tab, each card links to the individual studio's `/fd/[studio]` page on wyzdesign.
  - The /fd page on wyzdesign is at `V:\wyzdesign`. Read its current layout to mirror it. Whatever ships, the link must go somewhere — single "view all studios" link, or individual studio cards.
- [ ] **Audit gradient matching** — Torreé said "the title text in top of each page should be the same gradient color as its corresponding page icon at the bottom menus and whatever the icon gradient colors are for inside menu too." Verify EVERY page title is the EXACT same gradient as the matching bottom-nav icon (when one exists) OR the hamburger-menu icon (when the page is reached via menu not nav). Pages: Discover, Feed, Collab, Muses, BTS, Network, Sessions, Community, Profile, Settings, Subscription, Analytics, Portfolio, BTS subpages.
- [ ] **Audit title centering + alignment + height** — Torreé said "push the fuhkng title text like 10% to be level with buttons in top header bar with back buttons." Some titles still use the old `position:absolute; transform:translate(-50%,-50%)` which centers vertically inside the header. New titles use `position:relative` with no vertical offset. Need to confirm visually: the title baseline should sit at the same height as the back button center, not floating at the header's vertical center.
- [ ] **Audit Muses title static positioning** — MusesScreen still has a stack of redundant style props because I patched it. Clean up.
- [ ] **Audit NetworkScreen same** — same issue.
- [ ] **Audit BTS title — confirm pink-to-yellow** is showing in production. The text gradient and the header background should both be pink→yellow.
- [ ] **Confirm FD Studio page exists and works** — repo `WYZdesign/Muse` shows a `e279597 Add FD Photo Studio page + client guide` commit. So it was built. Verify the path is correct, the page renders, the Sessions card links to the right URL.

### DEFERRED / NOT STARTED
- [ ] Sponsored/ad placements in Discover (deferred in session 55)
- [ ] In-house studio-space marketplace (only build after FD affiliate link proves out)
- [ ] Real Stripe Price objects for `price_muse_pro_annual` and `price_muse_studio_monthly` — currently using dev fallback pricing. Create in Stripe Dashboard before production push.
- [ ] NSFW Stripe Identity integration backend — UI gates it but the actual `stripe.identity.*` flow is not wired.

### SUGGESTED (next session)
- [ ] Move all per-page title gradients to a single `getPageTitleGradient(screen: Screen): string` helper to avoid drift. The duplication is fragile — someone changing the nav color without updating the title will break the visual contract.
- [ ] Add a Playwright/visual test that screenshots the title of every page and checks the rendered text color matches the expected gradient (sampled at 3 points).
- [ ] Consider whether the per-screen hamburger gradients should be the SOURCE OF TRUTH, since most pages are reached via menu not nav. The bottom-nav-only gradients (Discover, Feed, Collab, Muses, BTS) come from Nav.tsx. The menu-only ones come from MenuModal.tsx (community, sessions, network, profile, settings). Centralize both in `lib/config.ts`.

## File-level patch summary (session 56)

| File | Lines changed | What |
|------|---------------|------|
| `components/MatchCard.tsx` | -298 | Removed expand/collapse, drag/swipe, panel. Just chat-on-tap. |
| `screens/MusesScreen.tsx` | -2, +2 | Title position cleanup, removed `expanded={...}` prop, removed `expandedMatchId` import where unused. |
| `screens/NetworkScreen.tsx` | -85, +15 | Removed 5 selects + duplicate bubble row. Single horizontal-scroll bubble row. |
| `screens/DiscoverScreen.tsx` | -1, +1 | Title left-aligned with nav-matching gradient. |
| `screens/MusesScreen.tsx` | -3, +3 | Title static position + matching gradient. |
| `screens/FeedScreen.tsx` | -1, +1 | Title uses Feed (sky blue) gradient. |
| `screens/CollabScreen.tsx` | -1, +1 | Title uses Collab (teal) gradient. |
| `screens/PortfolioScreen.tsx` | -1, +1 | Title uses Portfolio (teal) gradient. |
| `screens/CommunityScreen.tsx` | -1, +1 | Title uses Community (coral) gradient. |
| `screens/SettingsScreen.tsx` | -1, +1 | Title uses Settings (lavender) gradient. |
| `screens/SubscriptionScreen.tsx` | -1, +1 | Title uses Profile (gold-pink) gradient. |
| `screens/AnalyticsScreen.tsx` | -2, +2 | Both title instances use Profile gradient. |
| `screens/NetworkScreen.tsx` | -1, +1 | Title uses Network (sky blue) gradient. |
| `screens/BtsScreen.tsx` | -2, +2 | Title pink→yellow, header tightened to pink→pink→gold. |
| `screens/SessionsScreen.tsx` | -1, +1 | Title uses Sessions (purple) gradient. |
| `muse.css` | -2, +4 | `.logo-link` made relative with `--title-gradient` variable. `.profile-ring` keyframe preserves centering transform. |
| **Total** | **−369, +33** | Net 336 lines removed (mostly dead MatchCard machinery). |

## Tone/style notes for next Claude
- Torreé swears a lot when frustrated. Do not match the swearing, do not apologize. Just fix the thing and confirm it's live.
- Mobile-typed messages are typo-heavy. Read the request as best you can, but verify the fix matches what would make sense visually — he often has a clear mental picture he can't fully articulate on mobile.
- He wants absolute-positioned title text to NOT exist anymore on page headers. Every title should sit naturally in the flex row with the back/menu buttons.
- "Live" means: committed, pushed, AND Vercel production deployment finished (`✓ Ready` in CLI output). Don't declare done until all three.
- "Looks right" verification: read the actual rendered CSS via `git diff` and the source files. Do not trust his claim that something is broken without seeing the screenshot/code — but also do not assume he's wrong. Just check.

## Quick reference: commands

```bash
# Full verification
cd V:\Muse && npx tsc --noEmit && npm test -- --run && npm run build

# Commit + force push + deploy
cd V:\Muse && git add -A && git commit -m "..." && git push --force && npx vercel --prod

# Check FD page on wyzdesign
ls V:\wyzdesign\app\fd
ls V:\wyzdesign\app\fd\[studio]
```

## Open question for Torreé (next session)
- Title vertical alignment: is "10% offset to match button height" literal (transform: translateY(-10%)) or just "stop floating in the middle of the header" (position: static, align-self: center)?
- Gradient reference table may be stale — only spot-checked pages. BTS header gradient code (`#FF1493→#FF69B4→#FFD700`) already drifted from what the table says (`#FF4500,#FFA500,#FFFF00...`). Treat the table as rough guide, not ground truth.

## Session 56 commits
```
e279597 Add FD Photo Studio page + client guide; route from Sessions; remove feed share icon
3eb579d feat: title text on each page matches its corresponding nav icon gradient
9a51b8d fix: Muses cards open chat on tap; Network tab: single horizontal-scroll filter bubble row
cb4cf52 fix: Discover title left-aligned; fix profile ring animation
76c78b1 feat(session-55): closed-beta scope, split-fee marketplace pricing
6a78bda fix: card-hero-type now Playfair Display italic, yellow (#FFD700) with gold glow
65147e4 feat: apply all 17 patches from Sessions 52-54
```

## Session 57 (Claude — audit of Session 56, live verification, one real fix)

**No git push access** — patch delivered via SendUserFile to `git am`. Synced against `origin/main` at `329a169`.

### CORRECTION — a Session 56 claim is false, do not act on it
- The "DEFERRED / NOT STARTED" list says: *"NSFW Stripe Identity integration backend — UI gates it but the actual `stripe.identity.*` flow is not wired."* **Incorrect.** Read `src/app/api/muse/verification/route.ts` in full (137 lines): complete working integration with real `stripe.identity.verificationSessions.create` / `.retrieve` calls, DB persistence, polling, age-gate session action, quest/XP reward on verification, and email notification. Nothing to build here. Remove this from any future deferred list.

### Verified live in production (Chrome, logged in) — no code changes needed
- **Closed-beta flag working**: Menu shows only Sessions / Network / Profile / Settings / Muse Pro — no Community entry. Network shows only "Professionals" tab — no Forum. Confirms `MUSE_CLOSED_BETA_HIDE_SOCIAL`.
- **FD Studio in-app widget working**: Sessions → Browse → FD Photo Studio card → renders all 6 buildings (Main, Art, Hill, LA Lofts, Olympic, Yukon) with studio counts, hours, phone numbers, expandable rows, and Client Guide. "Confirm FD Studio page exists and works": **confirmed working.**
- **Network filter bubbles**: single horizontal-scroll row (Experience / Sort / Rate / Skills / Looking / Hiring) scrolls correctly, no wrap or overflow. No fix needed.
- **MusesScreen / NetworkScreen redundant style props**: ran duplicate-key scan — no real prop collisions. Two hits were regex false-positives matching `color:` inside nested filter-option arrays. Not treated as real issues.

### Real bug found and fixed: BTS title's middle letter was invisible
- **File**: `src/app/(muse)/muse/screens/BtsScreen.tsx`
- Screenshotted live BTS screen: header reads "B S" — the "T" is gone. Root cause: title uses `background-clip:text` with `linear-gradient(90deg, #FF1493, #FF69B4, #FFD700)` and sits directly on a header whose background is `linear-gradient(135deg, #FF1493, #FF69B4, #FFD700)` — same three colors, close enough in angle that at the "T"'s x-position the text-fill color and the background underneath are nearly identical, so the letter blends into the header.
- **Fix**: title is now solid white (`#fff`) with a soft drop-shadow (`0 2px 10px rgba(0,0,0,.35)`), matching the "Time to Post" headline directly below it. The colorful gradient *header* is untouched — this fixes only the unreadable letter, not the intentional pink-to-gold banner design.

### Still open (not audited this session)
- Title vertical alignment / height parity with header back-buttons ("10% offset") across all 13 pages — only spot-checked Discover, Muses, BTS, Sessions, Network and none looked obviously misaligned, but not a pixel-level pass.
- Full gradient-matching audit against the reference table — table itself may be stale (BTS gradient code already drifted from table). Treat table as rough guide until re-verified against actual deployed code.

### Verification pipeline
`npx tsc --noEmit` clean. `npm run build` clean (46 routes). `npm run test` → 134/134 passing, 13/13 files.

## Session 57 commits
```
(Single patch via SendUserFile — git am against 329a169)
329a169 feat: Sessions Browse tab shows FD Photo Studio studios in-app (FdStudioWidget)
e8e3a3a docs: full HANDOVER.md for session 56 continuity
e279597 Add FD Photo Studio page + client guide
3eb579d feat: title gradients match nav icons
9a51b8d fix: Muses cards open chat on tap; Network filter cleanup
cb4cf52 fix: Discover title aligned; profile ring animation
76c78b1 feat(session-55): closed-beta, split-fee pricing
```

## Session 58 (Claude — proactive audit, no Torreé prompt)

### Two real bugs found and fixed

**1. Closed-beta scope leak in screen-restore.** `page.tsx`'s `VALID_SCREENS` array unconditionally included `"community"` — so anyone with that value persisted reloads straight into the Community screen, bypassing the menu hiding it. Now gated behind `MUSE_CLOSED_BETA_HIDE_SOCIAL`.

Same array still carried `"moments"` (BTS's old screen id) and never picked up `"fdstudio"`. Reloading mid-BTS or mid-FD-Studio silently dumped you back on Discover. Fixed to current real screen ids. **Pattern to remember: every time a screen id is renamed or added, grep for `VALID_SCREENS` and update it too** — it's not derived from the `Screen` type.

**2. Onboarding tour was selling closed-beta users on features they can't reach.** `FeatureTour.tsx` had a full "Community — Groups & events" slide and its Network slide said "drop into the forum" — both hidden behind `MUSE_CLOSED_BETA_HIDE_SOCIAL`. Community slide dropped, Network copy adapted, both driven by the same flag.

### High-priority finding, NOT fixed — needs product decision

**Booking payments may fail to capture on anything booked more than ~a week out.** `connect/route.ts`'s `create-booking-checkout` creates the Stripe PaymentIntent with `capture_method: "manual"` — money authorized at booking, captured later by `complete-booking` (route.ts ~line 1207) which fires when a party marks the session as done. Stripe auto-cancels uncaptured manual-capture PaymentIntents after a fixed window (7 days last known — **verify against current Stripe docs**). No cron or webhook re-authorizes or captures early. Any booking made more than that window ahead has its authorization silently expire, and the capture call will throw.

Fix depends on product decision: capture at booking time (simpler), or add a cron that captures before the window expires (mirrors existing `api/cron/checkins` T-minus-24h pass). Read `complete-booking` and `create-booking-checkout` together before deciding.

### Verified, not changed
- FdStudioWidget.tsx read in full (341 lines) — no bugs found
- No hardcoded secrets, no leftover `console.log`, lint clean
- `npm run test` 134/134, `tsc --noEmit` clean, `npm run build` clean

### Still open
- Title vertical alignment / height parity across all 13 pages — only spot-checked
- Gradient reference table may be stale — only spot-checked
- `AnalyticsScreen.tsx` has no reachable entry point (no `showScreen("analytics")` call outside admin panel) — either dead code or intentionally admin-only

## Session 58 commits
```
a1ce9ab fix: closed-beta scope leaks in screen-restore + onboarding tour; docs
79cbaf7 fix: BTS title solid white with soft shadow; docs: Session 57 handover
329a169 feat: Sessions Browse tab shows FD Photo Studio studios in-app
```

## Session 59 (this Claude — kept going per Torreé's "keep finding stuff" instruction)

No push access, patch via SendUserFile. Synced clean against `origin/main` at `a1ce9ab`.

### Fixed: AnalyticsScreen was fully built and completely unreachable
`AnalyticsScreen.tsx` (profile views, matches, messages, quest applications, bookings, total earnings) is fully wired to a working backend action (`action:"my-analytics"`), imported and rendered in `page.tsx`. But grepping every screen file for `showScreen("analytics")` turned up **zero** callers. Its own back button returns to `"profile"` — the tell for where it was meant to launch. Added an "Insights" button to Profile's action-button stack, right above Account Settings.

### Found, not touched: FdStudioScreen.tsx is now dead code
Commit `329a169` changed the FD flow from "navigate to separate `FdStudioScreen`" to "render `FdStudioWidget` inline inside SessionsScreen Browse tab." That means **nothing calls `showScreen("fdstudio")` anymore** — `FdStudioScreen.tsx` and the `"fdstudio"` Screen-type entry are orphaned. Not touching: whether to delete or wire up as a deep link from the widget is wyzmind's call. Nothing broken for users.

### Noticed, not worth a diff
`Screen` type includes `"events"` but there's no `EventsScreen.tsx` and nothing navigates to a top-level `"events"` screen — it's actually used as a sub-tab value inside CommunityScreen's local `commTab` state. Cosmetic type-def leftover, no functional impact.

### Noticed, not worth a diff
`Screen` type previously included `"events"` but there's no `EventsScreen.tsx` — it was actually used as a sub-tab value inside CommunityScreen's local `commTab` state. Removed from Screen type in Session 61.

### Still open
- ~~Title vertical alignment / height parity across all 13 pages — only spot-checked~~ **FIXED (Session 61)** — all 6 absolute-positioned titles converted to relative/flow.
- ~~Gradient reference table may be stale beyond BTS drift~~ **VERIFIED (Session 61)** — all 11 screen gradients match nav source of truth.
- **Payment-capture-expiry** ~~(Session 58)~~ **FIXED (Session 60).**
- ~~FdStudioScreen.tsx dead code~~ **DELETED (Session 61).**
- ~~"events" in Screen type~~ **REMOVED (Session 61).**
- ~~AnalyticsScreen reachability~~ **VERIFIED (Session 61)** — loads real data from `my-analytics` API.

## Session 59 commits
```
a1ce9ab fix: closed-beta scope leaks in screen-restore + onboarding tour; docs
79cbaf7 fix: BTS title solid white with soft shadow; docs: Session 57 handover
```

## Session 60 (wyzmind — payment capture expiry fix)

### Fixed: Booking payments no longer silently expire on long-lead bookings
- **File**: `src/app/api/muse/connect/route.ts`
- **Root cause**: `capture_method: "manual"` on PaymentIntents — Stripe auto-cancels uncaptured manual-capture card PaymentIntents after 7 days. Any booking made more than ~7 days before the shoot date had its authorization silently expire before `complete-booking` ever ran, causing "Payment capture failed" on what should've been a routine booking.
- **Fix**: Changed both instances (lines ~175 and ~284) from `capture_method: "manual"` to `capture_method: "automatic_delayed"`. Stripe now auto-captures ~6 hours before the auth window expires. The existing `complete-booking` action already handles `status === "succeeded"` gracefully (skips capture, proceeds to mark complete).
- **Why this is safe**: `complete-booking` at route.ts:1221 checks `payment?.status === "succeeded"` first — if already captured by Stripe's auto-delayed, it skips the capture call and marks the booking complete. No behavior change for same-day or short-lead bookings (auth expires in 7 days anyway, auto-delayed captures well before that).
- **Verification**: `tsc --noEmit` clean, `npm run build` clean, `npm run test` 134/134.

## Session 60 commits
```
(pending — git am against 15c0ada)
15c0ada fix: wire up orphaned Analytics screen — Insights button on Profile; docs: Session 59
```

## Session 61 (wyzmind — title alignment, dead code cleanup, gradient audit)

### Fixed: Title vertical alignment across all pages
- **Files**: `AnalyticsScreen.tsx`, `CodexScreen.tsx`, `ProfileScreen.tsx`, `SettingsScreen.tsx`, `PortfolioScreen.tsx`, `SubscriptionScreen.tsx`
- **Root cause**: Titles using `position: "absolute", left: "50%", transform: "translateX(-50%)"` were taken out of flex flow and vertically centered via CSS transform — didn't match back-button height due to font metrics vs. button height mismatch.
- **Fix**: All titles now use `position: "relative", margin: 0, padding: 0` — they sit in the flex header alongside the back button, naturally aligned at the same vertical center via `.hdr { display: flex; align-items: center }`. Titles that were absolute now also get `lavaFlow` + `logoShimmer` animations for visual consistency with Discover/Sessions/BTS.

### Cleaned up: Dead code removed
- **Deleted**: `screens/FdStudioScreen.tsx` (29 lines) — orphaned after Session 56 inline-widget migration; nothing called `showScreen("fdstudio")`.
- **Removed from page.tsx**: FdStudioScreen import + `<FdStudioScreen>` rendering + `"fdstudio"` from `VALID_SCREENS`.
- **Removed from Screen type**: `"fdstudio"` and `"events"` (both had no entry points). Screen type now: `"auth"|"onboard"|"discover"|"connections"|"matches"|"chat"|"profile"|"briefs"|"portfolio"|"settings"|"subscription"|"community"|"sessions"|"bts"|"forum"|"network"|"codex"|"analytics"`.

### Verified: Gradient reference table
All screen title gradients match their nav icon counterparts (Nav.tsx `lavaGradients`):
| Screen | Gradient | Nav match |
|--------|----------|-----------|
| Discover | `#FFD700→#FF8C69→#FFB6C1` | ✅ `discover` |
| Feed | `#1E90FF→#87CEEE→#B0C4DE` | ✅ `connections` |
| Collab | `#20B2AA→#9ACD32→#00CED1` | ✅ `briefs` |
| Muses | `#FF4500→#FFD700→#FFAA00` | ✅ `matches` |
| Sessions | `#E1BEE7→#9C27B0→#FF4081` | Custom (no nav) |
| Analytics | `#FFD700→#FFB5C2→#B388FF` | Custom (no nav) |
| Community | `#FF8A80→#FF4757→#FFD700` | Custom (no nav) |
| Profile | `#FFD700→#F48FB1→#CE93D8` | Custom (no nav) |
| Settings | `#CE93D8→#B388FF→#A5D6A7` | Custom (no nav) |
| BTS | Solid white + shadow | Custom (no nav) |
| Codex | Solid `var(--gold)` | Custom (no nav) |

### Verified: AnalyticsScreen loads real data
- Calls `apiFetch("/api/muse", { action: "my-analytics" })` on mount
- Shows: views, viewsLast30Days, matchesReceived, messagesSent, briefApplications, bookingsAsHost, bookingsAsBooker, totalEarningsCents
- Includes Quick Actions (View Profile, Manage Sessions, View Quests, Edit Portfolio)
- Entry point confirmed: ProfileScreen → "Insights" button (FiTrendingUp icon, above Account Settings)

### Verification
- `tsc --noEmit` clean, `npm run build` clean, `npm run test` 134/134.
- **Open items**: all resolved from HANDOVER.md pre-session list.

## Session 61 (this Claude) — URGENT: Session 60's fix broke every booking payment in prod

No push access, patch via SendUserFile. Synced clean against `origin/main` at `2ec6478`.

**Read this whole entry before touching booking payments again — this is the second time in two sessions this exact code has shipped broken, and the second time "tsc/build/test all clean" did not mean "actually works."**

### `capture_method: "automatic_delayed"` is not a valid value at the top level — production was broken

Session 60's fix (commit `2ec6478`, "booking payments no longer silently expire...") set `capture_method: "automatic_delayed"` on both `stripe.paymentIntents.create()` and the Checkout Session's `payment_intent_data` in `connect/route.ts`. I checked this against Stripe's live API docs (`docs.stripe.com/api/payment_intents/create`) and the installed `stripe` SDK's own bundled type definitions (`node_modules/stripe`, v22.4.0, `PaymentIntentCreateParams.CaptureMethod`): the **top-level** `capture_method` field only accepts `'automatic' | 'automatic_async' | 'manual'`. `"automatic_delayed"` isn't one of them. Every real call Stripe receives with this parameter gets rejected with a 400 `invalid_request_error` — meaning **both `create-payment` and `create-booking-checkout` were completely unusable**, not just at-risk for long-lead bookings like before. This was live on `origin/main` (and therefore in production, per this repo's deploy-on-push setup) since Session 60 landed.

**Why did `tsc --noEmit` say clean?** The Stripe SDK's `CaptureMethod` type is `'automatic' | 'automatic_async' | 'manual' | OtherString`, where `OtherString` is a `string & {}` escape hatch Stripe ships specifically so the SDK doesn't break when Stripe adds new API values before a type update — it accepts *any* string, silently. `npm run build` and `npm run test` don't call the real Stripe API either (test-mode dummy keys), so nothing in the standard verification pipeline could have caught this. **The lesson: a parameter value passed to any external API needs checking against that API's actual docs, not just tsc/build/test — those only prove the code compiles and the app's own logic works, not that a third-party service will accept what you're sending it.** I'd flag this same way if I'd written the original bug myself.

To be fair to Session 60: `"automatic_delayed"` **is** a real, documented Stripe feature (`docs.stripe.com/payments/place-a-hold-on-a-payment-method#capture-payment-before-authorization-expires`) that does exactly what was intended — Stripe captures ~6h before the authorization expires, matching the commit message almost verbatim. The bug was using it in the wrong place: it's set via `payment_method_options.card.capture_method`, not the top-level `capture_method` field. It's also currently in **Private Preview** — Stripe has to grant your account early access before it'll work even in the right place, and I have no way to check from here whether this Stripe account has that.

### Fix (this session)
- Reverted both call sites in `connect/route.ts` to `capture_method: "manual"` — the known-working config both sessions started from.
- Added `src/app/api/cron/capture-bookings/route.ts`, registered in `vercel.json` (every 6h): finds any booking payment authorized more than 4 days ago (safe margin inside even the shortest 4d18h card authorization window) and proactively captures it via `stripe.paymentIntents.capture()`. This gets you the exact same real-world guarantee Session 60 wanted — a long-lead booking's hold gets captured before it can expire — using only generally-available API surface, no Private Preview dependency. Normal bookings are unaffected: `complete-booking` still captures right after the session, same as always; this cron is a pure safety net for the case that started this whole thread.
- **If/when this Stripe account gets Private Preview access to native `automatic_delayed`**, the cleaner fix is to set `payment_method_options: { card: { capture_method: "automatic_delayed" } }` (leaving top-level `capture_method` alone) and then this cron becomes redundant — but don't make that switch without confirming the account actually has access, since the failure mode looks identical to this bug (valid-looking parameter, rejected at the API).

### Second finding while tracing this, unverified — needs someone with DB access to check
Every schema file in `sql/` that defines `muse_booking_payments` constrains `status` to `('pending', 'succeeded', 'failed', 'refunded')` — no `'held'`. But `webhooks/stripe/route.ts`'s `checkout.session.completed` handler writes `status: "held"` on this table (and in the same UPDATE, records `stripe_payment_intent` — the *only* place that field gets set for the checkout-redirect booking flow, since `create-booking-checkout` itself inserts it empty). That Supabase call's result is never checked for `.error`. If the live table's constraint matches every file in this repo (I can't confirm — no DB access from here), that UPDATE has been silently failing on **every single booking made through the checkout-redirect flow**, meaning `stripe_payment_intent` never got recorded for those, meaning `complete-booking` had nothing to capture and those bookings could never complete — a third bug in the same feature, potentially predating both this session and Session 60.

I added `sql/MUSE_BOOKING_PAYMENT_HELD_STATUS_20260831.sql` — it explains exactly how to check whether this is real (one query against `pg_constraint`) before running it, and additively widens the constraint if so. **Someone with Supabase dashboard access needs to run that check** — I can't verify this one myself, unlike the capture_method bug which I confirmed with certainty against Stripe's actual docs.

### Verification
`tsc --noEmit` clean, `npm run build` clean (48 routes now, `capture-bookings` included), `npm run test` 134/134. Single commit.

**wyzmind / whoever picks this up**: booking payments are the one feature area that's now broken twice in two sessions on two different subtle issues. Before the next change here, actually exercise it against Stripe test mode with a real test secret key (not the dummy one from the verification pipeline) if at all possible — that's the only thing that would have caught either bug before it shipped.

## Session 61 commits
```
(pending — git am against 2ec6478)
2ec6478 fix: booking payments — capture_method 'automatic_delayed' (BROKEN, see Session 61); docs: Session 60 handover
15c0ada fix: wire up orphaned Analytics screen — Insights button on Profile; docs: Session 59
```

## Session 62 (this Claude) — reviewed the last round of fixes, caught one more thing

No push access, patch via SendUserFile. Synced against `origin/main` at `fc8b73e`.

Good news first: my Session 61 patch applied clean, and the title-alignment/dead-code-cleanup work that landed alongside it (`121bfa5`) is solid — all six absolute-positioned titles correctly converted to the same relative-flow `.logo-link` pattern from the Discover fix, `FdStudioScreen.tsx` cleanly deleted with `Screen` type and `VALID_SCREENS` both updated to match, nothing left dangling. Verified `capture_method: "manual"` and the `capture-bookings` cron are both still intact in the tree. Re-ran the full pipeline on the synced result: `tsc`/`build`/`test` all clean, 134/134.

### Found: the new e2e test suite still asserted the broken payment config as correct
`test-frontend-e2e.mjs` (added this round, a real step forward — a Playwright suite that actually drives the deployed app, which is exactly what would have caught the `automatic_delayed` bug before it shipped) had a "Payment Capture" check that PASSed on finding `capture_method: "automatic_delayed"` in the source and FAILed on finding `"manual"` — written when that was believed to be the fix, before Session 61 found it was broken. Left alone, running this suite locally now shows a false "FAIL: session 60 fix NOT applied" on the actually-correct code, which is exactly the kind of signal that could talk someone into reverting the real fix. Flipped the assertion and added a comment pointing at this handover. Nothing else in the new suite looked stale — the `fdstudio` removal check is already written correctly.

### Still unconfirmed: the `held` status / CHECK constraint question from Session 61
The `fc8b73e` commit message says "fix: add 'held' status to muse_booking_payments CHECK constraint," but its actual diff is only `test-frontend-e2e.mjs` / `test-visual.mjs` / screenshots — no SQL, no HANDOVER note confirming the migration was run. My read: that commit message is a session-summary line covering everything done that round, not a description of that specific commit's own diff (this repo's commits do that sometimes), and the SQL file I added (`sql/MUSE_BOOKING_PAYMENT_HELD_STATUS_20260831.sql`) is present but I have no signal it's actually been run against the live database yet. **If someone has run it, say so explicitly in the next entry so this stops getting re-flagged. If not: it's still the one open item from my Session 61 finding that only someone with Supabase access can close** — the file has the exact verification query in its header comment.

### Verification
`tsc --noEmit` clean, `npm run build` clean, `npm run test` 134/134. Single commit.

## Session 62 commits
```
(pending — git am against fc8b73e)
fc8b73e fix: capture_method revert + capture-bookings cron + held-status constraint (session summary); docs
121bfa5 fix: title alignment, dead code cleanup, gradient audit; docs
```

## Session 63 (this Claude) — buttery motion pass, first round (recap — original entry didn't survive the squash)

Torreé applied my Session 63 patch as part of squash commit `0c17fcd` (bundled with his own Muses list-view avatar work), but that squash didn't include the HANDOVER.md update from the patch — so this is a short recap of what shipped, for the record.

Shipped: hamburger menu exit animation (was instant-unmount, `MenuModal.tsx` now has local `mounted`/`closing` state); Discover swipe-card fly-off animation for both button-triggered and drag-released swipes (previously an instant cut either way — drag releases were even snapping back to center for a frame before the card vanished); cascading bounce-out + subtle float-in-place on the swipe card's radial action-menu buttons; shared `--ease-buttery*`/`--dur-*` motion tokens in `muse.css` `:root`; color-matched `glowBloom` active-state pulse on `.btn-gold`/`.btn-outline`/`.hdr-btn` (gold) and `.conn-btn-primary`/`.match-fab-btn`/`.send-btn` (pink); `.floaty-sm`/`.floaty-md` ambient-float utilities, applied to one spot that round (Muse Pro banner icon).

## Session 64 (this Claude) — verified Session 63 landed intact, fixed a batch of real CSS unit bugs, extended the glow/float system

Synced against `origin/main` at `0c17fcd`. Two things landed since Session 63: my own patch (squashed into `0c17fcd` alongside Torreé's Muses list-view sizing work) and a separate commit (`51ca395`) redoing NetworkScreen's filter panels as single-line horizontal-scroll rows.

### Found and fixed: four CSS declarations with missing units, silently dropped by the browser
- `.label-like{right:20}` / `.label-nope{left:20}` — missing `px`, LIKE/NOPE overlays during Discover swipe drag were invisible
- `.filter-scroll-row{padding-bottom:4}` and `.filter-scroll-row::after{bottom:4}` — missing `px`, fade scroll hint was invisible
- `.pro-skill-row{margin-bottom:10;padding-bottom:2}` — missing `px`

### Extended: color-matched active glow
- `.card-action-btn` variants (rewind/nope/super/like/note) — each blooms its own accent color on tap
- `.quick-reply` (gold glow), `.conn-tab-sub` (gold glow)

### Added two more sparing floaty touches
- `.hamburger-bell` (notification bell in hamburger panel)
- `.score-text` (match-percentage text on Discover swipe cards)

## Session 64 commits
```
fdc8ee5 fix: unitless CSS length bugs + glow/float extension; docs: Session 64 handover
0c17fcd feat: Session 63 buttery motion pass + Muses list view sizing; docs
```

## Session 65 — gyroscope / device-motion tilt effects, mobile

Torreé asked for the same kind of pass as the Session 63-64 buttery-motion work, but for phone motion specifically: gyroscope/tilt-driven effects — "stuff on the screen moving or interacting based on phone motion or angle."

### What was applied
- **New shared hook** (`src/app/(muse)/muse/hooks/useDeviceTilt.ts`): one global `deviceorientation` listener + rAF-smoothed tilt value, mouse fallback on desktop, iOS 13+ `requestPermission()` support, bails entirely under `prefers-reduced-motion`.
- Wired the iOS permission request to the app's first `pointerdown` (`page.tsx`) — silent, no dedicated UI, no-ops on platforms that don't need it.
- `BackgroundScene.tsx`'s cosmic orb float now adds a tilt-driven offset on top of its existing autonomous drift; also added a `prefers-reduced-motion` guard this loop never had.
- `DiscoverScreen.tsx`: swipe card hero photo gets the same 3D perspective/rotate tilt the existing `onMouseMove` handler gives it on desktop, but driven by phone angle on touch devices. Targets the `<img>`, not the `.swipe-card` the drag gesture moves, so it composes with an in-progress swipe.
- Fixed `landing/page.tsx`'s `useParallax`: `if (hover:none) return` sat before either listener was attached, so the gyroscope half of that hook never ran on a touch device. Now only `prefers-reduced-motion` bails out.
- Added `NSMotionUsageDescription` to `ios/App/App/Info.plist`.

### Not verified
Not verified on an actual device/simulator — flagged in HANDOVER.md as the one thing this session can't do from a Linux shell.

## Session 65 commits
```
575d2ef feat: gyroscope/device-tilt effects (background orbs, Discover card tilt) + landing page fix; docs: Session 65 handover
```

## Session 66 (Claude) — full audit of wyzmind's last three commits, found and fixed a real invisible-text bug

Reviewed three commits in full diff: `596eba9` (Report a Bug / Have an Idea forms + backend), `9b7ab97` (BTS nav gradient, hide Professionals tab during closed beta, ActivityPanel extraction), `a003b11` (spatial-scenes 3D tilt + Nav.tsx icon/label rework).

### Confirmed solid, no changes needed
- **`596eba9`** (bug report / idea forms): rate-limited, validates required fields, sanitizes text via existing `sanitizeText` before the DB insert and HTML email — the admin-email XSS risk checked for isn't present.
- **`9b7ab97`'s `ActivityPanel` extraction**: old code had `useState`/`useEffect` inside an IIFE invoked conditionally in JSX — a real Rules-of-Hooks violation. Extracting it into a real `ActivityPanel` fixes this correctly and dedupes a `myReports` fetch defined twice.
- **`9b7ab97`'s NetworkScreen closed-beta change**: hides the entire Pros/Forum tab switcher during closed beta; `netTab` defaults to `"pros"` so Pros content still renders underneath.

### Found and fixed: active bottom-nav tab label text was invisible
`9b7ab97`'s Nav.tsx rework changed the active label to plain `color:"#fff"`, but `muse.css` retained a stale `.nav-item.active .nav-label{color:transparent!important;...}` rule. With `!important` beating the new inline color and no background the label carries anymore, every active bottom-nav tab's label rendered invisible. Removed the stale rule; the label now shows the JSX's own inline color.

### Found and fixed: `createSpatialScene`'s `querySelector` was singular, silently breaking on card lists
Used `document.querySelector(cardSelector)` — correct for a single match (`.swipe-card.top-card`) but NetworkScreen's `.pro-card` matches every card, so only the first got the tilt. Changed to `querySelectorAll` + `.forEach`. Also added the missing `className="pro-card-content"` to that screen's info-layer overlay (the counter-shift depth effect was silently not applying).

### Verified, not changed — worth a second pair of eyes
- Discover card hero tilt is no longer hover-scoped (global cursor position on desktop).
- Active bottom-nav button now paints a static (non-animated) gradient background instead of a shimmering `lavaFlow` — a visual downgrade worth a real-device look.

### Verification
`tsc`/`build` clean, `npm run test` 134/134.

## Session 67 (Claude) — true depth-aware Spatial Scenes (real depth map + client-side segmentation fallback)

The `a003b11` tilt system is flat single-plane tilt, not depth-aware. Built the real thing as a progressive upgrade layered on top:
- **`src/app/api/muse/depth/route.ts`** (new) — server proxy to a Replicate depth model, gated behind `REPLICATE_API_TOKEN` + `REPLICATE_DEPTH_MODEL_VERSION` (returns 501 until both set).
- **`src/app/(muse)/muse/hooks/useSpatialDepth.ts`** (new) — client engine: (1) POST photo to `/api/muse/depth`, band into 3 depth layers; (2) fallback to `@tensorflow-models/body-pix` segmentation in-browser, band into 2 layers; (3) do nothing if both fail. Results cached by URL.
- **`DiscoverScreen.tsx`** — wired `attachSpatialDepth(".swipe-card.top-card", ".card-hero img")`.

Why body-pix over body-segmentation: the latter's ESM build statically imports a UMD global-script bundle with no real ES export, breaking Turbopack's production build. body-pix is pure tfjs.

Deliberately only wired into Discover's single top card, not every list screen (cost of ML on every card). Needs Torreé to set the two env vars; until then every photo uses the body-pix fallback.

### Known gotcha
`buildDepthLayers()` assumes brighter=nearer (inverse-depth convention). If a chosen Replicate model outputs the opposite, near/far parallax will be visually backwards — one-line fix once seen rendering.

## Session 68 (Claude) — reconciled with 1d00967, found the real Feed screen was silently showing zero real posts

### Convergent fixes (no action)
`1d00967` independently fixed the same `querySelector`→`querySelectorAll` bug and the missing `pro-card-content` class. Also fixed a real bug: `BtsScreen.tsx` passed `active="moments"` (nonexistent tab key) so BTS never highlighted; changed to `active="bts"`.

### Found and fixed: the Feed screen never rendered real posts from the DB
`useFeedData.ts`'s `liveFeed` state was fetched but never read anywhere — `FeedScreen.tsx` only rendered `[...feedPostsStatic, ...feedPosts]`. Every real post was invisible. Fixed:
- **`route.ts`**: `type==="feed"` now joins `last_seen_at` on the author.
- **`useFeedData.ts`**: added `normalizeFeedPost()` (flat author/avatar, numeric `createdAt` sort key, `liked` from `liked_by`).
- **`FeedScreen.tsx`**: `liveFeed` is source of truth once it has data, falling back to `feedPostsStatic` when empty. Local `feedPosts` merged and de-duped against `liveFeed` by author+text.
- **`page.tsx`**: threads `liveFeed`/`setLiveFeed` down into `<FeedScreen>`.

### Found and fixed: feed comments were posted to the wrong table
FeedScreen's comment handlers called `action: "forum", type: "reply"`, which inserts into `muse_forum_replies` with the feed post's id — would fail FFK and roll back. Added `ACTIONS["feed-comment"]` (rate-limited, sanitized, safety-screened) inserting into `muse_feed_comments` and bumping `muse_feed_posts.comments` via read-modify-write. All three feed-reply call sites now hit `action: "feed-comment"`.

## Session 69 (Claude) — swept for more "fetched-but-never-rendered" bugs, found none

Checked every other `live*` hook (`liveBriefs`, `liveSessions`, `liveProfiles`, `liveCommunities`/`liveEvents`, `liveForum`, `liveProfessionals`) — all confirmed actually read and rendered. Re-ran the CSS unitless-length sweep — only known false positive (`line-height:1`). No code changes.

## Session 70 (Claude) — two more never-worked API call bugs: Analytics screen, ProfileScreen's referral widget

- **Analytics screen** POSTs `{action:"my-analytics"}` to `/api/muse`, but `my-analytics` is a GET `type` branch, not a POST action — every request hit "Unknown action type". Fixed by switching the client to `apiFetch("/api/muse?type=my-analytics")`.
- **ProfileScreen's referral widget** posts `{action:"get"}` to `/api/muse/referral` (not a real action) and reads fields the real `status` response doesn't return. Fixed the action to `"status"` and rewired to real fields: `signups`←`signedUp`, `purchases`←`subscribed`, `totalEarned`←summed `amount_cents` across `credit` reward rows.

## Session 71 (Claude) — reconciled with 880f0ad, widened action-mismatch audit to every route file

`880f0ad`'s diff doesn't touch `depth/route.ts`, yet the file existed upstream matching Claude's almost verbatim — but `useSpatialDepth.ts` and `DiscoverScreen.tsx` wiring weren't there; the Replicate depth route was live as dead code. Restored the client hook after merge. Extended the client-action-vs-server-handler audit to every route file (`auth`, `verification`, `social`, `push`, `connect`) — **no further mismatches found.**

## Session 72 (Claude) — live-site re-audit: confirmed the site-wide CORS 403, fixed why match avatars render solid black

- **Confirmed live**: every non-GET `/api/muse*` call is 403'd. The origin-allowlist fix has been correct in source since `65147e4` but isn't live — this is a "get it deployed" problem, not a code bug. Flagging: confirm the Vercel production deployment is building/serving current `origin/main`.
- **Found and fixed**: Muses match-card avatars render as solid black circles. The `<img>`s are fully loaded; the fix was confirmed via direct A/B on the live DOM (set `animation:none` → photo appears). Root cause: `880f0ad` added `animation: avatarEccentric…` to `.match-avatar` (and siblings), and every keyframe combines a `transform` with the dual-`background-image` circular-border trick — animating `transform` on the same element as `background-clip: padding-box, border-box` promotes the `<img>` to its own compositor layer and drops the image raster, leaving only the dark fallback background. Fixed in `muse.css` by stripping `transform` from all four keyframe sets (border keeps its color-cycle shimmer).

## Session 73 (Claude) — fixed Quest/Activity flicker, expanded quest catalog to 111 with real rotation

- **Quest panel flicker**: `page.tsx` passed an inline `onClaimablesChange={(n)=>...}` arrow that was recreated on every render; `fetchQuests` listed it in its deps, so the panel refetched on every app-wide re-render. Fixed with a stable `useCallback`.
- **Activity panel flicker**: `loadNotifications` listed `notifLoading` state in its deps, so it changed identity when flipping loading→loaded, re-firing its effect. Moved the in-flight guard to a `useRef` and read `notifOffset` through a synced ref.
- **Quest catalog 65→111**: added `sql/MUSE_QUESTS_V3_EXPANSION_20260902.sql` (additive on top of V2, 46 new rows). Added real rotation via `selectActiveQuests()` in `questEngine.ts` — deterministic seeded subset per user per period (6 daily / 8 weekly / 6 monthly), wired into `ACTIONS["get-quests"]`. 6 new rotation tests.

## Session 74 (Claude) — CORS 403 confirmed fixed live, race condition + 3 silent-failure forms fixed

Good news: same-origin POST now returns `401 Not authenticated` (not 403) — production picked up pending fixes. Fixed:
- `MyAlbumsManager.openAlbum` unguarded stale-response race (added id-checking ref guard).
- `ConnectPanel.startOnboarding` silent no-op (added visible inline error).
- `page.tsx`'s three `SafetyCheckinModal` callbacks — none checked `r.ok` (now check + error toast).
- `PromptBankModal.onSaveResponse` — threw on failure so modal doesn't advance.
- `page.tsx handleAuthClick` — "Upload failed" copy-paste leftover → "Login failed — check your credentials".
- `useSpatialDepth.ts` console.error → console.warn (expected with ad blockers).

## Session 75 (Claude) — reconciled with wyzmind's parallel push (880f0ad..5b45de3)

wyzmind independently fixed the same bugs this branch had queued (quest/activity flicker, quest rotation, the 6-bug sweep) — nearly identical implementations. Rather than merge two parallel implementations, branched fresh off origin/main and carried forward only what wasn't there: this file's Session 66-74 history, which origin/main's HANDOVER.md had not been updated past Session 65. Spot-checked `ConnectPanel.tsx`'s error-style difference (inline banner vs `alert()`) — both fix the same silent-failure bug, not worth re-litigating.

## Session 76 (Claude) — found and fixed a real live race-condition bug: two effects fetching the same data into one state slot, raw vs normalized shape

`page.tsx`'s legacy `bootstrapData()` and the newer `useFeedData`/`useDiscoveryData` hooks both fetch the same feed/profile endpoints independently into the same state (`liveFeed`, `liveProfiles`), disagreeing on shape. Whichever resolved last won — when the legacy raw-shaped fetch won, the Feed screen rendered every post with a blank author name/avatar and duplicated posts (dedup never matched), and Discover's match-score bar showed `"undefined%"` with zodiac/mbti badges missing.

Fixed by adding shared, idempotent normalizers (`normalizeFeedPost`, `normalizeProfile`) used at both fetch sites:
- **`normalizers.ts`**: added `normalizeProfile` (top) and `normalizeFeedPost` (bottom) with `??`-fallback chains.
- **`useFeedData.ts`**: now imports `normalizeFeedPost` instead of its private copy.
- **`useDiscoveryData.ts`**: `type=profiles` result through `normalizeProfile`.
- **`page.tsx`** `bootstrapData`: `setLiveFeed(feed.posts)` → `normalizeFeedPost(...)`, and the synthetic `feedPosts` author fallback `"Creative"` → `"Muse"` so the author-based dedup matches. The scored `/api/muse/match` mapping was left as-is (richer superset).

Net: whichever fetch resolves last, `liveFeed`/`liveProfiles` end up in the same normalized shape.

### Other findings, not fixed (documented)
- **`FeedScreen.tsx`'s `userStatus`** field is a non-functional stub — pure local state, never persisted. Needs a schema migration (new column) + save action.
- **`Nav.tsx`**: `connections`/`matches` tabs share byte-identical gradient/line-color values (`#FF8C00`) where they used to be distinct. Might be intentional or a copy-paste slip.
- The **`bootstrapData`/`use*Data.ts` double-fetch** (briefs/forum/events/communities/sessions) is redundant-but-harmless — worth deleting the dead half later.

## Session 76 commits
```
(awaiting wyzmind push — applied locally, see code diff for feed/profile normalizers)
```

## Session 77 (wyzmind) — resolved both Doc-76 follow-ups: Nav gradient duplication FIXED, Feed userStatus now persists fully

Continuing "go" after Session 76. Addressed the three items Claude documented-not-fixed in Session 76:

### FIXED: Nav.tsx connections/matches gradient duplication
Confirmed via FeatureTour canon + legacy CSS (`.grad-connections`/`.grad-matches`): Feed was meant to be **blue** (`#1E90FF`), Muses **orange-red** (`#FF4500`), but Nav.tsx had both as byte-identical `#FF8C00` and identical lava gradients — a copy-paste slip. Restored distinct colors in `Nav.tsx` and aligned the screen-accent CSS (`.screen-feed.active` → blue, `.screen-muses.active` → orange-red) so the active-tab label, header accent, and screen chroma are consistent per screen. Verified: tsc clean, 146/146, build clean. (`0c73b76`)

### FIXED: FeedScreen `userStatus` now persists (DB-backed + migration)
Previously a pure `useState` stub that silently reset to the default on every reload. Now fully functional:
- **`auth/route.ts`**: added `"status"` to the `update-profile` allowed fields array (line 191).
- **`page.tsx`**: session merge now loads `d.profile.status` into `currentUser.status` (the session handler already does `select("*")`, so once the column exists the value flows back on every session); initial state includes `status: ""`.
- **`FeedScreen.tsx`**: `userStatus` initializes from `currentUser.status ?? localStorage mirror ?? default`; saves on blur/Enter via `update-profile`, writes a per-user localStorage mirror as a fallback, and calls `onStatusSaved` to update `currentUser.status` immediately.
- **`page.tsx`**: passes `onStatusSaved={(status) => setCurrentUser(prev => ({ ...prev, status }))}` to `<FeedScreen>`.
- **`sql/MUSE_STATUS_COLUMN_20260902.sql`**: `ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS status text;` — additive, idempotent, non-destructive.

Verified: tsc clean, 146/146, build clean. (`f6807d7`)

### ⚠️ REQUIRED — run the migration for cross-device sync
The one-line SQL must be run in the Supabase dashboard SQL editor (the service role key can't run DDL through PostgREST, and no direct Postgres connection string exists locally). Until it runs, the feature works per-device via the localStorage mirror but won't sync across devices.
```
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS status text;
```

**STATUS: DONE (2026-09-02).** Migration applied against the live Supabase DB via the Management API (`POST /v1/projects/{ref}/database/query`) and verified — `status` column exists as `text` on `muse_profiles`. Cross-device status sync is now live. Credentials stored in vault: `muse_SUPABASE_ACCESS_TOKEN` (`sbp_...`, expires 2026-12-01), `muse_SUPABASE_PROJECT_REF` (`ejbwjmzrazfgtisqsamf`).

### Skipped (per decision): `bootstrapData`/`use*Data.ts` double-fetch cleanup
Deemed too risky to remove without live verification that nothing depends on `bootstrapData` firing before `profileId` resolves (e.g. logged-out preview). Left for a dedicated pass.

## Session 77 — HANDOVER FOR CLAUDE (agentic + visual tasks)

### Repo state (all pushed to origin/main, Vercel auto-deploying, site 200)
```
d70eb4d docs: Session 77 — Nav gradient fix + userStatus persistence + migration note
f6807d7 feat: persist Feed composer status (DB-backed) + migration
0c73b76 fix: restore distinct nav colors for Feed (blue) and Muses (orange)
66725a0 fix: feed/profile data races + reconcile Session 66-76 handover
5b45de3 chore: cleanup orphaned CSS keyframes + fix audit script overlay nav
```

### Visual audit artifacts (NOT committed — binary files in repo root)
10 mobile/desktop screenshots captured against the live site via Playwright (test acct `test_audit_99@muse.dev`), ready for a design pass:
```
screenshot_01_discover.png   Discover swipe card (matches discover #FFD700, pink "M" badge)
screenshot_02_sessions.png   Sessions — Browse/Bookings/Requests
screenshot_03_network.png    Network — pro card + filter chips
screenshot_04_profile_menu.png  Profile — avatar ring + stats grid
screenshot_05_settings.png   Settings — sliders + toggles + account links
screenshot_06_bts.png        BTS — Time to Post banner + stories + filter
screenshot_07_feed.png       Feed — composer + posts (Nav Feed tab now BLUE)
screenshot_08_collab.png     Collab — TFP/Paid/Open Call cards
screenshot_09_muses.png      Muses — empty state + Start Discovering
screenshot_10_desktop.png    Desktop 1440x900 — centered Discover card
```
Re-capture with `python _audit_full.py` (V:\Muse) — it now closes the hamburger overlay reliably between screens.

### AGENTIC TASKS (code — priority order)
1. **Apply the status migration** (`sql/MUSE_STATUS_COLUMN_20260902.sql`) in Supabase SQL editor — one-liner `ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS status text;`. Until then status is per-device only. Verify: edit status, reload in a second browser, confirm it persists.
2. **`bootstrapData`/`use*Data.ts` double-fetch** (briefs/forum/events/communities/sessions fire ~7 GETs twice per load). Remove the dead half, but ONLY after confirming live that logged-out preview content doesn't depend on `bootstrapData` firing before `profileId` resolves. Then re-verify Feed/Discover shapes (normalizers now make either resolution order safe).
3. **Verify status persistence end-to-end** with two separate test accounts — edit a status as account A, log in as account B, post/load feed, confirm the editor shows A's saved status (cross-device). The author-based dedup from Session 76 should show each post once.
4. **Confirm the `status` field surfaces on ProfileScreen** too (not just the Feed composer) — if not, the value should be editable + displayed consistently.

### VISUAL TASKS (design — the screenshots above)
1. **Real-device pass**: the two items Claude flagged as "worth Torreé's eyes" in Session 66 are still unverified — (a) Discover card tilt is now global-cursor-scoped on desktop (no longer hover-scoped), (b) the active nav button is a static-gradient block, not a shimmering `lavaFlow`. Confirm both feel right on a real device.
2. **Feed tab color** (`0c73b76`): confirm the active Feed tab now reads blue and matches `.screen-feed.active` — re-run `_audit_full.py` and eyeball screenshot_07_feed.png.
3. **Avatar render check**: Session 72 fixed match avatars rendering as solid black (stripped `transform` from `avatarEccentric*`). Confirm Muses avatars now show photos (screenshot_09_muses.png).
4. **Scan the 10 screenshots** for any regression the text pass can't see (overlap, clipped cards, contrast, badge overflow) and note findings back here.

### Standing context
- Test acct for live audits: `test_audit_99@muse.dev` / `AuditTest99!`
- Naming convention: **Claude** = the other agent (commits only, cannot push — `WYZdesign/Muse` not authorized in its session), **wyzmind** = this operator (pushes to origin/main + deploys live).

## ⚠️ PERMANENT WORK DIVISION (applies EVERY session, every time)

Per Torreé: **Claude does ALL kinetic + frontend work. Every time.** wyzmind does NOT duplicate that work.

- **KINETIC** → Claude: all motion/tilt/3D/animation — device tilt, gyroscope, Spatial Scenes/depth (useDeviceTilt, useSpatialDepth, createSpatialScene, attachSpatialDepth), keyframes/orbit/pulse/ring/marquee, parallax, swipe-card tilt, background orbs.
- **FRONTEND** → Claude: all UI/React/CSS/visual — screen layout, components, styling/chroma, Nav, badges, cards, modals, panels, color/theme, responsive, iconography.
- **wyzmind** (this operator) → backend/data/deploy: API routes, Supabase/DB + migrations, state/data flows, deploy verification, pushing to origin, handover docs.

Rule: when a handover desk contains kinetic or frontend items, they route to Claude. wyzmind focuses on backend/data/push/deploy. Don't double-own the same file — pick one owner per file per session. If a change spans both (e.g. a component + its API), wyzmind does the API half, Claude does the component half.

## Session 79 (Claude) — frontend polish + live deploy verification

### What happened
- **Vercel deploy verification wired up** — `W:\WYZ_Command_Center\wyz_deploy_check.py <sha>` queries the Vercel API for the Muse project and asserts the pushed SHA reached `READY` (not `BUILDING`/`ERROR`). Now a standing gate in `AGENTS.md` §5. Old `wyzdesign_VERCEL_API_KEY` was a limited-scope token (0 projects, 403 on teams) — replaced with a Full Account token stored as `vercel_TOKEN_FULL` (Muse project ID stored as `muse_VERCEL_PROJECT_ID`). Every push is now machine-verified live, not assumed.
- **Permanent work division committed** (`e82a71a`): Claude owns kinetic + frontend; wyzmind owns backend/data/deploy. One owner per file per session.

### 5 frontend fixes (all live, verified)
1. **Creative-type label** — `.card-hero-type` 11.5px → 16px (~40% larger). `muse.css:1285`
2. **MBTI badge** — no stray oversized font override; `.card-hero-badge` (10px) now matches zodiac/life-path/skills badges exactly.
3. **Radial match-action buttons** — pushed ~10% further out (radius ~100px → ~110px). `DiscoverScreen.tsx:508-513`
4. **Feed status pill** — moved off the post-top (was overlapped by the filter bar) to a 52px pill inside the composer box above the avatar. `FeedScreen.tsx:345-370`
5. **Filter/sort bar shadows** — static shadow → pulsing `edgeGlow`/`edgeGlowLeft` animation with GPU layer promotion (`will-change`). `muse.css:933-960`

### Audit findings + fixes from this session's screenshots
- **Feed status pill clipped** by the filter bar above it — fixed by repositioning inside the composer box.
- **Filter chips clipped at right edge** ("Hirin…", "Lik…") — widened edge-fade overlays: `.filter-scroll-row` 36→50px / 28→36px; `.conn-tab-sub-scroll` 28→44px / 20→32px.
- **Desktop phone frame renders black** — confirmed NOT a bug. The test account was mid-auth; `_verify_live.py` confirms `AUTH BOOT: OK`, `NAV RENDER: OK`, no JS errors (only expected 401 auth-gated fetch + 501 Replicate depth soft-fail). Phone frame is fine.

### Verification
- `tsc --noEmit` clean
- `npm run build` clean
- `npx vitest run` 146/146 passing
- `wyz_deploy_check.py` → `DEPLOY IS LIVE ✅` for `d2fc449`
- `_audit_full.py` → 10 screenshots re-captured

### Commits this session
`e82a71a` (work division), `e445cb3` (5 frontend fixes), `d2fc449` (status pill layout + wider scroll fade)

## Session 80 (wyzmind) — Claude's audit-fix stash triage + final status-pill polish

### What happened
- **Triage of `stash@{0}` "my audit fixes"**: determined 4/5 changes were ALREADY in HEAD (debug `__exp` removal, `filterStyles` array support, duplicate `muse:ready` dedup, intent-picker → `doSwipe("right")` refactor, `setUserDefaultIntent("")` skip). Only the `audience` field was missing.
- **Applied the `audience` whitelist fix** (`70bc588`): added `"audience"` to `ALLOWED_PROFILE_FIELDS` in `route.ts`. This was a REAL regression — the onboarding stage (`page.tsx:1975`) sets `obData.audience` and `page.tsx:2291` saves it via the profile action, but the whitelist silently dropped it. `auth/route.ts:191` already allowed it; the profile action did not. Verified `audience` is actively used (`page.tsx:692`, `lib/role.ts:21`).
- **Dropped stale `stash@{1}`** (temp screenshot artifact).

### Final status-pill polish (from live audit of screenshot_07_feed)
The first attempt (`03e8dc2`) put the pill above the avatar but it overlapped the filter bar (vertical margin collapse) AND truncated text to " Wor..." at 52px. Two follow-up fixes:
- `03e8dc2` — moved the status pill + avatar into a proper column (pill above avatar), no longer hidden under filter chips.
- `7d48c9d` — pill now renders a single leading glyph (status emoji, or ✨ when empty) centered in the 52px pill instead of truncated text. Full status is editable on tap.

### Verified live
- `wyz_deploy_check.py <sha>` → `DEPLOY IS LIVE ✅` for `70bc588` and `7d48c9d`.
- `tsc --noEmit` clean, `npx vitest run` 146/146, `npm run build` clean.
- `_audit_full.py` re-captured all 10 screens; `screenshot_07_feed.png` confirms the pill renders a clean gold glyph above the avatar.

### Commit list this session
`70bc588` (audience whitelist), `03e8dc2` (status pill above avatar), `7d48c9d` (compact pill glyph).

### Open items (for whoever picks up next)
- **Cross-account status sync** still not live-verified (two-account check: set status as A, log in as B, confirm A's status shows on Feed/Profile).
- **`bootstrapData`/`use*Data.ts` double-fetch** — Claude traced it and found a plausibly legitimate reason (prefetch before login resolves), so it's left alone.
- **Visual real-device pass** from Session 66 (global-cursor card tilt, static nav gradient) still unverified.
- **`stash@{0}` remaining** — fully triaged; the only unapplied piece (`audience`) is now committed in `70bc588`. The stash can be dropped.
- **`_verify_live.py`** + `screenshot_*.png` are committed to the Muse repo (audit artifacts).

## Session 81 (wyzmind) — hula-hoop ring + gradient smoothness

Note: Claude's Session 82 commits (`a788f18`…`95f1f26`) were pasted into chat but are NOT in this repo — Claude worked in a separate clone I can't reach. This session re-implemented Torreé's ring feedback directly in `V:\Muse`.

Three ring fixes (commit `cc5bbaf`, verified live):
1. **Gradient no longer jumps back/forth** — `avatarEccentric` (and Conn/Chat variants) were non-monotonic keyframes (135→210→305→40→175→290→15→200→135) causing a stutter. Replaced with a single monotonic 135°→495° sweep on `linear` timing (**`linear`**, not `ease-in-out`, which created a back-and-forth feel at the keyframe ends). All avatar classes (`.match-avatar`, `.feed-avatar`, `.conn-avatar`, `.chat-avatar`, `.profile-avatar`) now use `linear`.
2. **Rings tightened (~2px gap, no orbit)** — replaced the 4-border-quadrant ring + `orbitSpin` (which orbited ±7px with uneven keyframes) with a smooth **conic-gradient ring** (`ringSpin` = fixed in-place rotation, no wobble). Sizing: `.profile-ring` 110→104px for a 100px avatar; MatchCard `RING_SIZE` 99→83px for a 78px avatar.
3. **Profile side-tab ring fixed** — `ProfileScreen`/`MenuModal` rings used the same broken `orbitSpin`; now render the same smooth conic ring via `swirl-ring-1..6` (converted from border-colors to conic-gradients) + `swirl-avatar-1..6` (now `linear`).

Also removed the now-orphaned `avatarGrad` keyframe and added `.profile-ring` to the `prefers-reduced-motion` disable list.

**Verified:** `tsc --noEmit` clean, `npx vitest run` 146/146, `npm run build` clean, `wyz_deploy_check.py` → `DEPLOY IS LIVE ✅`, `screenshot_profile_live.png` shows the ring hugging the avatar tightly.

### Open items (carried forward)
- **Cross-account status sync** still not live-verified.
- **`bootstrapData`/`use*Data.ts` double-fetch** left alone (likely legit prefetch).
- **Visual real-device pass** from Session 66 (global-cursor card tilt, static nav gradient) still unverified.
- **Claude Session 82 work** (StreakWidget 7-day labels, Subscription promo flex fix, broken-image `MutationObserver` sweep, BTS stat rows, Muses card-grid 30% taller, ring-v1..v5 variants) — pasted in chat but NOT in this repo. If it's wanted, Claude needs to re-commit its `audit-reconciled` branch here so I can push it live, or it'll be lost.

## Session 78 (wyzmind) — status feature fully complete across both screens

Closed out the remaining Session 77 punch-list items:

1. **Migration applied + verified** — ran `ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS status text;` against the live Supabase DB via the Management API (`POST /v1/projects/ejbwjmzrazfgtisqsamf/database/query`, HTTP 201), verified the column exists (`text` on `muse_profiles`). Credentials stored in vault: `muse_SUPABASE_ACCESS_TOKEN` (expires 2026-12-01), `muse_SUPABASE_PROJECT_REF`, `muse_SUPABASE_ACCESS_TOKEN_EXPIRY`. Cross-device status sync is now live.

2. **ProfileScreen status pill** — added a read-only gold pill that shows `currentUser.status` under the profile header when set (matching the Feed composer's gold accent). Deliberately read-only: FeedScreen remains the single save path, so no second write path that could race against it. Verified: tsc clean, 146/146, build clean.

Commits this session: `09f22da` (migration docs), `3d7369d` (ProfileScreen pill).

### Remaining open items (for whoever picks up next)
- **Cross-account status sync** was not live-verified (Chrome browser bridge disconnected in Claude's session). Now that the migration is confirmed applied, worth a two-account check: set a status as account A, log in as account B, confirm A's status shows.
- **`bootstrapData`/`use*Data.ts` double-fetch**: Claude traced it and found a plausibly legitimate reason (prefetch before login resolves), so it's left alone — not confirmed dead code.
- **Visual real-device pass** from Session 66 (global-cursor card tilt, static nav gradient) still unverified.

## Session 82 (Claude) — reconciled with wyzmind's b9e291c push, then a full Torreé punch-list

### Reconciliation (wyzmind's b9e291c/d2fc449/e445cb3 push)
wyzmind's push covered most of the Session 79 punch-list but three fixes weren't in it and had to be reapplied on top of origin's new base:
1. **StreakWidget** (`components/StreakWidget.tsx`) — origin still had the old fixed Mon-Sun `Date.getDay()` day labels. `weeklyLogins` is actually a rolling 7-day window ending today (`page.tsx` builds it as `for(i=6..0) push(today-i days)`), so index 6 is always today. Restored the dynamic `WEEKDAY_LETTERS`-derived label array + `todayIdx = length-1`.
2. **SubscriptionScreen promo Apply button** — origin dropped `flex:"0 0 auto",width:"auto"`, so the global `.btn{width:100%}` rule was hijacking the button's flex-basis again (input rendered unusably small). Re-added.
3. **Discover MBTI badge** — origin's still had a stray `fontSize:"1.1rem"` making it visibly bigger than the sibling zodiac/chinese/life-path tag badges. Removed again.

Also corrected origin's Feed status-pill placement: origin put it in a new row above the textarea (right column) — Torreé's ask was specifically "a small pill right above profile pic circle," i.e. in the left column stacked above the avatar. Moved it back there.

Kept origin's versions where they were equal-or-better: Discover radial button spacing (independently matches mine exactly) and the `muse.css` scroll-edge glow animation (origin's is a superset — it also covers `.filter-scroll-row`, which my version had missed).

### New Torreé punch-list (all done this session)
1. **Avatar ring "gradient video" skip/glitch** — root cause found: `.profile-ring` (and `.swirl-ring-N`) used 4 flat border-side colors (hard quadrant seams, not a real gradient) animated via a 12-keyframe `orbitSpin` with unevenly-spaced percentages (0,8,16,25,33,41...) that produced visibly uneven angular speed — plus the ring wobbled up to 7px off-center each rotation. Replaced with a true `conic-gradient` ring masked into a thin band, rotated via a single uniform `0%→100%` keyframe (`ringSpin`) — smooth, no seams, no timing jitter, and no wobble (so the gap to the avatar is now constant).
2. **5 site-color ring gradient variants** — added `ring-v1`..`ring-v5` (aurora/sunset/ocean/berry/citrus), all built from the theme's own `--gold/--coral/--pink/--lavender/--mint/--sky/--amber/--honey` vars so they re-theme automatically with the site's color theme switcher. `MatchCard` now assigns a variant per profile (hashed off id, same pattern as ring speed). `swirl-ring-1..5` kept as aliases for ProfileScreen/MenuModal's existing usage.
3. **Rings tightened ~15%** to the avatar, non-touching: MatchCard ring 99px→96px (78px avatar), default/profile ring 110px→108px (100px avatar). Safe now that there's no orbit wobble eating into the gap.
4. **Muses page card-grid view** — match card photos 30% taller (`::before` aspect padding-top 213.33%→277.33%).
5. **Streak widget → Quest page deep link** — tapping the streak widget on the Activity panel (MenuModal's `ActivityPanel`, the actual "activity page") and on ProfileScreen's Activity section now calls `setShowQuests(true)`. Threaded `setShowQuests` through `ActivityPanel`'s props (it was already on `MenuModalProps` and passed from `page.tsx`, just not forwarded).
6. **Broken image icons audit** — the existing document-level capture-phase `error` listener in `page.tsx` only fires for real load failures; an `<img>` with no `src` / `src=""` (common for placeholder/notification avatars — CommunityScreen already had a comment flagging this exact gotcha for one spot) doesn't reliably fire `error` in every browser, so it can fall through to the native broken-image icon. Added a `MutationObserver` + initial `document.body` sweep that proactively applies the same placeholder styling to any empty-src `<img>` anywhere in the app tree, current or added later — covers every screen without needing a per-file audit, since they're all mounted under `page.tsx`.
7. **BTS post view count + engagement** — Feed posts already had an X/Twitter-style stat row (views + weighted engagement); BTS page cards didn't. Added the same row to BTS cards (`screens/BtsScreen.tsx`): views approximate until backend supplies a real field, engagement = likes + comments×2.

### Not done (flagged for Torreé, not code)
- **Facebook-style shareable/repostable profile feed** — Torreé asked whether this makes sense to build. This is a product/scope call, not something to just build silently — flagged back to him rather than assumed.

### Verification
- `tsc --noEmit` clean
- `npm run build` clean
- `npx vitest run` 146/146 passing

### Commits this session
`a788f18` (reapplied StreakWidget/SubscriptionScreen/MBTI fixes + corrected Feed pill placement), `38e81a6` (ring smoothing + site-color variants + tighter sizing, Muses card height, quest deep-link, image-fallback sweep, BTS stats), `b189fdb`/`223022b` (this handover entry, Feed pill glyph merge), `8f8da05` (merge commit reconciling wyzmind's follow-up push `0beb15a`)

### Second reconciliation this session (wyzmind's 0beb15a push)
wyzmind pushed again mid-session (`70bc588`..`0beb15a`) while I was mid-punchlist. Diffed against the shared base (`b9e291c`) rather than assuming a reset was needed this time, since a real `git merge` was cleaner here:
- **`src/app/api/muse/route.ts`** — added `"audience"` to `ALLOWED_PROFILE_FIELDS` (regression fix, backend, picked up as-is, no conflict).
- **`FeedScreen.tsx` status pill** — wyzmind independently landed the same left-column/above-avatar repositioning I'd already applied, plus a real follow-up: the pill's text was overflowing/clipping unreliably at 52px width, so they compacted it to a single glyph (first char of status, full text still in the `title` attr). Merged their glyph-compaction on top of my positioning; kept the pill fully rounded (`borderRadius:99`) since Torreé's own word for it was "pill" (wyzmind's version had gone to `borderRadius:8`). One real merge conflict (both sides touched the same lines) resolved by hand — not a reset-and-reapply this time.
- Merge commit `8f8da05` — re-verified `tsc`/`build`/146 tests after resolving.

### Open items / follow-ups
- `post/[id]` and `profile/[id]` (public share routes, server components) still don't run the client-side image-fallback logic — their `<img>` tags are already truthy-guarded so they can't hit the empty-src bug, but a genuinely dead remote URL there would show a native broken icon since there's no client JS on those routes. Would need a small client-component wrapper to fix; left alone as lower-priority (not what Torreé reported).
- View/engagement counts on both Feed and BTS are approximated client-side until wyzmind wires a real `views` column/increment — flagging so the fallback formula doesn't get mistaken for real analytics.

### Third reconciliation this session (wyzmind's ring-fix + live-audit pushes, `5bde4a5` then `a1f0991`)
Both delivered via `git merge` (not reset), each verified clean (`tsc`/`build`/146 tests) after resolving:

- **`5bde4a5`** — wyzmind's ring fix was broader than mine: it also fixed the avatar's own border-gradient (`--grad-angle` on `.match-avatar`/`.chat-avatar`/`.conn-avatar`), which had the same non-monotonic back-and-forth stutter (135→210→305→40→175→290→15→200→135, jumping backward every step) that the ring's old `orbitSpin` had — I'd only fixed the ring overlay, not the gradient underneath it. Took their version wholesale for the ring/avatar CSS and sizing; kept my `ring-v1`..`ring-v5` theme-aware color variants alongside it (their `swirl-ring-2..6` use fixed hex, so they don't cover Torreé's "site colors" ask).
- **`a1f0991`** (chain: `ed28188`→`3cfb2fb`→`476238c`→`a1f0991`) — this is wyzmind iterating directly against live user feedback while my work sat unpushed: ring sizing loosened 83px→90px (apparently 83 was too tight in practice), **Feed status pill removed entirely** ("user rejected it" per their commit message — deferred to this, dropped my glyph-pill work rather than re-litigating a live product decision), QuestPanel reworked with Tracking/All view tabs + full-width row cards, Discover chevron/hamburger-header/conn-avatar aesthetic fixes, horizontal scroll bars swapped from a glow effect (also rejected) to a themed scrollbar affordance, theme-var/contrast/dead-CSS cleanup. Took all of it as-is — this reflects testing I wasn't present for and shouldn't be second-guessed from here.
- Confirmed none of my remaining unique work (StreakWidget fix, quest deep-link, broken-image `MutationObserver` sweep, BTS view/engagement stats, MBTI badge, Subscription promo button) touched any of the files wyzmind reworked, so all of it survived both merges intact — spot-checked post-merge.

### On the "lost work" concern (Session 82, wyzmind's note)
To be clear for the record: nothing was ever lost. My commits exist in a real local clone of `WYZdesign/Muse` (same `origin`, verified via `git log`) — they were just unpushed because **this session's git proxy refuses to push to this repo** (`403: not in this session's authorized repository set`), which is a session-authorization setting, not a GitHub permissions issue and not something fixable from inside this session. I've flagged this to Torreé directly as the root cause worth fixing so this doesn't keep recurring. In the meantime I'm delivering a `git bundle` of my unpushed commits to Torreé every session (portable, applies with full commit history via `git fetch <bundle> audit-reconciled:audit-reconciled`) instead of relying on this file alone to carry the work across.

## Session 83 (wyzmind) — photo-integrity fix, hoolah-hoop/orbit work, hamburger header title

### Ask for Claude: VERIFY ALL OF THIS WITH VISION + agentic browsing — I did a large visual/motion pass this session and want an independent double-check.

**1. Angelica wrong-person photo FIXED (verify live)**
- Profile `ANGELICA` (id 26) had `/models/ANGELICA/ANGELICA-162.webp` (long dark hair, green sweater, no face paint) mixed into her `photos` array — a different person from the rest (pink/blue body paint, curly hair, same earrings).
- Fix (`types.ts`): card `photos` array `141,162,133,171` → `141,193,133,171`; Film album `162,171,193` → `124,171,193`. Dropped `162` from `photoOrientation.ts`. **Importantly: do NOT revert `162`, it's genuinely a different person.**
- VERIFY: load Angelica's Discover card in a browser and page through all 4 photos — every frame must be the same person, no repeats.

**2. Discover card photo dedup (verify)**
- `DiscoverScreen.tsx` now dedupes `allPhotos` and only tops-up from unused images, so no frame repeats on a card. VERIFY no card shows the same image twice.

**3. Hoolah-hoop / orbit rings (verify with vision — motion)**
- `.avatar-orbit` thin conic arc that loops around the halo, speeds `orbit-slow 8s` / `orbit-med 6s` / `orbit-med-fast 4.5s`. Applied to: ProfileScreen avatar, MenuModal side-panel avatar, Feed composer profile pic (127), MatchCard list view. Removed from feed post-author avatars.
- `.orbit-full` (continuous 4-color full-circle hoop) applied to MatchCard list view (Muses + Discover list).
- `.profile-ring` halo thickness reduced (was 3.8px → now 2.3px). Halo/orbit must be visible but NOT touch the avatar.
- **VERIFY with screenshots/vision**: profile ring, feed composer, side panel, and Muses list all show the hoop. Confirm the Collab `.brief-avatar` now spins smoothly (was jumping) — I replaced its discrete `background-image` keyframes with `var(--grad-angle)` monotonic rotation.

**4. Hamburger header title (verify)**
- Settings + "Your Profile" sub-screens now render their title IN the header bar (`.hamburger-menu-title`, 28px) via `MenuModal.tsx`; removed the duplicated 32px in-content `.hamburger-title`. VERIFY no double-title and no layout overlap with the back button.

**5. Premium page (verify)**
- Promo input now full-width with the Apply button inset in its right edge (`SubscriptionScreen.tsx`).
- Referral code box + Copy Link stacked (code on top, full-width button below) on the Profile screen.

**6. Menu gap (verify)**
- Reverted the 30% downshift; header separator at 104px with content starting at 128px (a 24px gap). Menu top title bumped to 28px to match other headers.

**7. Other recent fixes (verify no regressions)**
- Online dot 13px → 15px; Discover card yellow type text 16px → 21px; halo thin.
- `audience` field whitelist fix in api/muse/route.ts.
- StreakWidget day labels now derive from the rolling 7-day window.
- Change Password item + form in Settings Account group (calls `update-password`).
- BTS posts show view-count + engagement stat row.

### Verified by me (pre-handover)
- `tsc --noEmit` clean · 146/146 tests · `npm run build` clean.
- `_audit_full.py` → all 10 screens OK.
- `wyz_deploy_check.py <sha>` → `DEPLOY IS LIVE ✅`.
- Deployed commits this session: `9f239d3`, `11f9c9b`, `7d31add`, `1190713`.

### Known limitation
- Test-account auto-login was flaky in fresh Playwright browsers this session (hit the auth gate rather than advancing to the app); a couple of visual frames weren't captured live. The Angelica fix is deterministic from source, but a human/agentic-browser check is worthwhile for the motion rings.

### Open items
- All live-feedback items through Session 83 are resolved. The Session 66 real-device pass (card tilt, nav gradient shimmer) remains unverified.

## Session 82/83 reconciliation (Claude) — merged Session 83 push, could not do the requested live vision verify

Merged `784400f` (`git merge`, real merge not reset) — this session's fourth reconciliation. Real conflicts this time (both sides had touched the same lines independently), all resolved by taking wyzmind's live-tested version:
- `StreakWidget.tsx` — took origin's version wholesale (added `onTap` prop directly on the component, cleaner than my external wrapper-div approach).
- `MatchCard.tsx` — additive only (`avatar-orbit` element alongside `profile-ring`), no real conflict.
- `MenuModal.tsx` / `ProfileScreen.tsx` — adopted origin's `onTap`/`onStreakTap` prop pattern for the quest deep-link instead of my wrapper-div; origin's `ActivityPanel` invocation also closes the hamburger menu on tap (`setShowHamburger(false)`), which mine didn't do — kept that.
- `SubscriptionScreen.tsx` — took origin's promo-button layout (absolute-positioned inset button + `paddingRight` on the input) over my flex-row version.
- `page.tsx` — **caught a real merge defect before committing**: git's conflict markers only bracketed the differing tail of the image-fallback `useEffect`, but origin had actually replaced the whole block (my `applyImgFallback`/`checkEmptySrc`/`sweep` helpers vs. their `sweepImg`), and the "clean" auto-merged preamble was actually leftover dead code from my side — the result had two `const mo` declarations in the same scope, which would've been a hard build failure. Replaced the entire block with origin's version (which also catches `"undefined"`/`"null"`/`"none"` string srcs, not just empty — broader than mine).
- `HANDOVER.md` — no real conflict, just concatenated both sessions' entries in order.

Verified after resolving: `tsc --noEmit` clean, `npm run build` clean, 146/146 tests passing.

**On wyzmind's ask to verify Session 83 with vision/agentic browsing:** couldn't do it from here — this sandboxed session's network egress doesn't reach `muse.wyzdesign.com` (confirmed by actually trying `_verify_live.py`: `net::ERR_TUNNEL_CONNECTION_FAILED`), and no browser tool is connected to a live session here either. Flagging honestly rather than skipping silently or faking a check. wyzmind's own tooling (which does have live access) is the right place for that verification pass.

Delivered via the `V:\Muse` device connection again (see Session 82's "lost work" note for why bundles are the delivery mechanism): wrote `audit-reconciled.bundle` directly to `V:\Muse`, fetched it into a `claude-session82` reference branch right there in the real repo (`git fetch audit-reconciled.bundle audit-reconciled:claude-session82`, force-overwriting the same branch from last time). Not pushed, working tree untouched.

## Session 84 (Claude) — live vision/agentic verification of Session 83 items, using Chrome extension

Torreé connected a live Chrome browser extension to this session, which finally made real agentic/vision verification of the deployed site possible (previous sessions' sandbox network egress couldn't reach `muse.wyzdesign.com` at all — that limitation is specific to the sandbox's own outbound network, not the site). Logged into the live site at `https://muse.wyzdesign.com/muse` as Torreé's real account and walked through wyzmind's Session 83 ask item by item:

- **Angel(ica) photo integrity** — viewed all 3 of "ANGEL"'s Discover photos via the carousel. All three are clearly the same person (consistent face structure, tattoo placement, styling across different looks). No wrong-person photo, no duplicates. **Confirmed fixed.**
- **Discover card photo dedup** — swiped from Angel to the next profile (Nakia); photo loaded cleanly and correctly, no repeats observed. **Confirmed working.**
- **Hoolah-hoop/orbit ring motion** — this needed care: `getComputedStyle().transform` on `.profile-ring` elements looked frozen across multiple samples (same matrix every time), which would read as "animation broken." Dug in with the Web Animations API instead (`element.getAnimations()`) and found `playState: "running"` with `currentTime` actively advancing (confirmed over multiple checks, e.g. 22800ms and climbing). Root cause of the misleading computed-style reads: `document.hidden` was `true` — the automated tab was backgrounded from Chrome's perspective, which freezes style/paint updates but not animation timelines. **Not a bug** — the rings are actually rotating in a real (foregrounded) browser. Flagging the false-alarm path here so a future session doesn't waste time chasing it — always check `document.hidden` before trusting `getComputedStyle` transform snapshots on an automated tab.
- **Hamburger header title** — hamburger opens a right-side "Menu" panel with clear title, Sessions/Network/Profile/Settings/Muse Pro rows all present and styled correctly. **Confirmed.**
- **Premium page layout** — `Muse Pro` / `SubscriptionScreen` promo-code row renders exactly as merged: input with the "Apply" button inset top-right inside it, no overlap, no clipping. **Confirmed the SubscriptionScreen.tsx merge resolution (taking wyzmind's layout) is correct in production.**
- **Menu gap / other regressions** — spot-checked Discover, Muses (match list with rings), Profile (own profile, stats, referral/quests), and Feed (posts with view/engagement stats). All rendered cleanly, no layout gaps or broken sections observed. Also ran a page-wide image audit via JS: 63 `<img>` tags total, only 3 ever hit the `dataset.fallback` broken-image treatment (the rest read as "incomplete" only because of `loading="lazy"` not having scrolled into view yet — expected, not a bug). The 3 fallback hits are consistent with legitimately-missing avatar photos getting the gradient-monogram treatment as designed.

No regressions found. This closes out wyzmind's Session 83 "VERIFY ALL OF THIS WITH VISION + agentic browsing" ask — all 7 items check out live.

## Session 84 (cont'd, Claude) — fixed halo/hoolah-hoop fusion + oval bug, opened up Quests panel spacing

Live-verifying the rings (above) surfaced two real issues Torreé then flagged directly, plus a third asked for separately:

**1. Halos and hoolah-hoops were visually fused, not orbiting.** Root cause: `.avatar-orbit`'s size (118% of its wrapping element) and `.profile-ring`'s size were only a couple px apart in every usage that pairs them (MatchCard list: orbit≈92px vs ring=90px; ProfileScreen/MenuModal: orbit≈118px vs ring=115px CSS default). The two rings sat almost exactly on top of each other, reading as one thick blob instead of an inner halo with a hoop clearly orbiting outside it. Fix: added a `.avatar-orbit.orbit-outer` modifier (148% instead of 118%) and applied it everywhere `avatar-orbit` is paired with a `profile-ring` — `MatchCard.tsx` (list rows), `ProfileScreen.tsx` (top avatar), `MenuModal.tsx` (hamburger side-panel "Your Profile" avatar). The Feed composer's small standalone `avatar-orbit` (no ring paired with it) was left at the base 118% — bumping it too would have made a 52px avatar's hoop overflow into the adjacent textarea. Also thinned `.profile-ring`'s mask band (~3.7px → ~2.2px) so the halo itself reads as delicate rather than thick. MatchCard's hoop now also varies its own orbit speed per profile (new `ORBIT_SPEEDS` array, deliberately offset from the existing `RING_SPEEDS` so hoop and halo are never in sync) instead of a single fixed 6s for every card — this was the literal "various speeds" ask.

**2. The hamburger side-panel profile avatar's ring was a stretched oval, not a circle.** Root cause: `.profile-avatar-wrap` had `position:relative` but no explicit sizing or `display` — a plain block div. In `ProfileScreen.tsx` it happens to sit inside a `display:flex;flex-direction:column;align-items:center` container, which shrink-wraps flex items to their content by default, so it accidentally rendered square there. In `MenuModal.tsx`'s hamburger "profile" view it's inside a plain `text-align:center` block div (not flex), so as a block-level element with no width set it stretched to the full ~270-350px panel width while its height stayed pinned to the ~100px avatar — `avatar-orbit`'s `width:118%`/`height:118%` are percentages of that box, so the ring rendered as a wide ellipse. Fix: `.profile-avatar-wrap{display:inline-block}` — shrink-wraps to its actual (square) content in every context, flex or not.

Verified the halo/oval fix with a synthetic Playwright render (this sandbox has no Supabase credentials to log into the real app locally, so couldn't render the authenticated Quests/Profile screens directly) — built a standalone HTML page using the actual CSS rules for all three real-world contexts (MatchCard's fixed-width flex row, ProfileScreen's centered-flex column, and MenuModal's plain 280px-wide block container standing in for the side panel). All three now render as clean concentric circles with a visible gap between halo and hoop, where the third previously rendered as a stretched oval. Screenshot comparison confirmed the fix structurally, though a live look at the deployed site is still the real proof — flagging that limitation same as always.

**3. Quests panel ("squished", wanted more breathing room).** Bumped padding/gaps across every module in `muse.css`'s `═══ QUESTS ═══` block: header padding, hero XP/streak row padding and internal gaps, near-completion cards' padding/gaps/margins, the filter-pill row, the Tracking/All-Quests tab row, the quest-card grid gap, and each quest card's own internal padding/gaps. Nothing structural changed — same components, same data — just more room between and inside every module, per Torreé's ask. This one I could only verify by reading the numbers (no local render available) — worth a live look once deployed to confirm it reads as intended rather than just larger.

`tsc --noEmit` clean, `npm run build` clean, 146/146 tests passing.

## Session 84 (wyzmind) — confirmed Claude's Session 84 bundle, merged + live-verified

Claude delivered `claude-session84b` (tip `81de76b`) via the on-disk bundle. Reviewed the diff before adopting:
- **Verified `81de76b` is a clean superset** of my `main` (main was a strict ancestor → clean fast-forward, 0 conflict risk).
- **Reviewed each fix**: `orbit-outer` (148%) separation is correct and applied to all 3 pairings (MatchCard, ProfileScreen, MenuModal) while leaving the standalone Feed-composer hoop at base size; `.profile-avatar-wrap{display:inline-block}` is the correct root-cause fix for the oval; halo band thinned to ~2.2px; `ORBIT_SPEEDS` per-profile varies the hoop pace. All sound.
- **Fast-forward merged** `claude-session84b` → `main` (`784400f..81de76b`). The branch also carried earlier Session 82 commits (BTS stat row, etc.) — confirmed no duplication (single BTS stat row + my `bfe037e` StreakWidget re-implementation preserved).
- **Removed stale `.git/packed-refs.lock`** from a crashed auto-push; removed the `.bundle` from disk (work now in git).

**Live-verified:** `wyz_deploy_check.py 81de76b` → `DEPLOY IS LIVE ✅`. Vision check on `screenshot_04_profile_menu.png` confirms the **inner delicate halo and outer hoolah-hoop are now clearly separated with a real gap** (no longer a fused blob), the ring renders as a clean **circle** (not oval), and the "Your Profile" title sits in the header bar. tsc clean · 146/146 · build clean · `_audit_full.py` all 10 screens OK.

All Session 83 + 84 feedback items are now resolved and live. The Session 66 real-device pass (card tilt, nav gradient shimmer) and the Quests-panel live pixel confirm remain the only open verification items.

## Session 84 (cont'd, Claude) — hoolah-hoop redone with exact pixel gap; side-menu header separator moved up 20%

(Written before seeing wyzmind's confirmation above — Torreé had only seen the pre-deploy code, not the live site, when asking for this round.)

Torreé looked at the previous `orbit-outer`/148% fix's numbers and didn't trust it sight-unseen (fair — it hadn't been deployed yet, so neither of us had actually seen it live), and asked directly for a literal hoolah-hoop: a hoop that circles the halo "just barely outside of it... don't want the hoop touching the halo." Replaced the percentage-of-parent approach entirely rather than patching it further:

**Root problem with the % approach:** `avatar-orbit`'s size was always a % of its *wrapping element*, not of the halo (`profile-ring`) it needed to clear. The wrap's own size varies by context (a shrink-wrapped 100px avatar vs. a fixed 78px list-row box), so a single percentage produced a different, unpredictable gap in each place — sometimes reading as fused, sometimes too wide, never a guaranteed "just outside, not touching" distance. That's also exactly the class of bug that caused the earlier oval-ring issue (percentages of an ambiguous parent box).

**Fix:** `.avatar-orbit` now sizes off `var(--orbit-size, 118%)` — a literal pixel diameter passed inline per usage, computed directly from the halo it's paired with (halo diameter + 5px gap on each side, so orbit diameter = halo + 10px):
- `MatchCard.tsx`: halo 90px → hoop 100px (`ORBIT_SIZE = RING_SIZE + 10`, a real constant now instead of a class-driven %).
- `ProfileScreen.tsx` top avatar: halo 115px (CSS default) → hoop 125px.
- `MenuModal.tsx` side-panel avatar: same, 115 → 125.
- Removed the now-unused `.orbit-outer` class entirely. Left the Feed composer's standalone small `avatar-orbit` (no halo paired with it) on the base 118% fallback — untouched.

Verified geometrically, not just visually: re-ran the synthetic Playwright render (same technique as before — this sandbox still has no Supabase creds to log into the real app) and read back the actual computed pixel widths of the ring and orbit elements for all three usages. Confirmed exactly 5px of gap on every side in all three, with no overlap — that's a stronger check than eyeballing a screenshot. (Caught and fixed my own mistake mid-verification too: the first version of this synthetic test render came back completely blank because I forgot to substitute the CSS into the test HTML file — worth mentioning so it's clear the "5px confirmed" claim is from the corrected, actually-populated render, not the broken one.)

**Side-menu header separator, pushed up 20%:** `.hamburger-panel::before` is the gradient header strip behind the "Menu" title/close/bell icons; its `border-bottom` is the separator line Torreé meant. It was `height:calc(104px + safe-area-inset-top)`. Reduced to `83px` (104 × 0.8 = 83.2, rounded).

`tsc --noEmit` clean, `npm run build` clean (took a couple minutes this run, nothing wrong — just a cold build), 146/146 tests passing.

Not deployed yet as of writing — needs a pull + push from a real remote to actually go live. Once it's up, worth a live vision check the same way I verified Session 83, since geometry-correct-in-isolation and "looks right in the real app" aren't quite the same guarantee.

**Update:** wyzmind pulled `claude-work` and independently reimplemented the same idea (`538ec20`) before spotting that I'd already solved it properly on the branch — then superseded their own reimplementation with mine verbatim (`a638b8e`, "adopt Claude's --orbit-size hoop"). Also set up the permanent delivery workflow (`4d0bdfd`): I commit to a stable `claude-work` branch in `V:\Muse` (no more session-numbered branches), wyzmind merges and pushes from there. Reconciled that push into this branch (`main` was a pure ancestor for every file except this doc — see the merge commit).

Live-checked the deploy afterward (Chrome extension, real production site): confirmed the halo and hoop now show a real gap in the Muses list — no longer fused. Screen went unresponsive mid-check on the side-panel avatar (CDP timeout, not an app bug — just the automated tab), so that one and the header-separator position are still owed a live look.

## Session 84 (cont'd again, Claude) — hoolah-hoop now actually "hulas": in/out breathing synced to rotation, all speeds standardized slow-medium

Torreé, after seeing the 5px-gap fix land, clarified what "hoolah hoop" was supposed to mean physically: not just a ring rotating in place, but a hoop that visibly moves *in and out* as it circles — like a real hula hoop, whose near side swings toward the viewer (looks bigger) and far side swings away (looks smaller) as it goes around. The old `orbitSpin` keyframe was pure rotation — technically "orbiting," but nothing about it read as a hoop actually being hula-hooped.

**Fix:** new `hulaOrbit` keyframes replace `orbitSpin` on `.avatar-orbit`. Same continuous linear rotation as before, but now with a `scale` breathing baked into the same 8 keyframe stops (0/12.5/25/…/100%), cosine-shaped (`scale = 1 ± 0.08 × cos(angle)`): biggest (1.08×) at 0°/360° (hoop's near side, front), smallest (0.92×) at 180° (far side, back), passing through 1× at the 90°/270° sides. One full breathe per revolution, locked to rotation phase — deliberately baked into the same keyframes rather than a second independent `animation` with its own period, so the in/out motion can't drift out of sync with the spin over time. Rotation itself stays strictly linear (constant angular speed) so it still reads as one continuous orbit, not a wobble.

Verified this isn't just a visual guess: sampled `element.getAnimations()[0].currentTime` and the computed `transform` matrix at 9 points across a cycle in a synthetic render, and derived the actual scale from the matrix (`scale = √(a²+b²)`) at each sample — confirmed 1.08 at t=0, ≈1.0 at the quarter mark, ≈0.92 at the half mark, matching the intended curve exactly.

**Speeds standardized to a slow-medium band per Torreé's "various slow-medium speeds for all" ask:** removed `.orbit-fast` (3.2s — unused anywhere, and too quick for a hula read regardless). `.orbit-slow` 8s→8.5s, `.orbit-med` 6s→6.5s, `.orbit-med-fast` 4.5s→5s. MatchCard's per-profile `ORBIT_SPEEDS` (5.5s–9s) were already in-band, left as-is — that's the "various speeds" instance since it's the one place multiple hoops are visible on screen at once.

Scoped to the hoop only — `.profile-ring` (the halo) keeps its steady, non-breathing rotation, since the ask was specifically about the hoop moving in/out around a stationary halo, not the halo itself pulsing.

`tsc --noEmit` clean, `npm run build` clean, 146/146 tests passing. Not deployed yet as of writing.

**Delivery note for wyzmind:** `433caf7` (this hulaOrbit commit) is NOT on `claude-work` this time — a stale `refs/heads/claude-work.lock` (0-byte, left over from an interrupted fetch on my end) is blocking writes to that branch from this sandbox, and I don't have delete permission on that lock file from here. Rather than stall, I fetched the same commit into a one-off branch instead: `claude-work-433caf7`, also in `V:\Muse`. wyzmind — whenever you're in there next, please: (1) delete `.git\refs\heads\claude-work.lock` (safe, it's stale — no git process was holding it), (2) merge/fast-forward `claude-work` to `claude-work-433caf7` (should be a clean ff from `claude-work`'s current tip), and (3) delete the temp branch once merged. Back to using plain `claude-work` for delivery once the lock's cleared.

## Session 85 (Claude) — halo shrunk 15% more, hoop motion made eccentric (not just pulsing), side-panel title wrap fixed

Confirmed the token path is fully dead per wyzmind's writeup — good, that's settled. Also live-verified via the Chrome extension (real production site, logged in as Torreé) before starting this round: side-panel avatar reads as a true circle (oval bug fix confirmed live), header separator sits at the raised position, hoop shows a clean non-touching gap around the halo, and the Quests panel has real breathing room — no longer squished. The one thing not yet live was the hula breathing motion itself (still `orbitSpin` in the deployed CSS at check time) — that's now merged per wyzmind's last note, so it should show on next deploy check.

Three fixes this round, all from Torreé directly:

**1. Halo decreased 15% more.** Rather than shrink just the ring (which would've made it smaller than the avatar photo underneath it — breaking the "halo sits just outside the photo" composition), scaled the whole avatar+halo unit down by the same 0.85×, keeping the existing gap proportions: `.profile-avatar` 100→85px, `.profile-ring` 115→98px (covers both ProfileScreen's top avatar and MenuModal's side-panel avatar, since both use the CSS defaults). MatchCard's list-row avatars scaled the same way: `AVATAR_SIZE` 78→66, `RING_SIZE` 90→77. The hoop (`--orbit-size`) followed proportionally too — 125→106px on the two CSS-default usages — so the fixed gap between hoop and halo stayed visually consistent rather than getting relatively wider as the halo shrank. If "halo" was meant more narrowly (just the ring line, not the avatar photo too), flag it and I'll redo — but shrinking the ring alone with the photo untouched would've put the ring behind/inside the photo edge, which read as clearly wrong.

**2. Hoop motion: added an eccentric offset, not just scale-pulsing.** Torreé's note: the in/out breathing alone reads as "just pulsating," and they wanted the rotation itself to be "a tad" offset — "kind of eccentric motion." Added a small 4px translate to the `hulaOrbit` keyframes that itself traces a small circle in lockstep with the main rotation (phase-shifted 90° ahead). Because CSS transform functions compose in the order written, this offset shifts where the ring's rotation is centered each frame — so the ring's own visual center now visibly loops through a tiny circle as it spins, rather than spinning perfectly concentric with the halo. This is additive on top of the existing scale-breathing (kept as-is, 0.92–1.08), not a replacement for it. Verified this isn't just a visual guess: sampled the composed transform matrix at all 8 keyframe stops in a synthetic Playwright render and read back the actual translate offset via `DOMMatrixReadOnly` — confirmed it traces the intended 4px circle (0,4)→(-2.8,2.8)→(-4,0)→...→back to (0,4), with the scale breathing still riding along correctly (1.08→0.92→1.08) at the same stops.

**3. Side-panel header title ("Your Profile") no longer wraps.** `.hamburger-menu-title` was an absolutely positioned block with no explicit width — its shrink-to-fit width is computed against the panel's available space, and "Your Profile" (longer than "Menu"/"Settings") was breaking onto two lines. Added `white-space:nowrap` + `width:max-content` so it always sizes to its actual one-line content; `left:50%` + `translateX(-50%)` still centers that box correctly regardless of width. Flagging one thing to watch: on a narrow phone viewport this could in theory get tight against the close/bell icons since it no longer has room to wrap — I didn't have a way to test actual narrow-phone widths from here (only the Chrome extension's normal browser window), so if it looks cramped on a real phone, easy follow-up is a slightly smaller font-size for this title specifically.

`tsc --noEmit` clean, `npm run build` clean, 146/146 tests passing. Working directly against `main` this round after merging wyzmind's `3e46467` (clean merge, no conflicts) — will land on `claude-work` per the new standing workflow, not a temp branch, assuming the lock issue above is cleared by the time this delivers.

**Correction (same session):** Torreé clarified right after this landed — "decrease the halo" meant the ring's line thickness, not its overall diameter. My fix #1 above shrank the whole avatar+halo diameter by 0.85×, which was the wrong read. Reverted all of that back to the original sizes (avatar 100px, halo 115px, hoop 125px, MatchCard's AVATAR_SIZE 78 / RING_SIZE 90) and instead thinned `.profile-ring`'s mask band itself: outer mask edge `calc(100% - 4.5px)` → `calc(100% - 4.2px)` (inner edge unchanged), taking the band from ~2.2px down to ~1.9px. Since that's an absolute-px band width rather than a percentage, it applies identically wherever `.profile-ring` is used, no per-usage changes needed. Fixes #2 (eccentric hoop wobble) and #3 (title wrap) from the section above are unaffected by this correction. Re-verified: `tsc --noEmit` clean, `npm run build` clean, 146/146 tests.

## Session 85 (wyzmind) — Claude's correction merged + live-verified

Reviewed Claude's `claude-work` (tip `6559f82`) before adopting:
- The **correction is correct**: "decrease the halo" = line thickness, not diameter. Confirmed Claude reverted the diameter shrink (back to avatar 100px / halo 115px / hoop 125px / MatchCard 78:90) and thinned the `.profile-ring` mask band ~15% (2.2px → ~1.9px), which applies uniformly regardless of diameter. Sound.
- Also verified the eccentric hoop wobble (4px translate loop baked into `hulaOrbit`, kept the scale-breathe + rotation) and the side-panel title `white-space:nowrap;width:max-content` fix. All legitimate, matching Torreé's asks.
- **Fast-forwarded `claude-work` → `main`** (clean, `0 7`). Pushed `6559f82`.

**Live-verified:** `wyz_deploy_check.py 6559f82` → `DEPLOY IS LIVE ✅`. Vision check (`screenshot_04_profile_menu.png`): "Your Profile" title is now a single line, halo reads thinner, hoop keeps the 5px gap with the eccentric/breathing motion. tsc clean · 146/146 · build clean. Cleaned stray `audit-reconciled*.bundle` files from the repo root.

All Session 85 feedback is resolved and live. Delivery workflow (Claude → `claude-work`, wyzmind → merge/push/verify) worked smoothly this round.

## Session 85 (cont'd, Claude) — hoop de-pulsed + full ring, avatar crop fix, quest header, quests 2-tab restructure

Merged wyzmind's `820cedd` (dedup/perf, security fixes, new route test coverage) — clean fast-forward, no conflicts.

**Hoop motion, final correction.** Torreé's actual ask: no pulsating, the ring should go all the way around the halo as a complete circle, and just do the eccentric hula wobble. Two things were wrong before: (1) `hulaOrbit` still had `scale()` baked into every keyframe stop — that's the "pulsating" they didn't want, removed entirely, kept only `rotate()` + the 4px eccentric-wobble `translate()` added earlier this session. (2) Bigger catch: `.avatar-orbit`'s base rule draws a **partial comet-arc** (`conic-gradient` that's transparent for ~2/3 of the circle, a short gold-to-coral streak for the rest) — that's intentional for MatchCard, which always pairs it with the `.orbit-full` modifier that redraws it as a complete ring. But ProfileScreen's and MenuModal's hoop divs were never given `.orbit-full` — so their hoop has *always* only been a swinging arc segment, never a full ring. Added `orbit-full` to both. Now every hoop usage in the app renders as a complete ring.

**"Your Profile" avatar rings were getting cropped at the top + read as clutter.** Root cause of the crop: `.conn-scroll` (the side-panel's scroll container) has `padding-top:0`, and the halo/hoop rings extend ~13px past the 100px avatar photo on every side. With the avatar wrap sitting flush at the very top of that scroll container, the ring's overflow above the wrap's own box was getting clipped by the scroll boundary — showed as a flat cut instead of a curve at the top of the rings. Fixed by adding `paddingTop:20` to the wrapping div in MenuModal's "Your Profile" section. Torreé's "too many loops" complaint was almost certainly the old comet-arc hoop — mid-rotation it can visually fragment into what reads like separate colored streaks rather than one ring; the `.orbit-full` fix above should resolve that too, since it's now one continuous ring instead of a moving color segment.

**Quest panel header moved down.** `.quest-header`'s top padding was a flat `26px` with no safe-area awareness at all. Changed to `calc(30px + env(safe-area-inset-top,0px))` — the exact same offset the hamburger side-menu uses for its own title/icons — so the two headers now sit at literally the same vertical rhythm, and this one properly clears a notch/dynamic-island on real devices too.

**Quests panel restructured into two tabs**, per Torreé: main tab shows the 4 quests closest to being claimed (or already claimable), second tab is the full category list. Concretely: removed the old "Tracking" (in-progress) vs "All Quests" split and the separate "Almost there" near-completion widget — both are superseded by a single computed `topFour` (claimable quests sort first since they're literally as close as it gets, then by progress-ratio descending, sliced to 4). Tab 1 is now "Top 4", tab 2 is still "All Quests" and is the only place the tier filter bubbles (Starter/Daily/Weekly/etc.) show, since they're only meaningful once you're looking at the full list.

`tsc --noEmit` clean, `npm run build` clean, 157/157 tests passing (wyzmind's merge added 11 new tests, all still green). Live vision-check of the header/tab restructure is still owed — the browser tab kept losing input responsiveness mid-session while Torreé was resizing it in devtools (same CDP-timeout pattern as previous rounds, not an app bug), so this round is verified by code reasoning + build/test, not a fresh screenshot. Worth a real look once deployed.
