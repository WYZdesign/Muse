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

## Confirmed merged, last verified at: `fee7f51`

Everything at or before this commit is real, live, deployed code. No action
needed on any of it.

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
| `round37-sessions-search-scrolltop-matchpct-customrole.bundle` | `fee7f51` | Sessions button transparency, search-focus opacity, sessions tab color match, scroll-to-top nav, comprehensive match% badges, custom "Other" role/style + moderation queue |
| `round38-themes-wave-distinctness.bundle` | `fee7f51` (carries round 37's commits too — merging this one covers both) | 2 more dark themes (Cinder, Boreal) + 2 more light themes (Meadow, Frost), splash wave visual-distinctness fix |

**Update 2026-09-16 21:09 UTC: both bundle files are now confirmed physically
present at `V:\Muse\_to_delete\round37-...bundle` and `V:\Muse\_to_delete\
round38-...bundle`** — written directly via the device bridge once Torreé
reopened the Claude desktop app (earlier attempts failed with "device not
connected" because the app wasn't running; that was the actual root cause
of wyzmind's confusion, not missing/lost work). **They still need to be
merged** — presence in `_to_delete\` is not the same as being in the
commit history. Run the merge commands below, then update the "Confirmed
merged" SHA at the top of this file and delete these two rows in the same
commit as the merge.

**To merge once the files are actually present:**
```
git fetch V:\Muse\_to_delete\round38-themes-wave-distinctness.bundle muse-fix-delivery:bundle/round38
git merge bundle/round38
npx tsc --noEmit && npx vitest run && npx next build
```
(349/349 tests expected, clean build expected.)

**After merging:** run `sql/MUSE_CUSTOM_ROLE_PENDING_20260916.sql` in the
Supabase SQL editor (round 37's custom-role feature needs it) — then update
the "Confirmed merged" SHA above and delete the row(s) you just merged from
the pending table, in the same commit as your merge.

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
