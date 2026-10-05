# Boardroom Readiness Audit — 5,000 Points

**Audit date:** 2026-10-04  
**Evidence baseline:** `origin/main` at `bcc2220def081faae8913f2f12319d531cb563d2`; GitHub CI run 37247627843; production Supabase project `ejbwjmzrazfgtisqsamf`; deployed Vercel status for `bcc2220`.  
**Purpose:** decision-grade readiness review for closed beta, LA launch, and the path to 100M users. Scores measure verified present capability, not intent. “10/10” means the listed subcategory has a repeatable owner, evidence, and a tested recovery path.

## Executive score

**Current score: 3,470 / 5,000 (69.4%)**

The product is past prototype quality: production is deployed, core app flows are covered by meaningful automated checks, checkout input validation and moderation foundations exist, and the codebase has recent structural cleanup. It is not yet closed-beta complete because dependency-security CI, backup execution, preview-deployment observability, real-device validation, and launch operations remain unproven.

| Domain | Score / 200 | Evidence and decision |
|---|---:|---|
| 1. Product thesis and positioning | 160 | Clear “convergence” proposition; final public naming and category language remain open. |
| 2. Target cohort and LA wedge | 125 | LA-first plan and baseline exist; recruitment funnel, partner list, and cohort cadence are not yet operating. |
| 3. Value proposition and onboarding | 145 | Core app flows exist; first-session completion and activation have not been measured with real people. |
| 4. Discovery, matching, and feed | 155 | Core screens and E2E coverage exist; production content is effectively empty, so social proof is unvalidated. |
| 5. Profiles and identity | 150 | Profile and image upload paths are implemented; identity quality and abuse resistance need real-cohort testing. |
| 6. Communities, events, and briefs | 145 | Data model and flows exist; creator/operator workflows and supply-side validation are pending. |
| 7. Messaging and notifications | 145 | Messaging/Realt ime foundation and retry work exist; deliverability and notification preference validation remain. |
| 8. Trust, safety, and moderation | 145 | Reporting, blocking, moderation surfaces and documented video gate exist; staffed moderation SLA is not established. |
| 9. Privacy, consent, and data rights | 145 | Privacy/terms routes and RLS review exist; data-subject request operations and final policy review remain. |
| 10. Authentication and account security | 140 | Email verification and auth work are present; no-cost password breach fallback requires implementation/verification. |
| 11. Payments, subscriptions, and entitlements | 140 | Checkout validation is tested; Stripe production lifecycle, refunds, tax, and failed-payment scenarios remain unproven. |
| 12. Data architecture and RLS | 150 | RLS classification and function hardening migration are verified; policy test execution remains pending. |
| 13. API contract and abuse resistance | 155 | Zod applied to checkout and acceptance cases; every priority route needs the same explicit validation inventory. |
| 14. Reliability and recovery | 105 | Restore runbook exists; scheduled backup currently fails and restoration has not been rehearsed. |
| 15. Security engineering | 130 | SAST, secret scanning, SBOM and production audit pass; full dependency-tree audit currently fails. |
| 16. Code quality and maintainability | 170 | `page.tsx` split is budgeted (~1,221 lines) and automated coverage has expanded; recurring review still required. |
| 17. CI/CD and release control | 135 | Main Vercel deployment verified; preview deploy fails and CI must become fully green. |
| 18. Test strategy and automation | 165 | Unit, build, lint, typecheck, demo, smoke, and accessibility suites are running; mobile visual/nightly full matrices are not routinely evidenced. |
| 19. Accessibility | 145 | Dedicated axe suite runs; manual keyboard, screen-reader, and reduced-motion review on real devices remains. |
| 20. Web performance and resilience | 130 | Build and Lighthouse workflow exist; recent real production performance evidence is missing. |
| 21. Mobile / app-store readiness | 105 | Capacitor wrappers and purpose strings exist; signed builds, real-device QA, store metadata, and policy submissions remain. |
| 22. Analytics, experiments, and learning | 90 | No verified launch KPI dashboard or experiment cadence. |
| 23. Support and incident operations | 105 | Support email and docs exist; owner rotations, escalation playbook, and response SLAs are not operational. |
| 24. Growth, marketing, and partnerships | 105 | Geographic progression is defined (LA → Chicago → NYC); launch asset system, partnerships, and referral proof remain. |
| 25. Governance, finance, and scale | 110 | Open-source preference and cost discipline are clear; legal entity, retention, capacity, and 100M operating model need decisions. |

## Scoring rubric and subcategories

Each domain is worth 200 points, scored as four 50-point subcategories: **design**, **implementation**, **verification**, and **operations**. This produces 25 × 4 × 50 = 5,000 reviewable points. No category may be called 10/10 until all four are evidenced.

### 1–5: Product and market
1. **Thesis:** audience clarity; differentiation; naming; category framing.  
2. **LA wedge:** seed supply; demand cohort; neighborhood sequencing; launch partnerships.  
3. **Onboarding:** comprehension; profile completion; first meaningful action; retention hook.  
4. **Discovery:** relevance; control; empty-state quality; safety/report placement.  
5. **Identity:** authenticity; expressive profile; image handling; account recovery.

### 6–10: Experience and trust
6. **Communities/events/briefs:** creation; discovery; hosting; conversion.  
7. **Messaging:** consent; delivery; retry; notification control.  
8. **Safety:** reporting; blocking; moderation queue; response SLA.  
9. **Privacy:** consent; policy clarity; deletion/export; data minimization.  
10. **Auth:** verified email; session handling; password resistance; abuse controls.

### 11–15: Revenue, platform, and security
11. **Payments:** plan integrity; webhook lifecycle; refunds; support operations.  
12. **Data/RLS:** table classification; policy tests; function privilege; migration recovery.  
13. **APIs:** schema validation; authorization; rate limiting; negative tests.  
14. **Reliability:** backup; restore; error monitoring; incident recovery.  
15. **Security:** dependency hygiene; SAST/secrets; vulnerability response; access review.

### 16–20: Engineering quality
16. **Maintainability:** module budgets; duplication; typed boundaries; review discipline.  
17. **Delivery:** protected main; reproducible build; preview visibility; rollback.  
18. **Tests:** unit; integration; E2E; test data/flake management.  
19. **Accessibility:** semantic controls; keyboard; assistive tech; motion/contrast.  
20. **Performance:** Core Web Vitals; device/network resilience; image/video budgets; observability.

### 21–25: Launch and scale
21. **Native:** real-device QA; permissions; store rules; release artifacts.  
22. **Learning:** north-star metric; funnel instrumentation; cohort analysis; experiments.  
23. **Operations:** help center; support routing; incidents; feedback loop.  
24. **Growth:** LA launch kit; referral loop; local partners; city-playbook portability.  
25. **Scale/governance:** cost model; moderation scaling; legal/retention; capacity planning.

## Priority sequence

### P0 — required before admitting a closed beta cohort
1. Resolve the full-tree `npm audit` failure with the exact advisory evidence; keep the hard gate.
2. Make scheduled backup succeed and run one documented restore rehearsal.
3. Diagnose the Vercel preview failure from its build logs; ensure previews become trustworthy.
4. Complete the current PR validation (accessibility + smoke E2E), then merge only after review.
5. Run a real-device web and Capacitor pass covering signup, image upload, report/block, payment test mode, logout, and recovery.
6. Establish staffed moderation and support response targets before inviting strangers.

### P1 — first 100 people in LA
1. Instrument invite → verified profile → first connection → seven-day return.
2. Recruit a deliberately bounded cohort and seed enough hosts/communities to avoid an empty feed.
3. Use weekly safety, support, retention, and qualitative review; ship only evidence-backed changes.
4. Publish a lightweight status/feedback channel and close the loop on reports.

### P2 — 500 to 1,000 people; Chicago then NYC
1. Prove LA retention and safety operations before opening the next city.
2. Package city launch playbook: partner outreach, seed supply, support/moderation coverage, and cohort gates.
3. Add controlled experiments for activation and referrals, with guardrails against spam and exclusion.

### P3 — 1,000 to 100M
1. Build capacity, incident, analytics, trust-and-safety, legal, and customer operations as dedicated systems.
2. Do not extrapolate a local-convergence product solely through acquisition; validate repeatable city economics and community health per market.
3. Re-score this audit after every launch phase; scores should rise only when evidence changes.

## Current iteration queue

| Order | Work | Owner boundary | Acceptance evidence |
|---:|---|---|---|
| 1 | Finish PR #3 test matrix and review | Codex proposes; release owner merges | CI green except only understood, approved gates |
| 2 | Retrieve Vercel preview build log | Vercel-access holder | Root cause and verified preview |
| 3 | Retrieve exact npm audit report | GitHub log access or local audit | Advisory, dependency chain, tested minimal upgrade |
| 4 | Repair scheduled backup | Secret/config owner plus code review | Successful run and restore rehearsal |
| 5 | Execute RLS policy tests | Data owner | role-by-role expected allow/deny evidence |
| 6 | Create LA cohort operating kit | Product/operator | invite list, support/moderation rota, metrics dashboard |
