# Muse — S++ Roadmap (Platinum / 100/100)

Honest audit of what's missing between "works" (current) and "platinum" (target).

**Last reconciled: 2026-10-08.** Numbers below were measured on this date, not remembered.

**Where it actually stands (measured 2026-10-08):**

| Gate | Result |
|------|--------|
| `npm run typecheck` | 0 errors |
| `npm test` | **1301 tests / 166 files, all passing** |
| `npm run build` | clean |
| `npm audit --omit=dev --audit-level=high` | **1 high, `next` only** — reviewed and allowlisted, see "Dependency audit" below |
| CI jobs | **green** (the `Security Audit` job now fails only on *unreviewed* high/critical, so `deploy-check` runs again) |
| Sentry (`wyz-designtm/muse`) | **0 unresolved issues, last 14 days** |
| Supabase advisors | **99 lints, all informational** (36 `unindexed_foreign_keys`, 63 `unused_index`); 0 security, 0 multi-permissive, 0 initplan |

Muse is feature-complete and reasonably secure for closed beta. What remains is
observability polish, performance work, product depth, and ops maturity — not
broken plumbing.

### Dependency audit (owner-blocked `next`, now gate-able)

`npm audit` reports a `next` cluster (SSRF in image optimization, SSG/ISR cache
poisoning, and four lower advisories). The only fix is `next@16.4.0`, which
**breaks Vercel with `Invalid Version:`** — already tried and reverted
(`revert(deps): next back to 16.3.6`). It needs a dedicated session (upgrade +
lockfile + `vercel.json` reconciliation), not a drive-by `npm audit fix --force`.

Instead of leaving CI red forever, the two audit steps were replaced with
`scripts/audit-gate.mjs`: it allowlists those specific, hand-reviewed **GHSA ids**
(never a package name), so a *new* advisory anywhere — including inside `next` —
still fails the job. The gate self-tests its own FAIL path every run. Remove the
allowlist entries when the next upgrade lands.

Consequence: `deploy-check` runs again (it has `needs: [..., security-audit, ...]`).

---

## Tier 0 — Hardening (blocks "production-grade")

| # | Item | Status (2026-10-08) |
|---|------|---------------------|
| 0.1 | **Security headers** — CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy via `headers()` | **DONE** — live on all routes |
| 0.2 | **Sentry error monitoring** | **DONE** — client/server configs, `global-error`, Vercel env; **0 unresolved issues in 14 days** |
| 0.3 | **CI runs tests + audit** | **DONE** — lint → tsc → vitest → `npm audit` (prod + full, hard gates) → build. Currently red only on the blocked `next` advisory above. |
| 0.4 | **Accessibility audit** | **DONE** — `tests/e2e/accessibility.spec.ts` (axe) runs in CI as its own job, artifacts uploaded; native-control pass done |

## Tier 1 — Architecture & performance (the big debt)

| # | Item | Status / Why it still matters | Effort |
|---|------|-------------------------------|--------|
| 1.1 | **Split `page.tsx`** | **FROZEN at 1219 lines** by `page-size-budget.test.ts`. Splitting it for real (MatchCard + MuseMap already extracted) is the single biggest remaining lever on HMR/build time. Do it with vision verification, never blind. | **High** |
| 1.2 | **Data-fetching/caching layer** (SWR or React Query) | **OPEN.** Raw `fetch` everywhere; no cache, no revalidation, no optimistic UI. | Medium |
| 1.3 | **Image optimization** | **OPEN.** Raw Supabase/Unsplash URLs, no `next/image`, no resize. Largest perf cost. | Medium |
| 1.4 | **Bundle analysis + code splitting** | **OPEN.** No `@next/bundle-analyzer`. | Low |
| 1.5 | **Validation layer (zod)** | **DONE** — `src/lib/validate.ts` schemas + REST action schemas across ~50 mutating actions; `/api/muse` runs `validateRest`. | — |

## Tier 2 — Test coverage (1301 passing: unit + integration + E2E smoke)

| # | Item | Status | Effort |
|---|------|--------|--------|
| 2.1 | **Full user-flow E2E** (onboard → discover → match → book) | **OPEN** — smoke + discover-deck + demo-mode + visual-regression + a11y exist; no end-to-end booking flow. | High |
| 2.2 | **Authenticated happy-path integration tests** (upload/match/push/verification) | **OPEN** — need staging credentials. | Medium |
| 2.3 | **Component tests** (testing-library) | **OPEN** — screen sizes are frozen by line-count budgets, component behavior is not covered. | Medium |
| 2.4 | **Coverage enforcement** | **DONE** — thresholds in vitest config (lines 86 / statements 81 / …), enforced in CI via `npm test -- --coverage`. | — |
| 2.5 | **Visual regression** | **DONE** — `tests/e2e/visual-regression.spec.ts`, snapshot artifacts uploaded, mobile viewport matrix in CI. | — |

## Tier 3 — Feature depth (product completeness)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 3.1 | **Push notifications** — VAPID referenced, not confirmed end-to-end | Re-engagement. | Medium |
| 3.2 | **Notification center UI** — stored, no dedicated UI | Core UX gap. | Medium |
| 3.3 | **Read receipts + typing indicators** (Realtime) | Chat quality. | Medium |
| 3.4 | **Smart Photos** — reorder by engagement | Differentiator. | Medium |
| 3.5 | **Discovery algorithm v2** — LLM compatibility scoring | Core product quality. | Medium |
| 3.6 | **Collaborative albums** — shared albums | Unique Muse feature. | High |
| 3.7 | **Booking calendar integration** (iCal/Google) | Booking usefulness. | Medium |
| 3.8 | **Product analytics** — no analytics lib wired | Funnel/retention visibility for growth decisions. | Medium |

## Tier 4 — Operations (run it like a real product)

| # | Item | Status | Effort |
|---|------|--------|--------|
| 4.1 | **Staging environment** | **PARTIAL** — staging Supabase project `rwgofoxqycpzsvxfnozt` created, 49-table schema applied, keys in vault. Vercel preview env wiring still pending. | Medium |
| 4.2 | **Uptime monitoring + status page** (UptimeRobot/BetterStack) | **OPEN** — nothing external knows when Muse is down. | Low |
| 4.3 | **Backup/restore runbook** | **DONE** — `MUSES_RESTORE_RUNBOOK_2026-10-03.md` + documented restore **drill**, `.github/workflows/backup.yml` repaired (was silently broken). Re-drill quarterly. | — |
| 4.4 | **Load testing** (k6/Artillery) | **OPEN** — concurrency ceiling unknown. | Medium |
| 4.5 | **Secrets rotation policy** + access audit | **PARTIAL** — env audit written (`_STATE/MUSE_ENV_AUDIT_2026-10-08.md`), every code-referenced var mapped; rotation cadence not defined. | Low |

## Tier 5 — S++ differentiators (beyond parity)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 5.1 | **Advanced AI** — LLM compatibility per match, personalized feed ranking | The "heavily AI backend" you wanted. | High |
| 5.2 | **Gamification** — streaks, badges, creator scores | Retention. | Medium |
| 5.3 | **Community depth** — event RSVPs, group chat, live rooms | Community retention. | High |
| 5.4 | **Performance budgets + Lighthouse CI** (enforced) | Lighthouse job already runs in CI; make budgets blocking. | Medium |

### Database hygiene — 0035 to 0037 applied

| Item | Status | Effort |
|------|--------|--------|
| `auth_rls_initplan` (per-row `auth.uid()` evaluation) | **DONE 2026-10-08** — migration `0035_wrap_rls_initplans.sql` re-wrote all 64 flagged policies; advisor 64 → 0, policy set unchanged (94), 9/9 impersonation probes identical. | — |
| `multiple_permissive_policies` (25) | **DONE 2026-10-08** — migrations `0036` + `0037` collapsed every (table, command, role) collision to a single policy carrying the union predicate. Policies 94 → 81, advisor lint 25 → 0. Verified with read-only role probes (anon / owner / non-owner / service_role): no role gained or lost access; the only deltas were `anon` going from a privilege error to an empty result (a deny either way). | — |
| Waitlist duplicate-response disclosure | **DONE 2026-10-08** — `POST /api/muse/waitlist` no longer returns a stranger's `position`/`referralCode`/`shareUrl` on a 409. The endpoint is unauthenticated, so returning those let anyone read another user's invite code by submitting their email. | — |
| `unused_index` (63) / `unindexed_foreign_keys` (36) | **OPEN** — drop/measure, then index the FKs the hot paths actually join on. Informational only; the advisor reports zero security findings. | Low |

---

## Suggested execution order (impact / effort)

1. **Next.js upgrade session** — drop the `audit-gate.mjs` allowlist entries and delete the workaround. Everything else is downstream of that.
2. **Tier 4.2** (uptime monitoring) — cheapest thing that turns "I think it's up" into knowledge.
3. **Tier 1.1** (split page.tsx) — biggest lever on build/HMR; do it with vision verification.
4. **Tier 2.1–2.2** — full user-flow E2E + authenticated happy paths, once staging creds are wired (Tier 4.1 remainder).
5. **Tier 4.4** (load testing) before any public launch.
6. **Tier 3** — notifications, notification center, discovery v2, Smart Photos.
7. **Tier 5** — advanced matching, gamification.
9. **Tier 1.2–1.4** (perf) — caching, image optimization, bundle analysis.

---

## Already done (don't redo)

**Product / compliance**
- Full OpenRouter AI layer (matching, moderation, support, admin brain) — live + seeded
- Stripe payments, Stripe Identity (age verify), Stripe Connect
- Security: rate limiting, auth, moderation, CSAM pipeline (detect → suspend → stage → auto-transmit)
- NCMEC ESP application submitted; DMCA registered (DMCA-1078382)
- Legal pages (ToS/Privacy/DMCA/Safety) + `COMPLIANCE_HANDOFF.md`
- SEO (robots, sitemap, OG 1200×630, 404), consolidated schema, awwwards motion layer
- **Waitlist with referral codes** — per-signup `referral_code`, position math that counts referred signups (`waitlist-queue.ts`), `?ref=` attribution, unique-violation → 409 with existing slot, shareable invite link in the landing flow. The 409 returns no slot data (unauthenticated endpoint).
- **Password baseline** — shared `password-policy.ts`: min 12 chars, 3-of-4 character classes (space does not count as a symbol), whitespace-only + placeholder + repeated-char rejection, wired into register, reset-password, and Settings with one shared rule label
- **Em-dash copy pass** — user-facing strings across modals, screens, onboarding, offline page

**Security / ops**
- **Security headers** (Tier 0.1), **Sentry** (Tier 0.2), **CI test + audit** (Tier 0.3)
- **Env audit** — every one of the 48 code-referenced-but-unset Vercel vars triaged; `UNSUBSCRIBE_SECRET` generated + set in all 3 envs + vaulted; the rest are config defaults or owner-gated (`ANALYTICS_IP_HASH_SECRET`, `NCMEC_*`, `NEXT_PUBLIC_REVENUECAT_*`, `SOUNDCLOUD_*`, `GROQ_WHISPER_MODEL`, …)
- **RLS hardening** — `0031` (function privileges), `0032` (legacy permissive mutation policies), `0033` (app-referenced columns), `0034` (waitlist referral columns), `0035` (initplan wrapping), `0036` + `0037` (multi-permissive dedupe); migration ledger reconciled including the pre-runner `0000_baseline`
- **Dependency audit gate** — `scripts/audit-gate.mjs` (self-testing, GHSA-id allowlist) replaces the bare `npm audit` steps so CI is green without hiding new advisories
- **Deploy verification for docs-only pushes** — `vercel.json`'s `ignoreCommand` cancels the build when a commit touches no buildable path and Vercel then records no deployment, so the deploy job (which waits for READY on the exact SHA) could never pass for a docs push. It now replicates the same path comparison: nothing buildable changed + no READY deploy = PASS; a buildable commit with no deploy still fails. Verified on a docs-only push.
- **Backup/restore** — runbook + tested drill + repaired `backup.yml`
- **Staging Supabase project** created and schema-applied
- **`/api/checkout` auth-gated** — resolves identity from verified Bearer token, 401s without, ignores client-supplied userId (5 checkout tests)
- **authFetch consolidated** — single canonical implementation in `src/app/(muse)/muse/lib/api.ts`
- **API request-safety tests** — 415/413/400/malformed JSON → 4xx never 500, health no-store, geocode `lon` contract
- **Fake-data audit** — fabricated bookings/requests replaced with honest empty states
- **3 schema bugs fixed** in `sql/MUSE_SCHEMA_FULL_20260813.sql` (TEXT=UUID RLS mismatches + orphaned seed sessions)

**Testing / CI**
- **1301 tests / 166 files**, `tsc` clean, all run in CI
- Coverage thresholds enforced (Tier 2.4), visual regression (Tier 2.5), axe a11y job, demo-mode positive + negative mutation jobs, mobile viewport matrix, Lighthouse, Semgrep, gitleaks, SBOM, deploy-check
- Screen/page line budgets frozen (`screen-size-budget.test.ts`, `page-size-budget.test.ts`) so refactors can't silently balloon the monolith
