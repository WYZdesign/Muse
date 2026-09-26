# Muses by WYZ — expanded 2,000-point audit

**Framework:** 20 categories × 10 subcategories × 10 leaf checks = **2,000 checks**. This doubles the prior 1,000-point rubric by separating product, platform, operations, and evidence concerns that previously shared a category.

**Current evidence-based score: 1,461 / 2,000 (7.31 / 10).** This is a richer representation of the 731/1,000 calibrated score in `CHATGPT_1000_POINT_UPDATED_AUDIT_2026-09-25.md`, not an invented precision claim. Every point must be supported by source, test, live, or production evidence.

**Local evidence update — 2026-09-25:** Discover now keeps queued depth cards on their own cover image instead of reusing the active card's carousel index; this removes the observed photo-two-to-photo-one flash during a swipe. Prompt cards no longer expose a prompt-like spark control, and swipe feedback is visibly labelled **YES** / **NOPE** at the top-right. TypeScript passed. Regression cases were added, but browser execution is still **unverified** here because the sandbox cannot spawn Playwright browser binaries (`EPERM`); this update does not change the score until the change is committed, pushed, deployed, and browser-tested.

| # | Expanded category | /100 | Evidence basis | Highest-value next proof |
|---:|---|---:|---|---|
| 1 | Discover, ranking, and matching | 75 | live Discover + source/tests | Real ranking quality and mutation/error matrix |
| 2 | Profiles, social, collaboration, and bookings | 72 | source + smoke | Live booking, collaboration, and profile mutation paths |
| 3 | Responsive layout, visual hierarchy, and PWA shell | 74 | visual matrix + live browser | Installed-PWA top-gap confirmation after deploy |
| 4 | Native bridge, device behavior, and safe areas | 70 | source + simulator-level tests | Real iOS/Android device smoke suite |
| 5 | Semantic structure, control names, and keyboard use | 80 | axe + live AX tree | Manual screen-reader traversal across all flows |
| 6 | Dialogs, focus, motion, contrast, and zoom | 76 | focus-trap fixes + tests | Modal/mobile assistive-tech regression matrix |
| 7 | Component boundaries, state ownership, and typed UI | 62 | P1 extraction + source audit | Parity-tested P2 controller/hook extraction |
| 8 | Data client, errors, performance architecture, and docs | 58 | source audit | Typed request contracts and screen error boundaries |
| 9 | Authentication, authorization, and route contracts | 80 | integration/negative tests | Deployed session/role matrix |
| 10 | Payments, providers, background jobs, and support APIs | 78 | webhook/rate-limit/content tests | Live provider and cron negative-path proof |
| 11 | Secret hygiene, tenant isolation, and abuse controls | 74 | CI/security code/tests | Production secret inventory and RLS test matrix |
| 12 | Privacy, identity, storage access, and incident response | 70 | source/tests | Signed URL/RLS, age-gate, and runbook proof |
| 13 | Demo configuration, mutation denial, and provider isolation | 84 | broad source/test evidence | Deployed demo endpoint/provider-zero-write matrix |
| 14 | Demo disclosure, analytics, user messaging, and cron safety | 82 | source/tests | Production demo environment verification |
| 15 | Image/video/voice validation, moderation, and delivery | 60 | source/tests; blocker identified | Durable video result consumption and fail-closed cleanup |
| 16 | Deletion, retention, backups, migration, and governance | 62 | migration audit + source | Applied-state, purge, and restore-drill proof |
| 17 | Startup, recoverability, networking, and error telemetry | 74 | watchdog + regression evidence | Web Vitals, load, reconnect, and device benchmarks |
| 18 | Worker resilience, cache behavior, concurrency, and load | 70 | source/tests | Cron idempotency and sustained-load tests |
| 19 | Local gates, CI, test breadth, security scanning, and builds | 82 | 545 tests + CI remediation | Confirm new green run on the final production SHA |
| 20 | Deployment integrity, rollback, release records, and operations | 78 | ledger/source/live title | Exact SHA deploy check, rollback drill, and alerts |

## Expanded leaf-check catalog

Each category is assessed using ten subcategories, each with ten concrete checks. These are the active 2,000 audit points; a point is marked **proven**, **source-only**, **test-only**, **live-proven**, **production-proven**, or **open** in future passes.

1. Discover: candidate source, relevance, diversity, safety filters, score explanation, swiping, card isolation, empty state, retries, analytics.
2. Product workflows: profile edit/view, follow/connect, feed, messaging, briefs, sessions, community, search, preferences, destructive actions.
3. Web/PWA UX: 320/375/390/768 widths, installed PWA, browser/PWA parity, overflow, visual hierarchy, typography, touch targets, loading, theme, orientation.
4. Native bridge: Capacitor startup, deep links, push, camera/media, keyboard, safe area, offline, permission denial, app resume, device compatibility.
5. Core accessibility: landmarks, headings, labels, roles, tab order, keyboard activation, images, live regions, forms, skip links.
6. Advanced accessibility: modal traps, focus return, inertness, contrast, zoom, reduced motion, target sizes, announcements, error recovery, assistive-tech manual pass.
7. UI architecture: component composition, prop contracts, state ownership, hooks, types, duplicated logic, render boundaries, test seams, feature flags, migration strategy.
8. Platform architecture: API client, cache/schema, error boundaries, loading boundaries, telemetry, dependency health, build graph, docs, observability, performance budgets.
9. Core API security: auth, input validation, authorization, RLS assumptions, response contracts, errors, idempotency, rate limits, logging, tests.
10. Integration APIs: Stripe, OAuth, email, calls, AI, uploads, cron, admin, webhooks, provider failure behavior.
11. Security controls: secrets, session handling, CSRF/XSS, abuse prevention, request limits, audit logs, dependency scanning, CI permissions, tenant isolation, configuration.
12. Privacy controls: PII minimization, export/delete, media privacy, age/identity, consent, retention, legal copy, incident response, policy proof, production validation.
13. Demo enforcement: server flag, dispatcher denial, payment denial, identity denial, media denial, provider isolation, write prevention, test matrix, misuse handling, deploy proof.
14. Demo experience: banners/copy, analytics, social mutations, email/push, sessions, cron, storage, transition to real mode, observability, user tests.
15. Media pipeline: MIME/size, images, video, voice, scanning, review outcomes, signed delivery, retry, metadata, provider proof.
16. Data lifecycle: schema, migrations, account delete, storage delete, retention, cleanup jobs, backup, restore, governance inventory, access proof.
17. App reliability: bootstrap, cache busting, freeze recovery, fetch timeout, retries, offline messaging, telemetry, client errors, rendering cost, Web Vitals.
18. Service reliability: job retries, idempotency, queue durability, concurrency, cache invalidation, DB failure, provider failure, load, monitoring, disaster recovery.
19. Engineering gates: typecheck, lint, unit, integration, E2E, visual, accessibility, security, reproducible build, CI artifacts.
20. Release operations: SHA verification, deploy health, environments, rollback, change records, secret readiness, feature flags, alerting, incident runbooks, post-deploy QA.

## Rules for reaching 2,000 / 2,000

- A code change earns at most **source-only** credit until a relevant test proves it.
- A local test earns at most **test-only** credit until an equivalent deployed behavior is confirmed where deployment matters.
- Credentials, migrations, provider configuration, and production storage behavior require direct non-secret proof; they cannot be assumed from repository code.
- No release claim is valid until the final deployed SHA equals the reviewed commit and its health checks pass.


## Evidence updates — 2026-09-25 (post-baseline)

- **Waitlist correctness — verified source/test:** commits 8082e5e, 903f491, and 65c07db normalize/trim signup email addresses, reject malformed or non-text values before storage or email, add route regression coverage, and generate QR/copy/X sharing URLs from the deployed origin. Focused Vitest: **6/6 passed**; TypeScript: **exit 0**. The commits were re-read from GitHub. This is not production delivery proof.
- **Payment History accessibility — verified source/local gate:** commit 65ef799 adds dialog semantics, a labelled modal, Escape/focus-trap behavior, 44px close control, tab/tab-panel relationships, and a semantic transaction list. TypeScript: **exit 0**; focused ESLint: **0 errors** (pre-existing explicit-any warnings only). The remote file and commit were re-read from GitHub. Manual assistive-tech and deployed behavior remain unverified.
- **Admin waitlist promotion reliability — verified source/test:** commits b16fbc3 and df0cc07 validate request shape and bound batches to 50 members; malformed addresses are not emailed; and a member remains on the waitlist when beta-access email delivery fails so an administrator can retry. Focused Vitest: **9/9 passed**; TypeScript: **exit 0**; focused ESLint: **0 errors**. The remote route and tests were re-read from GitHub. Production email/provider behavior remains unverified.
- **Release evidence remains open:** local Git cannot refresh its fetch metadata (.git/FETCH_HEAD permission denied), the browser sandbox cannot spawn Playwright, and no exact-SHA production deployment proof has been obtained for these commits. Therefore the calibrated **1,461/2,000** score is deliberately unchanged.
