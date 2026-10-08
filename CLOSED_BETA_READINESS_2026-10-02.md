# Closed-beta and store readiness — 2026-10-02

## Release position

Muses has a strong automated engineering baseline but is **not yet cleared for
closed beta or store submission**. The earlier 1,000-point and 2,000-point
audits were valuable checklists, not release approvals. Their 7.31/10 baseline
cannot be raised to 10/10 by re-scoring source code: the remaining points are
production, device, provider, privacy, and recovery evidence.

## Evidence completed this pass

| Gate | Current evidence |
| --- | --- |
| Deployed source | `origin/main` is `10f6573`; GitHub reports successful Vercel deployment statuses for that SHA. |
| Type safety | `npm run typecheck` completed successfully in the isolated review worktree. |
| Unit tests | `84` test files and `1004` tests passed. Expected failure-path logs were emitted by negative tests. |
| Dependency risk | `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities. |
| CI coverage | Workflow includes lint, TypeScript, units, smoke, visual, accessibility, demo, security, SBOM, scheduled browser matrices, Lighthouse, ZAP, and deployment verification. |
| Browser review | Signed-in widths and key screens were reviewed; no horizontal overflow at 320/375/390/768/1440. Remaining visual findings are in `VISUAL_AUDIT_2026-10-02.md` and `CORNER_SYSTEM_AUDIT_2026-10-02.md`. |
| Migration-state gap | 0022, 0024, 0025, and 0026 are confirmed applied in production. |
| Native metadata | PR #2 adds iOS camera, microphone, photo-library, and while-in-use location usage descriptions. It awaits CI/review and merge. |

## Closed-beta exit gates

| Priority | Gate | Owner | Evidence required to close |
| --- | --- | --- |
| P0 | RLS and RPC hardening | ChatGPT + database reviewer | Tested migration on isolated Supabase branch; two-user/anon matrix; no broad public mutation policy; explicit EXECUTE grants; advisor re-check. |
| P0 | Isolated staging | Owner + ChatGPT | Separate Supabase and Stripe test configuration, preview environment variables, seeded test identities, and no production writes from preview. |
| P0 | Account deletion | App owner + ChatGPT | In-app request, publicly reachable deletion-request page, verified deletion/purge of database and storage objects, documented lawful retention. |
| P0 | Provider journeys | Owner + testers | Stripe checkout/webhook/refund, Stripe Identity return, email delivery, upload/moderation, push, OAuth, and booking flow proven in test mode. |
| P0 | Backup and restore | ChatGPT + owner | Timestamped restore into a scratch project, row-count/schema verification, and a retention/incident runbook. |
| P0 | Native device matrix | Owner + testers | iPhone and Android physical-device tests: fresh install, sign-up/login, permission allow/deny, camera, microphone, location, push, deep links, logout, delete account, offline/resume, payment return. |
| P1 | Observability and support | ChatGPT + owner | Uptime monitor, alert receiver, Sentry triage, error ownership, support SLA, and test incident drill. |
| P1 | App-store materials | Owner | Signed Apple/Google developer accounts, stable bundle IDs, icons/screenshots, privacy disclosures, age/content rating, support/privacy/deletion URLs, reviewer test account and review notes. |
| P1 | Store-policy UGC controls | Product + trust/safety | Visible report and block controls, moderator response procedure, child-safety contact/process, enforcement evidence, and an age-gate review. |
| P1 | Native quality | App owner | Merge PR #2, produce signed release candidates, validate native dependency builds, and test them on devices. |
| P2 | Visual polish | wyzmind | Daily-login card 24px corner handoff; mobile Discovery title/search and category-rail refinements; overlay re-check. |

## Store-specific requirements

Apple requires functional, final review builds, testable login access, and a
product that offers durable utility beyond a repackaged website. The current
Capacitor wrapper must therefore demonstrate native value in review: camera,
voice/video calls, push notifications, device permissions, haptics and robust
offline/resume behavior. Apple also requires account deletion to remove
user-generated material unless retention is disclosed and legally justified.

Google Play requires an in-app account-deletion path **and** a public web link
for account/data deletion, plus accurate Data Safety and deletion disclosures.
Because Muses hosts user-generated media and AI features, its reporting,
blocking, moderation, child-safety process, and disclosure materials must be
operational before submission.

## Current hard blockers

1. Production Supabase has broad public mutation policies, eight security
   definer RPC grants to anon/authenticated users, six mutable function search
   paths, and disabled breached-password protection. Some policyless RLS tables
   may be intentionally server-only, but that requires proof rather than an
   advisor dismissal.
2. Only the production Supabase branch exists. There is no approved isolated
   staging branch/project or production-safe test payment path.
3. No restore drill, current cron execution proof, alert receiver, or uptime
   monitor is configured.
4. Vercel environment enumeration is currently blocked by the local CLI's
   `127.0.0.1:9` proxy failure and the Vercel connector remains unavailable.
   This means the BOM/wrong-project/missing-variable audit is still open.
5. Native source includes an iOS and Android shell, but no physical-device
   release-candidate evidence, signing proof, store console metadata, or
   Android merged-manifest verification exists.

## Immediate sequence

1. Merge PR #2 only after its checks are green.
2. Fund or approve a temporary Supabase branch, then test RLS/RPC remediation
   before production migration review.
3. Create a non-production Stripe/Supabase staging path and run the complete
   provider journey matrix.
4. Configure monitoring and perform a restore drill.
5. Run the native device matrix and complete the two store console packages.
6. Re-run this evidence ledger on the final release candidate and only then
   assign a launch score.
