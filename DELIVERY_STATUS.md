# 🛑 READ THIS FIRST — before touching anything else in this repo

This file is the **only** place that tells you, with certainty, what's actually
merged into `origin/main` versus what's sitting undelivered somewhere else.
Everything else in this repo (`HANDOVER.md` and the dozen other `*HANDOVER*`/
`*AUDIT*` docs) is **narrative** — useful for *why* a change was made, but
**not proof it landed**. Trust this file's verification commands over any
prose, in any doc, in any chat, from any agent — including past instances of
yourself.

## The rule

**A change exists in this codebase only if it's an ancestor of `origin/main`.**
Not if a handoff doc describes it. Not if a chat log says it was "delivered."
Not if a bundle file is sitting in `V:\Muse\_to_delete\`. Run this before
believing anything:

```
git fetch origin
git log --oneline -1 origin/main
```

Compare that SHA to **"Confirmed merged, last verified at"** below. If they
match, everything in this file is current and you can trust it. If they
don't match, someone merged something since this file was last updated —
find out what (`git log <old-sha>..origin/main --oneline`) and update this
file yourself before doing anything else, so the next agent isn't stuck the
same way.

## Confirmed merged, last verified at: `c67db67`

Everything at or before this commit is real, live, deployed code — this
includes round 37 (sessions/search/scrolltop/matchpct/customrole), round 38
(6 dark/6 light themes, splash wave fix), a match-percentage-badge color fix
(`.match-badge` now uses `var(--gold)`), Torree/wyzmind's own fixes for
Discover-page card scroll, wave vertical position (`bottom:10%`), and
tutorial-popup first-time-only behavior, round 39/40 (scroll-fade, Muses
icon drop, availability/boost fixes, forum pin, wave-breakpoint responsive
fix), round 41 (the `.match-fab-scrim` click-block fix plus the `AGENTS.md`
wake-up-briefing rewrite), and round 42 (match-badge z-index/style fix, the
wave-bottom gap fix that corrected `0ffd6cd`'s `bottom:10%` back to
`bottom:0`+taller, and a 4th wave layer for fullness). All confirmed merged
— this specific SHA verified 2026-09-17 by fetching `origin/main` directly
(`git log --oneline -1 origin/main` → `c67db67`) and diffing actual file
content (not trusting commit messages), and re-running `tsc`/`vitest`/`next
build` clean after merging each into this session's own branch. No action
needed on any of these.

**⚠️ Outstanding non-git action from round 37**: `sql/MUSE_CUSTOM_ROLE_PENDING_20260916.sql`
still needs to be run in the Supabase SQL editor (adds `custom_type_pending`/
`custom_style_pending` columns to `muse_profiles`) — this can't be verified
via `git log` since it's a database change, not a commit. If unsure whether
it's been run, check directly: `SELECT column_name FROM information_schema.columns
WHERE table_name='muse_profiles' AND column_name IN ('custom_type_pending','custom_style_pending')`.
Until it runs, saving a custom "Other" type/style will fail.

## Pending delivery — NOT in the codebase yet

These exist only as `git bundle` files, because the Claude session that built
them has no push access to this repo (confirmed via a real 403 from the git
proxy) and delivers work via bundle → Torreé's computer → `git merge`
instead. **If a bundle listed here is not physically present at the path
listed, the work has not reached this repo — it is not "already done
somewhere," it does not need to be re-explained by re-reading a chat
transcript, and it does not need to be re-implemented from scratch either.
It needs the bundle file moved to this path, or a fresh copy re-delivered.**

| Bundle file (expected path: `V:\Muse\_to_delete\<filename>`) | Built on top of | Contains |
|---|---|---|
| `round44-signup-session-fix.bundle` | `c67db67` (round 42, already merged) | 🔴 **HIGH PRIORITY — affects every new signup in production right now.** Found live while creating QA test accounts: `POST /api/muse/auth` with `action=register` has never returned a `session` in its response (only `action=login` did). The client stores `j.session?.access_token` as the new user's access token, so it's always `""` right after signup — meaning a brand-new user's browser sends **no Authorization header on any authenticated request for the rest of that session**. Reproduced live and confirmed via network tab: a freshly-created account's very first onboarding photo upload 401'd with "Not authenticated" (`POST /api/muse/upload`), and a referral-status fetch 401'd the same way — same root cause almost certainly blocks matching/messaging/booking for any user who hasn't yet logged out and back in once. Fix: `register` now calls `signInWithPassword` immediately after creating the account (same call `login` already makes) and returns that real session plus the new profile, matching `login`'s response shape. Fails open — if the sign-in call itself throws, the account still exists and `session` stays `null` rather than 5xx-ing an otherwise-successful signup. |

**To merge once the file is actually present:**
```
git fetch V:\Muse\_to_delete\round44-signup-session-fix.bundle muse-fix-delivery:bundle/round44
git merge bundle/round44
npx tsc --noEmit && npx vitest run && npx next build
```
(349/349 tests expected, clean build expected.) Then update the "Confirmed
merged" SHA above and delete this row, in the same commit as your merge.
**Given the severity (new signups are effectively broken in most authenticated
flows until they re-login), this one should jump the queue over any other
pending bundle.**

## Known open issues (not blocked on delivery, just unsolved)

- `/api/muse/match?limit=50` returns 0 live candidates for at least one real
  account — backend/Supabase-data issue, not a client bug. Discover falls
  back to the static demo deck when this happens.
- The dead legacy per-screen CSS block in `muse.css` (~lines 2248-2310,
  `.screen-discover.active` etc.) no longer matches any live DOM element —
  confirmed via direct DOM inspection on production. Harmless (nothing reads
  it) but worth deleting so it stops looking live to the next person editing
  that file.

## Protocol for any agent picking up this repo (Claude, wyzmind, or anything
running via opencode)

1. Read this file first, every time, before reading any other handoff doc.
2. Run the verification commands above. Don't take the SHA in this file on
   faith if it's been a while — re-check.
3. If someone (Torreé, a chat transcript, another agent) describes work as
   "done" that you can't find as a commit ancestor of `origin/main`, say so
   plainly and point here — don't assume you're missing context and don't
   silently redo the work from scratch. Ask where the bundle is.
4. If you finish new work and can't push it directly, say so explicitly, add
   a row to the pending table above in the same commit as your work, and
   don't mark anything "confirmed merged" until `git log --oneline -1
   origin/main` actually shows your commit as an ancestor.
