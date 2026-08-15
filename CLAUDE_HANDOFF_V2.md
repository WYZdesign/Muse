# Muse — CLAUDE UPDATE PROMPT (v2, 2026-08-14)

You are resuming ownership of the **Muse** platform (muse.wyzdesign.com). You previously wrote `CLAUDE_HANDOFF.md`, `ROADMAP.md`, `OPS_RUNBOOK.md`, `COMPLIANCE_HANDOFF.md`, and `_audit_artifacts/PRODUCTION_READINESS_AUDIT.md`. Read all of those first — they are still accurate on architecture, product, legal, and the "already done" baseline. This doc is the *delta*: everything that changed since your last handoff, plus your explicit new assignment.

Operator context unchanged: "Asshole Efficiency" — no fluff, decisive, complete paste-ready diffs, "do it the right way fully," never expect manual edits, and **vision is still reserved for last**, so do all non-vision work now.

---

## 1. WHAT CHANGED SINCE YOUR LAST HANDOFF (do not redo these)

**Done & merged to `main`:**
- **Sentry wired end-to-end** (Tier 0.2 ✅) — `@sentry/nextjs` installed; `sentry.client.config.ts`, `sentry.server.config.ts`, `global-error.tsx`, and `next.config.ts` instrumentation all wired; DSN + auth token in DPAPI vault, `.env.local`, and Vercel.
- **CI now runs tests + audit** (Tier 0.3 ✅) — `.github/workflows/ci.yml` runs lint → `tsc --noEmit` → `npm test` → `npm audit --audit-level=high` → build.
- **Tests grew to 40 unit + 14 E2E smoke, all passing** — added: route-level integration tests (support route), moderation fail-open LLM-path tests, XSS-sanitizer tests, coverage enforcement thresholds. `npm test` (vitest) green; `npm run lint` clean; `npx tsc --noEmit` clean.
- **NCMEC manual CSAM fallback procedure** written (`NCMEC_MANUAL_FALLBACK.md`) — covers the window before ESP creds are approved.
- **Staging Supabase project CREATED** (Tier 4.1 partially ✅) — ref `rwgofoxqycpzsvxfnozt`, region us-west-2. Credentials `MUSE_STAGING_DB_PASS` and `MUSE_STAGING_PROJECT_REF` are in the DPAPI vault.
- **Landing page** fully rewritten twice (awwwards-style motion → then "California sunset click-to-enter" scene with animated bird flaps, shooting stars, ocean waves, crown icon, 3-line hero).
- **Visual/UX fixes** (operator-driven): Muses/matches screen revamp (sub-nav tabs Matches/Likes You, inline search, grid/list toggle), desktop Discover card-stack layout fixed (unclosed media-query brace was the root cause), BTS/Moments feed formatted, feed like/comment/repost buttons restyled as wide colored rectangles, redundant nav indicator removed.

**Known active situation:**
- **GitHub Copilot is still committing to `main`** alongside you — it's been doing landing-page and visual work. Pull with `--rebase` before every push; expect merge conflicts on `page.tsx`/`muse.css`/landing.
- The **expandable match FAB / radial menu** was iterated and then reverted by operator request — it is back to the original `a749f34` state. Do NOT touch it unless explicitly asked.

---

## 2. ACCURATE CURRENT STATE (evidence-based, supersedes stale claims)

- **Security headers are PARTIAL, not complete.** `src/proxy.ts` (Next 16 renamed `middleware.ts`) sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, and `Referrer-Policy` — **but only on `/api/*` routes** (matcher `"/api/:path*"`). The HTML pages have **NO CSP, NO HSTS, NO X-Frame-Options, NO Permissions-Policy**. Tier 0.1 is therefore still OPEN. `next.config.ts` has no `headers()` block.
- **Testing gaps remain:** no integration tests for auth, upload, match, checkout, push, verification routes (support is done). No component tests (testing-library). Visual regression not set up.
- **Production-readiness audit (2026-08-09) HIGH items are still open** — see `_audit_artifacts/PRODUCTION_READINESS_AUDIT.md` §2: profile photo upload using FileReader instead of `uploadImage()`, chat message order reversal, `muse_error_logs` unused, `saveState` debounce too aggressive (30 vars on every change), no Supabase Realtime reconnect UI, no email-verification enforcement.
- **Staging is half-done:** project exists but (a) the 47-table schema (`_DATA/MUSE_SCHEMA_FULL_20260813.sql`) is NOT applied, (b) API keys are not fetched/wired, (c) Vercel preview env is NOT pointed at staging.

---

## 3. YOUR ASSIGNMENT NOW

Do the following, in priority order, all **non-vision** (no pixel-level UI judgment required):

### A. Finish Tier 0 hardening
1. **Security headers for HTML pages** — add a `headers()` block in `next.config.ts` (or extend `proxy.ts` to non-API routes) with: CSP (tight but allow Supabase/Stripe/Sentry/OpenRouter/Unsplash/Maplibre domains + inline style hash since the app uses heavy inline styles), `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Verify with a real request to `/` and `/muse` after build.

### B. Finish staging (Tier 4.1)
2. Apply the 47-table schema to `rwgofoxqycpzsvxfnozt` (use the Supabase Management API query endpoint, PAT `SUPABASE_PAT` from vault; note the Management API needs a `User-Agent` header or it 400s).
3. Fetch staging anon/service/publishable keys, store in vault (`MUSE_STAGING_*`).
4. Wire a Vercel preview/staging env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) pointing at staging, and document the one-command deploy path.

### C. Integration tests (Tier 2.2) — highest-ROI, keep the streak going
5. Write route-level integration tests (vitest) for: `auth`, `upload`, `match`, `checkout`, `push`, `verification`. Follow the existing pattern from the support-route test (mock the Supabase client + LLM, assert validation + success + failure + rate-limit paths). Every one of these has historically surfaced a real bug — treat green tests as the deliverable, not just the file.

### D. Production-readiness HIGH items (from the audit §2)
6. Fix chat message order (server newest-first → reverse on client).
7. Enforce email verification before core app use (or at minimum confirm Supabase's built-in confirm-email flow is on and wire the gate).
8. Reduce `saveState` churn (raise debounce, split persistence keys, skip writes when no relevant key changed).
9. Add Supabase Realtime reconnect indicator in chat.
10. Wire `muse_error_logs` with trace IDs (or confirm Sentry covers it now that Sentry is live — if Sentry covers it, document that instead).

### E. Re-issue the roadmap docs
11. Update `ROADMAP.md` and `_audit_artifacts/PRODUCTION_READINESS_AUDIT.md` to mark 0.2, 0.3, and 2.4 (coverage) as done, and 0.1 + 4.1 as in-progress. Produce the phased **closed beta → open beta → rollout → 100k** roadmap with concrete sequenced items (you already have the skeleton; refresh it with current reality).

---

## 4. DELIVERABLES (in this order)

1. Security headers implemented + verified (show the actual response headers).
2. Staging project schema-applied + keys wired + deploy path documented.
3. New integration tests green (`npm test`).
4. The HIGH production-readiness fixes (chat order, saveState, realtime reconnect, email verify, error logging).
5. Refreshed `ROADMAP.md` + audit doc.

Commit each logical chunk separately with clear messages. Pull `--rebase` before every push (Copilot is active). Do NOT touch the match FAB, the landing page visuals, or `page.tsx` structure (the monolith split is deferred until vision). If you hit a decision you can't make without info, ask a tight question instead of guessing.

Be honest about what's "works" vs "platinum." Go.
