# CODEX — TASK PACKET (Muse)

> Fourth-agent work queue. opencode (= Wyzmind) is the **sole integrator**: it reviews
> every diff, commits, pushes, applies migrations, changes deploy config, deploys, and
> records live evidence. **You (Codex / ChatGPT) own the database, migrations, RLS,
> Supabase operations, and the large-to-massive ops tasks** that should not be rammed
> through another agent's session.
>
> This packet stands alongside `CLAUDE_TASKS.md` (Claude takes the large-to-massive
> *code* refactors) and `AGENT_COLLABORATION_PROTOCOL.md` (the durable process contract).

## 0. STANDING DIRECTIVE (applies every session, non-negotiable)

1. **Maintain an ongoing task list.** At the start of every session, read this packet,
   `HANDOFF.md`, `DELIVERY_STATUS.md`, and `git status`; write down the full list of
   your open tasks, then work it top-down.
2. **Do not stop until every assigned task is done.** When a task finishes, pick the
   next open one. If you cannot finish one, record the exact blocker and move on, then
   say so plainly. "Assigned" means done, blocked-with-evidence, or handed back.
3. **Double-check everything you did.** Re-read your own diff, rerun the affected
   gates, and independently reproduce the result on the exact revision. Never accept
   your own prior summary as proof.
4. **Keep adding tasks.** If your work uncovers new DB/ops debt, add it to the list and
   keep going rather than declaring the lane empty.

## 1. HARD RULES (non-negotiable)

- **Never push to `main`, never migrate, deploy, or alter cloud config.** opencode owns
  all of that. Branch `codex/<topic>` and hand back per section 5.
- **Never use direct production DDL** as part of audit work. Migrations go through the
  verified workflow (disposable DB first).
- **Never commit secrets.** No `.env*`, no keys, no service-role values in code, logs,
  tests, handoffs, or screenshots. Vault is DPAPI (`.vault/`).
- **No em-dashes** in copy. Match the existing voice.
- **Never `git add -A`.** Stage explicit paths only.
- **Test before done.** Migration/advisor claims need disposable-DB evidence, not a
  clean `tsc`.

## 2. STATUS (2026-10-12) — read this first

**Repo:** `main` last verified at `312876c0`. Production live. Gates currently green:
`tsc 0` / `vitest 169 files / 1320 tests` / `next build` clean /
`node scripts/audit-gate.mjs` PASS.

**XL-1 (the rolling `any` purge) is DONE** by opencode this session: the whole repo is
now free of `any` type annotations except one deliberately-retained
`ActionContext.rest: Record<string, any>` in `src/lib/muse-actions/shared.ts` (tightening
it errors across 6 modules). Do not redo it. If you touch `shared.ts`, coordinate with
opencode first.

**Advisor state:** 0 security, 0 initplan, 0 multi-permissive (RLS hardened in `0035`-`0037`).
`unused_index` lints (~98) remain, mostly "no scans recorded yet" for the 36 FK indexes
added in `0038`.

## 3. ASSIGNED TO YOU (Codex) — large-to-massive ops work

**XL-DB-1 · Reconcile the `sql/MUSE_SCHEMA_FULL_*.sql` dumps with the migration chain.**
The dumps predate migrations `0001`-`0038`, so a fresh DB built from a dump does NOT
match a migrated DB. Produce a dump that equals the migrated schema: introspect the
live schema (or a disposable DB after `supabase db reset`), regenerate the dump, and
prove equivalence (diff the normalized schemas; no drift). Evidence: the exact commands,
the diff result, and the disposable-DB revision.

**XL-DB-2 · `unused_index` advisor triage (~98).**
Most are the `0038` FK indexes with no recorded scans. Do NOT drop blind. Measure usage
under real workload (or state that traffic is too low to decide, with the query you ran),
then for each index either (a) keep with a documented rationale, or (b) drop via a new
migration with rollback notes. Evidence: advisor count before/after, the usage query, and
which indexes you dropped and why.

**L-DB-3 · RLS/perf advisor maintenance.**
Keep security / initplan / multi-permissive at 0 as the schema grows. After any new
table or policy, re-run the advisors and add a migration that clears any new finding.
Evidence: advisor output before/after.

**M-DB-4 · Keep PR #11 staged and applied only through the verified migration workflow**
(disposable DB first, then the owner-approved production apply owned by opencode).

**BLOCKED (owner / billing-gated, do not attempt):**
- Supabase **branching** and **leaked-password protection** (Pro-plan gated; issue #12).
  Record the blocker and the exact upgrade path; do not enable.
- Anything requiring the Supabase dashboard on a plan the org does not have.

**Musa naming transition (evidence side only, after a mark is chosen):**
Do not bulk-rename. Own the transition checklist, evidence ledger, and
external-config/database naming review (see `AGENT_CONFERENCE_HANDOFF_2026-10-07.md`).

## 4. VERIFICATION GATES (must be green before you call a task done)

```
npx tsc --noEmit --incremental false
npx eslint <files-you-touched>            # 0 errors on your files
npx vitest run                            # all pass (currently 169 files / 1320)
npx next build                            # clean (needs OAUTH_STATE_SECRET set to any value locally)
# + disposable-DB integration evidence for any migration / advisor change
```

## 5. HOW TO HAND OFF

When a branch is green, write `_STATE/handovers/<date>-codex-to-opencode-<topic>.md`
(summary, exact files, the exact commands you ran and their output, migration state,
anything you could not finish or verify) and tell opencode. opencode owns the merge,
migration apply, and deploy. Keep `main` untouched by you.

Every handoff must end with the protocol footer:

```md
## Verification record
- Revision/worktree:
- Files changed:
- Commands actually run + exact result:
- Migration/environment/deploy state:
- Known failures or unverified assumptions:
- Next concrete owner/action:
```
