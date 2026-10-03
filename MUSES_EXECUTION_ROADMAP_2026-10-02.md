# Muses by WYZ — Execution Roadmap

**Purpose:** one source of truth for the work that remains after the audit, boardroom, and roadmap reconciliation on 2026-10-02.

This is an execution plan, not a feature wish list. A phase is complete only when its exit criteria are met. Work already delivered in code—page-controller decomposition, runtime validation, security headers, coverage ratchets, portfolio-visibility enforcement, availability persistence, age privacy, core admin tools, and the current visual-test repair—does not appear as new work below.

## Product north star

Muses by WYZ is the verified, consented, protected marketplace for creative shoots. The first proof is not registrations: it is real people in one city completing safe shoots, getting paid, reviewing one another, and returning.

### Metrics that govern every phase

| Metric | Why it matters |
|---|---|
| Verified active creatives by city and role | Measures usable supply, not vanity signups. |
| Match-to-first-message and message-to-booking conversion | Shows whether discovery creates real work. |
| Bookings created, paid, completed, disputed, and refunded | Measures a functioning transaction loop. |
| Gross payment volume, take rate, and contribution margin | Measures business viability. |
| Repeat booking rate and time to second booking | Measures marketplace retention. |
| Safety reports per completed booking and time to resolution | Measures trust operations. |
| Host Connect onboarding completion | Measures whether paid supply can transact. |
| P95 API latency, error rate, crash-free sessions, and media failures | Determines when technical scale work is justified. |

## Phase 0 — Truth, ownership, and release discipline

**Goal:** stop stale handovers and unverified “done” claims from creating launch risk.

### 0.1 Repository and delivery truth

- [ ] Restore normal Git permission behavior so `fetch`, commit, branch creation, and worktrees work reliably on the Windows workspace.
- [ ] Refresh `DELIVERY_STATUS.md` against the fetched `origin/main` tip after every merged batch; the present header is behind the locally recorded tip.
- [ ] Commit or discard only after review the current test-dependency/test additions and generated screenshot artifacts; do not mix them with unrelated work.
- [ ] Require every release record to include commit SHA, production deployment SHA, health result, rollback target, and validation result.

### 0.2 Evidence rules

- [ ] Treat source review, local tests, deployed browser checks, and provider checks as separate evidence classes.
- [ ] Do not raise audit scores solely for source changes; collect the matching test and deployed proof.
- [ ] Maintain a short release ledger with links to CI artifacts, migration evidence, and device QA.

**Exit gate:** clean repository, current ledger, reproducible branch workflow, and an exact-SHA deploy record for the next release.

## Phase 1 — Closed-beta safety and legal readiness

**Goal:** operate a small real-user beta safely before increasing acquisition.

### 1.1 Safety operations

- [ ] Obtain NCMEC ESP approval and securely configure the resulting credentials; document the manual fallback while approval is pending.
- [ ] Publish the escalation playbook: report triage, imminent-risk escalation, account suspension, evidence preservation, user communication, and appeal handling.
- [ ] Assign named moderators and an after-hours escalation owner for beta incidents.
- [ ] Confirm the product only promises a protected process, never guaranteed safety or outcomes.

### 1.2 Legal and policy alignment

- [ ] Have counsel review Terms, Privacy, Safety, disclosures, arbitration/liability wording, age-verification wording, retention/deletion language, CCPA/GDPR position, and marketplace/payment language.
- [ ] Resolve the current retention-language contradiction before collecting real production data.
- [ ] Complete DMCA designated-agent public contact details and counter-notice procedure.
- [ ] Establish the trademark/naming plan for **Muses by WYZ** before broad public marketing.
- [ ] Keep explicit NSFW monetization hard-blocked; document the permitted non-explicit fine-art boundary for support and moderation.

### 1.3 Security and privacy proof

- [ ] Review each of the eight Supabase `SECURITY DEFINER` RPCs; restrict `anon`/`authenticated` execution unless a direct caller is intentionally supported.
- [ ] Set immutable `search_path` for the six flagged PostgreSQL functions and regression-test each function’s caller path.
- [ ] Classify the 22 RLS-enabled/no-policy tables as server-only or add the minimum policy; record the rationale per table.
- [ ] Enable Supabase leaked-password protection.
- [ ] Run an anonymous plus two-authenticated-user media/privacy matrix for public, matched, invite-only, private, blocked, deleted, and expired-signed-URL states.
- [ ] Verify account deletion removes or schedules removal of database rows and storage objects, with audit evidence.

**Exit gate:** named safety owner, counsel-reviewed policies, NCMEC status documented, security-advisor findings dispositioned, and cross-account media/RLS proof recorded.

## Phase 2 — Closed-beta product proof in one city

**Goal:** prove marketplace liquidity in one launch city before multi-city rollout.

### 2.1 Supply and demand activation

- [ ] Launch the first controlled market in **Los Angeles** using the deepest FD/Mixer relationship and studio availability.
- [ ] Recruit 20 verified real creatives across complementary roles; do not count seeded demo profiles.
- [ ] Recruit at least one anchor studio and document its actual booking, check-in, and escalation workflow.
- [ ] Recruit a small buyer/brief cohort with real budgets and defined creative needs.
- [ ] Create an invite, onboarding, verification, and support playbook for each cohort.

### 2.2 Transaction loop

- [ ] Test the full live path: verified profile → discovery → message request/match → booking → Connect onboarding → Checkout → disclosure → check-in → completion/capture → review → payout/refund path.
- [ ] Put host Connect onboarding earlier in the booking funnel, with clear status, blocked-state copy, and nudge/retry behavior.
- [ ] Validate payment/refund/dispute operational ownership and response-time expectations.
- [ ] Decide whether pre-meet video/voice is required for beta. Keep it out until there is an approved provider, cost model, moderation policy, and consent model.

### 2.3 Measurement

- [ ] Instrument the funnel events and dashboards for the north-star metrics above.
- [ ] Add explicit consent for product analytics and minimize personal data in event payloads.
- [ ] Run weekly beta reviews: cohort activation, booking conversion, safety reports, support themes, and product drop-off.

**Exit gate:** 20 real creatives, 20 completed TFP collaborations, 5 completed paid bookings, reviewed safety/process incidents, and at least one repeat booking signal.

## Growth gates — LA first, then Chicago, then New York

These thresholds govern city expansion and infrastructure investment. They are counts of active, verified people who complete marketplace actions, not merely registered accounts.

| Gate | Market focus | Required proof before moving forward |
|---:|---|---|
| First 100 | Los Angeles private beta | 100 verified activated members; a balanced creative-role mix; 20 TFP and 5 paid completed shoots; every safety/payment issue reviewed. |
| First 500 | Los Angeles public-beta cohort | Sustained weekly matches/messages, repeat bookings, at least two reliable studio/space partners, a staffed support/moderation process, and stable conversion metrics. |
| First 1,000 | Los Angeles repeatable launch | Reliable booking funnel, measurable retention, positive transaction-quality trend, proven device/release/restore gates, and no unresolved P0 safety or payment defects. |
| First 10,000 | Chicago launch only after LA repeatability | Chicago anchor partners and seeded supply; city-level metrics/feature flags; queue-backed operations for notifications, cleanup, and moderation. |
| First 100,000 | Chicago and New York operating loops | Proven load capacity, observability/SLOs, privacy/security review, media rendition/CDN delivery, and support/moderation capacity forecasts. |
| First 1,000,000 | Multi-city network | Measured database/query capacity plan, search/indexing, durable event analytics, regional operational coverage, and tested disaster recovery. |
| 10,000,000+ | National/major international expansion | Formal trust-and-safety, security, privacy, platform, data, and SRE organizations with audited controls. |
| 100,000,000 | Global marketplace | Region-aware data/media strategy, independently scalable services, mature incident response, legal/compliance programs by region, and profitability/reliability evidence at each prior gate. |

**Expansion order:** Los Angeles proves the loop; Chicago is the first replication test; New York is the second replication test. Do not open the next city merely because people request it—open only after the preceding gate is met.

### Los Angeles launch work chunks

1. **Launch control:** name the beta owner, safety owner, support owner, and studio-partner owner; establish invite criteria and incident escalation.
2. **Anchor supply:** secure the first LA studio/space partner, publish only confirmed partner details, and agree on check-in, cancellation, and escalation handling.
3. **Founding cohort:** recruit the first 100 verified members through FD Mixers and trusted creator groups; balance photographers, models, stylists, MUAs, producers, and buyer/brief demand.
4. **Activation concierge:** personally guide every founding member through profile completion, verification, availability, first outreach, and the first booking/TFP collaboration.
5. **Controlled transactions:** run the first paid bookings with a human owner monitoring Connect status, consent, check-ins, capture, reviews, and refunds.
6. **Weekly marketplace review:** review supply/demand balance, stalled matches, host onboarding failures, reports, disputes, revenue, and repeat behavior; ship only the highest-evidence fixes.
7. **Gate review:** at 100, 500, and 1,000, record metrics and an honest go/no-go decision before increasing acquisition or adding the next city.

## Phase 3 — Product quality before public beta

**Goal:** close the remaining high-value experience and reliability gaps exposed by real beta use.

### 3.1 Accessibility and interaction system

- [ ] Replace remaining high-frequency `role="button"` shims with native buttons/links, starting with interactive cards, tabs, chips, notification rows, and media navigation.
- [ ] Add `aria-controls`/panel relationships where tabs have real panels; use buttons with selected state where they do not.
- [ ] Run manual keyboard and screen-reader traversal across onboarding, discovery, messaging, booking, payments, reports, profile, settings, and admin.
- [ ] Re-run authenticated visual checks at 320, 375, 390, 452, 768, desktop, reduced-motion, and installed-PWA sizes after browser execution is restored.
- [ ] Remove only validated accessibility baselines; retain decorative, inert exceptions with documented rationale.

### 3.2 Media and content integrity

- [ ] Keep video upload disabled until a durable pipeline exists; do not ship a partial video path.
- [ ] When enabled, implement upload quarantine, asynchronous scan jobs, result consumption, retry/dead-letter handling, reviewer queue, safe delivery, and storage cleanup.
- [ ] Test image/video MIME, size, scan failure, unsafe result, provider outage, deletion, and retry behavior.
- [ ] Continue user-authored caption/alt-text support for feed and portfolio media.

### 3.3 Performance and client architecture

- [ ] Lazy-mount inactive screens only after preserving navigation, focus restoration, drafts, realtime subscriptions, and screen-reader behavior.
- [ ] Add a measured data-cache/revalidation strategy for high-read endpoints; retain explicit invalidation after writes.
- [ ] Serve responsive, optimized image variants through the existing image path/CDN; measure LCP before and after.
- [ ] Add bundle-size and Web Vitals budgets that fail only on meaningful regression.

### 3.4 Product gaps driven by beta evidence

- [ ] Build “similar professionals” only if discovery data shows it improves qualified outreach.
- [ ] Improve trust surfaces with verified status, completion history, review reliability, and response behavior; keep zodiac/MBTI/life-path secondary.
- [ ] Prioritize calendar depth, notifications, and pre-meet capability only when their funnel impact is measured.

**Exit gate:** no P0 beta defects, accessible core flows, durable media decision, responsive media performance proof, and a ranked beta-evidence backlog.

## Phase 4 — Operationally ready public beta

**Goal:** safely support a growing public audience without relying on ad-hoc founder intervention.

### 4.1 Reliability and observability

- [ ] Verify error monitoring receives production client, server, and cron failures with actionable context and privacy-safe payloads.
- [ ] Configure uptime checks, health probes, alert routing, a public status page, and incident severity definitions.
- [ ] Run a backup restore drill and document recovery objectives, recovery time, and accountable owners.
- [ ] Verify all cron jobs in production: authorization failure, idempotency, partial failure, retries, rate limits, and alerting.
- [ ] Establish dependency, secret-rotation, access-review, and incident-review cadence.

### 4.2 Release and platform proof

- [ ] Restore CI deployment verification credentials and verify each production SHA plus rollback target.
- [ ] Complete real iOS and Android device smoke suites: signup/login, deep links, push, media permissions, camera/gallery, keyboard, safe areas, offline/reconnect, background/resume, payments, and account deletion.
- [ ] Complete installed-PWA regression checks separately from browser checks.
- [ ] Run staged load and reconnect tests against a non-production environment before public acquisition.

### 4.3 Support and moderation operations

- [ ] Build support macros and training for payments, account recovery, identity verification, safety reports, moderation appeals, deletions, and studio issues.
- [ ] Add explicit AI disclosure, sensitive-data warning, and human-escalation path to SupportChat.
- [ ] Set service-level targets for safety, payment, and account-access cases.

**Exit gate:** alerts/incident response are live, restore drill passes, device suite passes, deploy/rollback is proven, and support/moderation coverage is staffed.

## Phase 5 — Public launch and early network growth

**Goal:** expand only after the one-city loop is repeatable.

### 5.1 Go-to-market

- [ ] Turn the first city’s completed-shoot data into a studio/creator case study.
- [ ] Recruit additional studios through direct relationships and selected Peerspace hosts; present Muse as the talent/trust/transaction layer, not a pure space-rental competitor.
- [ ] Expand to the next FD/Mixer city only after the first city meets liquidity and safety thresholds.
- [ ] Keep all marketing professional: creative work, verified people, protected booking, real studios. Never frame acquisition as romance.

### 5.2 Revenue discipline

- [ ] Monitor host and buyer fee comprehension, payout timing, dispute rate, boost conversion, subscription retention, and chargebacks.
- [ ] Do not add pricing tiers until current booking fees, Pro, Studio, and boosts have real usage evidence.
- [ ] Keep a transaction-quality dashboard by city and partner.

**Exit gate:** repeatable city launch playbook, improving booking conversion, controlled safety/support load, and positive contribution evidence.

## Phase 6 — Scale milestones: 10K to 1M users

**Goal:** scale the systems that real load proves are bottlenecks.

### 6.1 10K–100K active users

- [ ] Introduce cache/read models for discovery, feeds, availability, notifications, and profile trust summaries based on measured query load.
- [ ] Move long-running work—moderation, media processing, notifications, exports, cleanup, analytics fan-out—to durable queues with idempotency keys and dead-letter handling.
- [ ] Use image/video rendition pipelines and CDN delivery; prevent originals from serving as default feed assets.
- [ ] Partition analytics events from transactional Postgres workloads; retain privacy-minimized events with documented retention.
- [ ] Add per-city feature flags, moderation capacity forecasting, and load tests for the real peak workflows.

### 6.2 100K–1M active users

- [ ] Add database capacity planning: connection pooling, read replicas where measured, query budgets, index review, archival strategy, and migration rollout/rollback discipline.
- [ ] Establish search/indexing architecture for profiles, briefs, studios, and moderation queues; keep authorization checks at the serving boundary.
- [ ] Separate realtime fan-out, notification delivery, and chat/media workloads so one does not starve booking/payments.
- [ ] Formalize security program: threat modeling, penetration testing, access reviews, vendor reviews, privacy incident response, and audit logs.
- [ ] Build SRE practices: SLOs, error budgets, capacity forecasts, game days, regional failure drills, and 24/7 escalation coverage.

**Exit gate:** capacity decisions are driven by observed traffic and service-level objectives, not speculative rewrites.

## Phase 7 — 1M to 100M users

**Goal:** become a trusted global marketplace without weakening the safety and transaction contract.

### 7.1 Platform architecture

- [ ] Design region-aware data residency, media delivery, and disaster recovery before entering regulated geographies.
- [ ] Partition high-volume entities and event streams by stable keys such as region/city and account scope; avoid premature global sharding of the transactional core.
- [ ] Operate a dedicated event/analytics platform, moderation queue, notification platform, search cluster, and media pipeline outside the booking transaction path.
- [ ] Establish multi-region failover only after regional traffic and recovery objectives justify its operational cost.

### 7.2 Trust at scale

- [ ] Scale identity, consent, review, dispute, and moderation decisions with explainable policies, audit trails, appeal paths, and trained human review.
- [ ] Never sell or use trust data for eligibility decisions without specialist legal review; the FCRA/consumer-reporting risk is material.
- [ ] Maintain child-safety, explicit-content, payment-provider, and app-store compliance by region.

### 7.3 Organization and governance

- [ ] Build dedicated product, marketplace operations, trust and safety, support, data, security, platform, and SRE functions as the metrics demand them.
- [ ] Establish board reporting around completed transactions, repeat rate, safety resolution, revenue quality, reliability, and responsible-growth indicators.

**Exit gate:** global expansion is earned by repeatable local liquidity, proven safety operations, and measured service capacity—not projected signups.

## Work intentionally deferred

- Do not build multi-region sharding, custom escrow/insurance, advanced AI ranking, broad video calling, or a large feature catalog before closed-beta transaction proof.
- Do not expand cities based on demo engagement.
- Do not claim “100M ready” until the 10K, 100K, and 1M capacity gates have been earned with production data.

## Immediate next ten tasks

1. Repair Git/browser process permissions and update the delivery ledger from a fresh fetch.
2. Review and commit the current testing-dependency and modal-visibility work.
3. Create the Supabase security remediation plan and validate it outside production.
4. Enable leaked-password protection and record the change.
5. Execute the two-account RLS/signed-media matrix.
6. Assign safety owner, NCMEC status, DMCA contact, and counsel review.
7. Select the first city, anchor studio, and first 20 real creatives.
8. Instrument the booking funnel and safety-resolution metrics.
9. Run the first complete live transaction with a controlled support/moderation playbook.
10. Run device, PWA, rollback, and restore-drill evidence before public acquisition.
