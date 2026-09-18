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

## Confirmed merged, last verified at: `0f540ba`

Everything at or before this commit is real, live, deployed code — this
includes round 37 (sessions/search/scrolltop/matchpct/customrole), round 38
(6 dark/6 light themes, splash wave fix), a match-percentage-badge color fix
(`.match-badge` now uses `var(--gold)`), Torree/wyzmind's own fixes for
Discover-page card scroll, wave vertical position (corrected in the round-42
bundle below — see its entry for why), and tutorial-popup first-time-only
behavior, round 39/40 (scroll-fade, Muses icon drop, availability/boost fixes,
forum pin, wave-breakpoint responsive fix), round 41 (the `.match-fab-scrim`
click-block fix plus the `AGENTS.md` wake-up-briefing rewrite), round 42
(match badge now tappable at z-index 7 with matching dark-glass styling,
`.wave-bottom` back flush to the bottom with height 22%→36% and a 4th stacked
wave layer for fullness), round 44 (signup now returns a real session —
`POST /api/muse/auth` with `action=register` now calls `signInWithPassword`
after creating the account so new users are authenticated immediately;
fails open — account still exists even if sign-in throws), and Torree/wyzmind's
own `0f540ba` (removed the "You Connected!"/hearts match-animation variant,
gold centered title).
All confirmed merged — this specific SHA verified 2026-09-18 by fetching
`origin/main` directly and diffing actual file content (not trusting commit
messages), and re-running `tsc`/`vitest`/`next build` clean after merging each
into this session's own branch. No action needed on any of these.

**⚠️ Outstanding non-git action from round 37**: `sql/MUSE_CUSTOM_ROLE_PENDING_20260916.sql`
still needs to be run in the Supabase SQL editor (adds `custom_type_pending`/
`custom_style_pending` columns to `muse_profiles`) — this can't be verified
via `git log` since it's a database change, not a commit. If unsure whether
it's been run, check directly: `SELECT column_name FROM information_schema.columns
WHERE table_name='muse_profiles' AND column_name IN ('custom_type_pending','custom_style_pending')`.
Until it runs, saving a custom "Other" type/style will fail.

## Pending delivery — NOT in the codebase yet

**Bundle: `muse-round45-round46-delivery.bundle`** (branch `muse-fix-delivery`, built on top of confirmed-merged `0f540ba` above). Two rounds, delivered together since round46 had to be rebased onto round45 anyway:

- **Round 45** (commit `5c08505`, rebased) — the verify-banner z-index fix, the booking-error-swallowing fix in `SessionsScreen.tsx`, the stale-sessions-list-after-booking fix, and the match-title apostrophe fix (`It's a Match!` / `It's a Connection!` with real apostrophes, not `&apos;` entities). This round conflicted with wyzmind's own `0f540ba` (both touched the match-title ternary) — resolved by keeping wyzmind's hearts-variant removal *and* the apostrophe fix together; see `HANDOVER.md` for the full note.
- **Round 46** (new commit on top) — two independent fixes Torreé reported:
  1. **"Match failed" toast fix**: `doSwipe`'s match-like POST in `page.tsx` used `apiFetch`, which throws on any non-2xx response, so the `.then()` handler's `if (r.status === X)` branches were dead code — every failure (rate-limited, blocked, a real 500) fell into the same generic catch and showed "Match failed — try again" with no way to tell what happened. Switched to `authFetch` (resolves instead of throwing) and now shows distinct messages for 429 (rate limited — "swiping a bit fast"), 403 (blocked/suspended — server's own message), and other errors (server's own message or a generic fallback). This does not claim to have found *why* matches were failing (rate limiting from heavy same-IP test traffic vs. something else is still unconfirmed) — it makes the real cause visible next time it happens instead of hiding it behind one message.
  2. **10-variant match-celebration animation**, per Torreé's explicit request: `MATCH_VARIANTS` (10 entries, top of `page.tsx`) replaces the old ~3-variant system. Every variant has non-romance-themed copy ("It's a Connection!", "Creative Match!", "Let's Collaborate!", "New Connection!", "Match Made!", "Time to Create!", "Connection Found!", "You're a Match!", "Collab Unlocked!", "It's a Match!"), its own gradient built from existing site color tokens (`--pink`/`--coral`/`--peach`/`--lavender`/`--gold`/`--amber`/`--honey`/`--sunset-orange`/`--warm-cream`/`--golden-rose`/`--sunset`/`--sky`/`--mint`), and its own particle symbol set — all rendered through one generic `.match-title`/`.match-particles` CSS block (`muse.css`) driven by `--match-grad`/`--match-particle-color` custom properties set inline per variant, instead of a `.anim-variant-N` block per variant. Also removed the continuous scale-based "grow and shrink" title pulse (`matchPulse`) and a *second*, later-in-file, equal-specificity `.match-title{animation:matchZoom...}` rule that was silently winning the cascade and was the actual live cause of that complaint — both replaced with pure opacity fades (`matchTitleFade`, `matchParticleFade`, and a fade-only `matchIn` for the overlay entrance). `matchAnimVariant` is now randomized over `MATCH_VARIANTS.length` (0–9) instead of a hardcoded `*4`.

`tsc --noEmit`, `vitest run` (349/349), and `next build` all clean on this branch after rebasing onto `0f540ba`. Sitting in `V:\Muse\_to_delete\muse-round45-round46-delivery.bundle` — merge both commits into `origin/main`, then update this file's "Confirmed merged" SHA and clear this section.

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