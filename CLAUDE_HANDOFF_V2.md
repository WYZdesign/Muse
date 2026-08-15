# Muse — CLAUDE UPDATE PROMPT (v2, 2026-08-14)

You are resuming ownership of the **Muse** platform (muse.wyzdesign.com). You previously wrote `CLAUDE_HANDOFF.md`, `ROADMAP.md`, `OPS_RUNBOOK.md`, `COMPLIANCE_HANDOFF.md`, and `_audit_artifacts/PRODUCTION_READINESS_AUDIT.md`. Read all of those first — they are still accurate on architecture, product, legal, and the "already done" baseline. This doc is the *delta*: everything that changed since your last handoff, plus your explicit new assignment.

Operator context unchanged: "Asshole Efficiency" — no fluff, decisive, complete paste-ready diffs, "do it the right way fully," never expect manual edits, and **vision is still reserved for last**, so do all non-vision work now.

---

## 1. WHAT CHANGED SINCE YOUR LAST HANDOFF (do not redo these)

**Done & merged to `main` (Tier 0 + core hardening — all committed, built, deployed):**
- **Security headers** (Tier 0.1 ✅) — `next.config.ts` `headers()` now emits CSP (Supabase-domain-aware) + HSTS + `X-Frame-Options: DENY` + nosniff + Referrer-Policy + Permissions-Policy + X-DNS-Prefetch on ALL routes. Verified via live HTTP response headers.
- **Sentry wired** (Tier 0.2 ✅) — client/server configs, `global-error.tsx`, Vercel env.
- **CI runs tests + audit** (Tier 0.3 ✅) — `.github/workflows/ci.yml` runs lint → tsc → vitest → `npm audit` → build.
- **Email verification enforced** — `register` now sends a confirmation email (`email_confirm: false`) and `login` rejects unconfirmed users with `EMAIL_NOT_VERIFIED` (403).
- **Chat message order fixed** — `/api/muse` `get-messages` returns `ascending: true` (oldest-first).
- **Realtime reconnect indicator** — `subscribeToConversation` now exposes an `onStatus` callback; chat header shows a "Reconnecting…" banner on drop.
- **Tests: 46 unit/integration + 14 E2E smoke, all green** (added auth-route integration tests: validation + rate-limit).
- **3 real schema bugs fixed** in `sql/MUSE_SCHEMA_FULL_20260813.sql`: (a) legacy `muse_messages` SELECT policy comparing `TEXT match_id` to `UUID muse_matches.id`, (b) four `muse_reports`/`muse_blocks` policies comparing `TEXT` ids to `UUID` subqueries (cast to `id::text`), (c) orphaned demo `muse_sessions` seed rows referencing nil-UUID `host_id`.
- **Staging Supabase project** `rwgofoxqycpzsvxfnozt` — schema applied (49 public tables), anon + service-role keys in DPAPI vault (`MUSE_STAGING_ANON_KEY`, `MUSE_STAGING_SERVICE_ROLE_KEY`, `MUSE_STAGING_DB_PASS`, `MUSE_STAGING_PROJECT_REF`). DB host `db.rwgofoxqycpzsvxfnozt.supabase.co`.
- **Landing page + visual/UX fixes** (operator-driven; do not re-touch): awwwards-style + California sunset click-to-enter, Muses/matches revamp, desktop Discover card-stack fix, BTS/Moments feed, feed action buttons, nav indicator.

**Known active situation:**
- **GitHub Copilot is still committing to `main`** — pull `--rebase` before every push; expect conflicts on `page.tsx`/`muse.css`/landing.
- The **expandable match FAB / radial menu** was iterated and reverted by operator request (back to `a749f34` state). Do NOT touch it.

---

## 2. ACCURATE CURRENT STATE (evidence-based, supersedes stale claims)

- **Security headers are COMPLETE** — `next.config.ts` emits CSP + HSTS + X-Frame-Options + nosniff + Referrer-Policy + Permissions-Policy on ALL routes (verified). `src/proxy.ts` still adds API-specific CORS/nosniff — that's fine, leave it.
- **Testing gaps:** auth + support integration tests done. Still open: `upload`, `match`, `checkout`, `push`, `verification` route integration tests; component tests (testing-library); visual regression.
- **Production-readiness audit HIGH items:** chat order ✅, email-verify ✅, realtime reconnect ✅, `saveState` debounce already 2s (✅). Still open: profile photo upload using `FileReader` instead of `uploadImage()` (item #7 in the audit); `muse_error_logs` trace IDs (Sentry now covers most — document rather than build).
- **Staging:** project + 49-table schema + anon/service keys ✅. Remaining: fetch the *publishable* key (optional — the app's `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` actually consumes the anon key), and wire a Vercel preview/staging env pointing at staging.

---

## 3. YOUR ASSIGNMENT NOW

Do the following, in priority order, all **non-vision** (no pixel-level UI judgment required):

### A. Wire Vercel preview/staging env (finish Tier 4.1)
1. Point a Vercel preview/staging environment at the staging Supabase project (`rwgofoxqycpzsvxfnozt`): `NEXT_PUBLIC_SUPABASE_URL=https://rwgofoxqycpzsvxfnozt.supabase.co`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<MUSE_STAGING_ANON_KEY from vault>`, `SUPABASE_SERVICE_ROLE_KEY=<MUSE_STAGING_SERVICE_ROLE_KEY>`, `SUPABASE_SECRET_KEY=<same service-role key>`. Document the one-command deploy path in `OPS_RUNBOOK.md`.

### B. Finish staging (Tier 4.1)
2. Fetch the *publishable* key if present (otherwise document that the anon key serves as the public key).
3. Wire the Vercel preview/staging env (see §A.1) and document the deploy path.

### C. Integration tests (Tier 2.2) — highest-ROI, keep the streak going
4. Write route-level integration tests (vitest) for: `upload`, `match`, `checkout`, `push`, `verification` (auth + support already done). Follow the existing pattern from `support.route.test.ts` / `auth.route.test.ts` (mock the Supabase client + LLM, assert validation + success + failure + rate-limit paths). Every one of these has historically surfaced a real bug — treat green tests as the deliverable, not just the file.

### D. Production-readiness HIGH items (from the audit §2)
5. Fix profile photo upload to use the `uploadImage()` helper (currently client-only FileReader).
6. Document that `muse_error_logs` is superseded by Sentry (or wire trace IDs if you prefer).
7. Optionally thin the per-save `apiFetch` "sync" call in `saveState` (fires every 2s).

### E. Re-issue the roadmap docs
8. `ROADMAP.md` and `_audit_artifacts/PRODUCTION_READINESS_AUDIT.md` are already refreshed. Produce the phased **closed beta → open beta → rollout → 100k** roadmap with concrete sequenced items (you already have the skeleton; refresh with current reality).

---

## 4. DELIVERABLES (in this order)

1. Vercel preview/staging env wired + deploy path documented.
2. New integration tests green (`npm test`).
3. Profile-photo-upload fix.
4. Phased 100k roadmap.

Commit each logical chunk separately with clear messages. Pull `--rebase` before every push (Copilot is active). Do NOT touch the match FAB, the landing page visuals, or `page.tsx` structure (the monolith split is deferred until vision). If you hit a decision you can't make without info, ask a tight question instead of guessing.

Be honest about what's "works" vs "platinum." Go.
