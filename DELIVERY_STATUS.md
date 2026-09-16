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

## Confirmed merged, last verified at: `cbd6cb0`

Everything at or before this commit is real, live, deployed code — this
includes round 37 (sessions/search/scrolltop/matchpct/customrole) and
round 38 (6 dark/6 light themes, splash wave fix), both confirmed merged by
wyzmind. No action needed on either.

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
| `round39-scrollfade-availability-boost-forumpin.bundle` | `cbd6cb0` | Horizontal-scroll edge fade (all themes), Muses "Interested" tab icon drop, real host-availability-probe bug fix, real boost-purchase-never-granted bug fix, forum post pin wiring. See `HANDOVER.md`'s round 39 entry for the full wiring-audit findings and the page.tsx/repo cleanliness assessment. |

**To merge once the file is actually present:**
```
git fetch V:\Muse\_to_delete\round39-scrollfade-availability-boost-forumpin.bundle muse-fix-delivery:bundle/round39
git merge bundle/round39
npx tsc --noEmit && npx vitest run && npx next build
```
(349/349 tests expected, clean build expected.) Then update the "Confirmed
merged" SHA above and delete this row, in the same commit as your merge.

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
