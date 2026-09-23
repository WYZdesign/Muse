# Muse — open-source-first cross-reference

This maps the existing 10 × 10 × 10 Muse audit to maintained open-source tools and standards. A decision at a subcategory applies to its ten leaf checks; no tool is considered proof that a manual/safety-sensitive leaf is correct.

## Decision policy

* **Adopt** means add a small, owned, CI-verifiable implementation now.
* **Evaluate** means a time-boxed local proof of concept; no production dependency yet.
* **Reject/defer** means it either does not solve the identified risk or imposes too much operational/licensing cost.
* Self-hosted does not mean maintenance-free. No user content, secrets, tokens, or production database may be sent to a test tool without explicit review.

## 1. Product UI and interaction quality

1.1 Navigation and shell — **Adopt Playwright** journeys for every primary navigation destination.
1.2 Discover card sequencing — **Adopt Playwright** stateful swipe/like/pass assertions; queued cards must be inert and not visually leak before animation completion.
1.3 Muses density — **Adopt Playwright screenshot baselines** for card/list/empty/error layouts at 320, 375, 390 and 452 CSS pixels.
1.4 Collab controls — **Adopt screenshots plus locator assertions** for the close/info buttons: adequate targets, no oversized decorative circles.
1.5 Network search — **Adopt visual + keyboard assertions** for visible field boundaries, focus, clear, empty and error states.
1.6 Sessions flows — **Adopt end-to-end path tests** from list to book, confirmation, exit/back and failed submission.
1.7 Modals/drawers — **Adopt Playwright** open/close/focus-return/escape/backdrop tests.
1.8 Animation and reduced motion — **Adopt test projects** for `prefers-reduced-motion` and screenshot animation disabling.
1.9 Responsive overflow — **Adopt CSS/DOM assertions** for no horizontal document overflow at the four mobile widths.
1.10 Design drift — **Evaluate Storybook + Loki only after component extraction**; do not migrate the 4k-line shell just to gain visual testing.

## 2. Accessibility and inclusive interaction

2.1 WCAG automated scan — **Adopt `@axe-core/playwright`** against every rendered screen and every opened modal/menu.
2.2 Keyboard navigation — **Adopt Playwright keyboard journeys** for tab order, Escape, focus trap and focus restore.
2.3 Screen-reader names — **Adopt Playwright ARIA snapshots/role locators** and manual NVDA/VoiceOver spot checks.
2.4 Hidden animation labels — **Fix directly, then test**: hidden LIKE/NOPE/SUPER presentation must not enter the accessibility tree; announce the result via a deliberate live region if useful.
2.5 Icons/decorative SVG — **Fix directly, then lint/test**: explicitly mark decorative art `aria-hidden` and `focusable=false`.
2.6 Focus visibility — **Adopt forced-focus visual tests**; never remove visible keyboard focus.
2.7 Touch target sizing — **Adopt DOM geometry checks** for actionable controls, with a documented exception only for the skip link.
2.8 Color/motion/text zoom — **Adopt Lighthouse/axe plus manual browser zoom review**; automated tools cannot certify cognitive usability.
2.9 Forms and validation — **Adopt error-state axe tests** and assert associated labels/descriptions.
2.10 Settings — **Do not make baseline accessibility toggleable.** Offer optional preferences (reduced motion, contrast/theme, font scale) while keeping semantic controls/focus/labels always on.

## 3. Content, media, and user safety

3.1 Image upload — **Fix server policy first**: in non-demo production, no configured scanner must not silently become “safe.”
3.2 Video moderation — **Reject OSS-only classifier as release proof.** Build private quarantine, persisted jobs, audit trail and promotion state before exposing video.
3.3 Video formats — **Evaluate FFmpeg** only in an isolated worker for WebM validation/transcode to a provider-compatible format; use a license-reviewed LGPL-only build.
3.4 Unsafe media — **Adopt durable state machine** (`pending`, `approved`, `rejected`, `errored`, `expired`) and idempotent workers.
3.5 Private albums — **Adopt ownership-scoped storage deletion/retry jobs**; never accept arbitrary bucket paths from a client.
3.6 Abuse/report/block — **Adopt integration tests** for report isolation, block effects and staff-only review access.
3.7 Consent/recording — **Adopt server-side consent preconditions** and test all denial/revocation paths before Egress or recording starts.
3.8 Age gate — **Adopt fail-closed DB/RLS integration tests**; a lookup failure cannot mean approved.
3.9 Safety auditability — **Evaluate OpenTelemetry traces** with no user-content payloads, only IDs/statuses and redaction tests.
3.10 Human review — **Defer automation claims.** A responsible high-risk moderation operation still needs documented human escalation, retention and appeal procedures.

## 4. Authentication, identity, and authorization

4.1 Session/auth transitions — **Adopt Playwright + MSW** success, expired, signed-out and refresh failure journeys.
4.2 MFA — **Adopt route tests** for enroll/challenge/verify/unenroll authentication and rate limits; do not mock away authorization.
4.3 Account deletion — **Adopt pgTAP + route tests** for suspend-now, recover-window, 30-day purge and storage cleanup.
4.4 Profile ownership — **Adopt pgTAP RLS tests** for owner, other authenticated user, anonymous and service role.
4.5 Album/media authorization — **Adopt pgTAP plus signed-URL integration tests**; raw private object URL must remain denied.
4.6 Call authorization — **Adopt route-level tests** for membership, age, consent and failure-closed database errors.
4.7 Admin/service roles — **Adopt explicit service-only tests** and ensure browser bundles never contain service credentials.
4.8 Password/reset/public endpoints — **Adopt MSW/route contract tests** for generic non-enumerating responses.
4.9 RLS matrix — **Evaluate `rlsautotest` on local Supabase only**, review generated pgTAP, then commit owned pgTAP tests. It is beta; never point it at production.
4.10 Policy drift — **Adopt migration-to-test CI** that starts from an empty local database and runs RLS tests after all migrations.

## 5. Data privacy, retention, and storage

5.1 Data minimization — **Adopt static review checklist**; no generic OSS tool can decide whether a field is necessary.
5.2 Storage access — **Adopt local integration tests** for public/private buckets and expiry/authorization of signed URLs.
5.3 Deletion lifecycle — **Adopt scheduled-worker idempotency tests** and durable cleanup records.
5.4 Email privacy — **Fix directly**: opaque expiring unsubscribe token; non-mutating GET; idempotent POST.
5.5 Waitlist integrity — **Adopt migration/route race tests** for normalized unique index and conflict-safe insert.
5.6 Analytics consent — **Evaluate self-hosted PostHog only after a minimal event schema and opt-out behavior are specified.** Avoid session replay until its privacy threat model is approved.
5.7 Observability redaction — **Adopt structured-log redaction unit tests** for email, token, message, location and media URL fields.
5.8 Backup/restore — **Adopt restore drills on disposable data**; a backup job alone is not recovery evidence.
5.9 Data export — **Defer until product policy/format is specified**, then test authorization and no foreign data leakage.
5.10 Privacy evidence — **Adopt machine-readable retention and deletion test reports**, but do not call them legal compliance certification.

## 6. API, backend, and operational reliability

6.1 Route contracts — **Adopt MSW** where frontend tests need consistent network success/error/latency contracts; retain route tests for real authorization.
6.2 Input validation — **Adopt Semgrep Community Edition** rules plus existing schema tests for unsafe parsing, headers, redirects and secrets.
6.3 Error handling — **Adopt tests** for safe public errors and structured internal context without PII.
6.4 Idempotency — **Adopt integration tests** for upload promotion, cron retries, deletion and payment-adjacent mutations.
6.5 Rate limits — **Keep the current durable Postgres limiter**; do not replace it with an in-memory npm limiter in serverless. Test store outage as fail-closed.
6.6 Scheduled jobs — **Adopt unit tests** for every cron secret/missing-secret/incorrect-token path and local schedule smoke tests.
6.7 Queue/worker needs — **Evaluate BullMQ only if an always-on Redis/Valkey worker is intentionally operated.** Do not add a queue merely for fashion.
6.8 Webhooks — **Adopt signature, timestamp/replay and idempotency tests**; OpenSSF Scorecard flags unauthenticated webhook exposure as critical.
6.9 Caching — **Adopt cache-control tests** for public profiles versus authenticated/private pages.
6.10 Demo mode — **Adopt a mutation-denial contract suite**: no side effects, no real provider call, obvious user messaging.

## 7. Application security and supply chain

7.1 SAST — **Adopt Semgrep CE** in CI with curated Next/TypeScript rules; triage findings, do not blindly block on initial noise.
7.2 Dynamic scan — **Evaluate OWASP ZAP baseline scan** against a disposable preview/demo environment; never attack production without scope approval.
7.3 Dependency upkeep — **Adopt Renovate** with weekly grouped patch/minor PRs, a 7–14 day minimum release age, and separate major PRs.
7.4 Vulnerability posture — **Adopt npm audit high severity plus OSV/Scorecard reporting**, with explicit documented exceptions only.
7.5 SBOM — **Adopt Syft/CycloneDX or SPDX output** as a release artifact; review unresolved license metadata manually.
7.6 Repository hardening — **Adopt OpenSSF Scorecard** and fix actionable findings: least-privilege Actions permissions, branch protection, security policy, pinned actions.
7.7 Secrets — **Adopt a local/CI secret scanner** (for example Gitleaks) with pre-commit/CI, but rotate any actual exposed secret rather than relying on detection.
7.8 CSP/headers — **Adopt integration assertions** for all required headers and report-only CSP before tightening enforcement.
7.9 Dependency licenses — **Adopt an allowlist review**. Prefer MIT/Apache/BSD; assess MPL/LGPL/AGPL before distribution/self-hosting. Never assume “open source” means no obligations.
7.10 Incident response — **Adopt SECURITY.md, private reporting, triage owner and restore/runbook drills.** Tooling cannot replace this.

## 8. Testing, release gates, and regression control

8.1 Type checks — **Adopt cache-free `tsc --noEmit` in CI**; current claimed green status is not enough unless it runs against the exact revision.
8.2 ESLint — **Fix configuration before trusting it**: TypeScript/TSX must parse and be linted, not globally ignored.
8.3 Unit tests — **Keep Vitest** and add tests beside risk fixes rather than chasing a raw count.
8.4 Browser flows — **Adopt Playwright projects** for demo, authenticated fixture, mobile and reduced-motion contexts.
8.5 Visual regressions — **Adopt Playwright `toHaveScreenshot`** in one consistent Linux CI environment; mask only truly dynamic regions.
8.6 Accessibility regressions — **Adopt axe per opened UI state**, because inactive menus/modals are not meaningfully scanned until opened.
8.7 Database tests — **Adopt local Supabase/pgTAP** with fresh migrations in CI.
8.8 Provider simulation — **Adopt MSW/stubs** for Stripe, media scanning, email, Egress and webhook failures; no live credentials in tests.
8.9 Flake control — **Adopt deterministic fixtures, clock/network controls and screenshot stabilization**; quarantine only with a tracked owner/expiry.
8.10 Release evidence — **Adopt a single checked release report** recording commit, migration IDs, test gates, preview URL and manual smoke results.

## 9. Performance, mobile, and resilience

9.1 Lab performance — **Adopt Lighthouse CI** against preview builds, with conservative budgets established from a clean baseline.
9.2 Real-user monitoring — **Evaluate Grafana Faro + OpenTelemetry only after explicit consent/redaction design.** Browser OTel remains experimental.
9.3 Load — **Evaluate k6 locally/staging** for auth, discovery read paths and scheduling APIs; AGPL is acceptable for internal use but needs license review if distributed.
9.4 Bundle control — **Adopt Next bundle analysis and a JS budget** before adding more client libraries.
9.5 Image/media delivery — **Adopt format/size/alt/caching tests** and defer video until quarantine/moderation is real.
9.6 Offline/PWA — **Defer Workbox/PWA** until offline data and private-cache threat model are defined; cached private media is risky.
9.7 Network failure — **Adopt Playwright/MSW offline, timeout and retry UI tests.**
9.8 Memory/long session — **Adopt manual Chrome performance profiles plus repeat navigation smoke tests**; no low-cost tool replaces this diagnosis.
9.9 Serverless limits — **Adopt documented timeout/size/concurrency probes** for upload and cron work; push heavy media to a worker.
9.10 Resilience messaging — **Adopt failure-state visual tests** so graceful degradation is actually usable on mobile.

## 10. Maintainability, modernization, and governance

10.1 Page composition — **Keep the recovered UI stable first.** Split only with parity tests; do not accept a compile-only placeholder regression.
10.2 React Compiler — **Evaluate after truthful lint plus visual/browser parity**, one feature at a time.
10.3 Next security updates — **Adopt prompt patch upgrades**, including aligning `eslint-config-next`; validate typecheck, tests, build and preview.
10.4 React 19.3 — **Evaluate stable View Transitions** only for measured Discover/screen changes with reduced-motion fallback.
10.5 TypeScript 6 — **Evaluate in a dedicated spike**, inventory breakage; do not bundle with functional work.
10.6 Component documentation — **Defer Storybook until extraction creates reusable components.**
10.7 Feature flags — **Reject adding Unleash now**: self-hosting an AGPL service is unjustified while demo mode and simple server config are sufficient.
10.8 Analytics — **Defer PostHog self-hosting** until event minimization, opt out and operational capacity are agreed.
10.9 Observability backend — **Defer full Grafana/Loki/Tempo stack** until reliable structured logging and incident response need it; start with OpenTelemetry-compatible boundaries.
10.10 Open-source governance — **Adopt a dependency intake template**: purpose, alternatives, maintenance, license, data path, bundle/server cost, removal plan and owner.

## Adoption order (not a shopping list)

**Wave 1 — immediate release gates:** truthful ESLint; Playwright mobile/stateful flows; axe scans; screenshots; local Supabase pgTAP for RLS/storage/retention; CI cron and demo-mode tests; Lighthouse CI; Next security patch.

**Wave 2 — security/operations:** Semgrep CE; Renovate; SBOM; Scorecard; Gitleaks; ZAP baseline on isolated preview; explicit webhook/idempotency coverage.

**Wave 3 — only after Wave 1 evidence is clean:** rlsautotest local generator pilot; OpenTelemetry server traces/redaction; k6 staging suite; FFmpeg worker proof.

**Explicit non-substitutes:** no OSS classifier may be used to claim production-grade safety moderation without a reviewed threat model; no visual/a11y tool replaces keyboard/screen-reader manual tests; no self-hosting removes infrastructure/backup/incident responsibility.

## Source and license verification

* Axe core — MPL-2.0: https://github.com/dequelabs/axe-core
* Playwright — Apache-2.0: https://github.com/microsoft/playwright
* Supabase — Apache-2.0: https://github.com/supabase/supabase
* pgTAP: https://pgtap.org/
* rlsautotest — Apache-2.0, beta: https://github.com/unitautogen/rlsautotest
* MSW — MIT: https://github.com/mswjs/msw
* Lighthouse CI — Apache-2.0: https://github.com/GoogleChrome/lighthouse-ci
* Semgrep CE — LGPL-2.1: https://semgrep.dev/products/community-edition
* OWASP ZAP — Apache-2.0: https://github.com/zaproxy/zaproxy
* OpenSSF Scorecard: https://github.com/ossf/scorecard
* Renovate: https://github.com/renovatebot/renovate
* OpenTelemetry JS: https://opentelemetry.io/docs/languages/js/
* Grafana OSS: https://grafana.com/oss/
* k6 — AGPL-3.0: https://github.com/grafana/k6
* FFmpeg — LGPL by default, optional GPL components: https://github.com/FFmpeg/FFmpeg/blob/master/LICENSE.md
