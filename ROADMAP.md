# Muse — S++ Roadmap (Platinum / 100/100)

Honest audit of what's missing between "works" (current) and "platinum" (target).
Current state is solid for closed beta: functional, feature-complete, reasonably secure, 89 automated tests passing, API auth-gated. But it is NOT yet production-grade — gaps are in observability, architecture, testing depth (happy paths), and operations.

---

## Tier 0 — Hardening (blocks "production-grade")

| # | Item | Why it matters | Effort |
|---|------|----------------|--------|
| 0.1 | **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy via `headers()` in next.config.ts | `next.config.ts` has NO headers config. Zero protection against clickjacking/XSS/MIME-sniffing. | Low |
| 0.2 | **Sentry error monitoring** — `errorTracker.ts` is a stub ("ready for Sentry"). No @sentry deps. | You're flying blind: no visibility into production crashes. | Medium |
| 0.3 | **CI runs tests + audit** — `ci.yml` runs lint/typecheck/tests/build but NOT `npm audit`. | 89 tests run in CI; no dependency vuln scanning. | Low |
| 0.4 | **Accessibility audit** — no a11y testing, no aria audit, no keyboard/screen-reader pass. | Accessibility is both a legal exposure and a quality bar. | Medium |

## Tier 1 — Architecture & performance (the big debt)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 1.1 | **Split `page.tsx` (~3,800 lines)** — the monolith. Only MatchCard + MuseMap extracted. | Maintainability, build time, HMR speed. The single biggest technical debt. | **High** |
| 1.2 | **Data-fetching/caching layer** (SWR or React Query) — currently raw `fetch` everywhere, no cache, no revalidation. | Every render refetches; no optimistic UI, no stale-while-revalidate. | Medium |
| 1.3 | **Image optimization** — raw URLs from Supabase/Unsplash, no `next/image`, no CDN, no resize/compression. | Largest perf cost; images are unoptimized full-res. | Medium |
| 1.4 | **Bundle analysis + code splitting** — no `@next/bundle-analyzer`, no per-route splitting. | Page weight / first-load speed. | Low |
| 1.5 | **Validation layer** (zod) — no runtime validation of API inputs; only manual checks. | Input robustness, fewer 400/500s. | Medium |

## Tier 2 — Test coverage (89 tests passing: 46 unit + 22 integration + 21 E2E smoke)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 2.1 | **E2E tests** — 21 smoke tests cover request-safety/health/checkout-auth/geocode contracts, but no full user flows (onboard → discover → match → book). | Catch regressions across the actual flows. | High |
| 2.2 | **Integration tests: happy paths** — auth-reject, request-safety (413/415/400/4xx), health, geocode, checkout are covered. Upload/match/push/verification happy-path tests still need staging credentials. | API surface mostly tested; authenticated flows are not. | Medium |
| 2.3 | **Component tests** (testing-library). | UI logic coverage. | Medium |
| 2.4 | **Coverage enforcement** (80%+ threshold, block below). | Prevents silent regressions. | Low |
| 2.5 | **Visual regression** (Playwright screenshots / Chromatic). | Catches the UI glitches you've been manually finding. | Medium |

## Tier 3 — Feature depth (product completeness)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 3.1 | **Push notifications** — VAPID is referenced but not confirmed working end-to-end. | Re-engagement. | Medium |
| 3.2 | **Notification center UI** — notifications are stored but no dedicated UI. | Core UX gap. | Medium |
| 3.3 | **Read receipts + typing indicators** (Supabase Realtime). | Chat quality. | Medium |
| 3.4 | **Smart Photos** — reorder profile photos by engagement. | Tinder-style differentiator. | Medium |
| 3.5 | **Discovery algorithm v2** — LLM-based compatibility scoring (not just rules + static embeddings). | Core product quality. | Medium |
| 3.6 | **Collaborative albums** — shared albums. | Unique Muse feature. | High |
| 3.7 | **Booking calendar integration** (iCal/Google). | Booking usefulness. | Medium |
| 3.8 | **Product analytics** — no analytics lib wired; no funnel/retention visibility. | Growth decisions. | Medium |

## Tier 4 — Operations (run it like a real product)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 4.1 | **Staging environment** (separate Vercel env + Supabase). | Test before prod; you've been testing in prod. | Medium |
| 4.2 | **Uptime monitoring + status page** (UptimeRobot/BetterStack). | Know when it's down. | Low |
| 4.3 | **Backup/restore runbook** — Supabase PITR (Pro) + documented/tested restore. | Data safety. | Medium |
| 4.4 | **Load testing** (k6/Artillery). | Know your concurrency ceiling. | Medium |
| 4.5 | **Secrets rotation policy** + audit of who can access what. | Security hygiene. | Low |

## Tier 5 — S++ differentiators (beyond parity)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 5.1 | **Advanced AI** — LLM compatibility per match, personalized feed ranking, AI-curated discovery. | The "heavily AI backend" you wanted. | High |
| 5.2 | **Gamification** — streaks, badges, creator scores. | Retention. | Medium |
| 5.3 | **Community depth** — event RSVPs, group chat, live rooms. | Community retention. | High |
| 5.4 | **Performance budgets + Lighthouse CI** (enforced). | Protect the 100/100. | Medium |

---

## Suggested execution order (impact / effort)

1. **Tier 0.3** (npm audit in CI) — cheap, raises the floor.
2. **Tier 1.1** (split page.tsx) — the biggest lever on everything else; do it carefully with vision.
3. **Tier 2 happy paths** — upload/match/push/verification once staging env is wired.
4. **Tier 4** (ops) — staging + monitoring + backups.
5. **Tier 3** (features) — notifications, notification center, discovery v2, Smart Photos.
6. **Tier 5** (AI differentiators) — advanced matching, gamification.
7. **Tier 1.2–1.5** (perf) — caching, image optimization, validation, bundle.

---

## Already done (don't redo)

- Full OpenRouter AI layer (matching, moderation, support, admin brain) — live + seeded
- Stripe payments, Stripe Identity (age verify), Stripe Connect
- Security: rate limiting, auth, moderation, CSAM pipeline (detect → suspend → stage → auto-transmit)
- NCMEC ESP application submitted; DMCA registered (DMCA-1078382)
- Legal pages (ToS/Privacy/DMCA/Safety) + COMPLIANCE_HANDOFF.md
- SEO (robots, sitemap, OG 1200×630, 404), consolidated schema, awwwards motion layer
- **Security headers** (Tier 0.1) — CSP + HSTS + X-Frame-Options + nosniff + Referrer-Policy + Permissions-Policy on all routes
- **Sentry** (Tier 0.2) — wired end-to-end (client/server configs, global-error, Vercel env)
- **CI runs tests + audit** (Tier 0.3) — lint → tsc → vitest → `npm audit` → build
- **Coverage enforcement** (Tier 2.4) — thresholds in place
- **Email verification enforcement** — register sends confirmation email; login rejects unconfirmed
- **Realtime reconnect indicator** in chat
- **Chat message order fixed** (oldest-first)
- **Tests: 89 passing** (46 unit + 22 integration + 21 E2E smoke), `tsc` clean, run in CI
- **Staging Supabase project created** (`rwgofoxqycpzsvxfnozt`) + 49-table schema applied + keys in vault (Tier 4.1 — Vercel preview wiring pending)
- **3 schema bugs fixed** in `sql/MUSE_SCHEMA_FULL_20260813.sql` (TEXT=UUID RLS policy mismatches + orphaned seed sessions)
- **`/api/checkout` auth-gated** — resolves identity from verified Bearer token, 401s without, ignores client-supplied userId (5 checkout tests)
- **authFetch consolidated** — single canonical implementation in `src/app/(muse)/muse/lib/api.ts`; admin page, ModerationPanel, MyAlbumsManager, auth-client all share it
- **API request-safety tests** — 415 text/plain, 413 oversized, 400 missing params, malformed JSON → 4xx never 500, health no-store, geocode `lon` contract
- **Fake-data audit** — SessionsScreen fabricated bookings/requests → honest empty states; ChatScreen new-match empty state; BtsScreen moments already had empty states
- **Em-dash copy pass** — user-facing strings across modals, screens, onboarding, and offline page (comments/admin dashboards left as-is)
