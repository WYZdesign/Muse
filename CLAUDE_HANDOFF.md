# Muse — Full Infrastructure + Session-Context Handoff for Claude

You are reviewing the **Muse** platform (muse.wyzdesign.com) to produce extensive, opinionated roadmaps for: **closed beta → open beta → public rollout → scaling to 100k users**. The operator's explicit goal is not "zero bugs" but "**fully production ready, super ready for anything that comes my way problem-wise**" — resilient, observable, legally covered, and capable of handling surprises at every growth stage.

Read everything below, form your own opinions, and answer with (a) an honest readiness assessment, (b) a phased roadmap, (c) the top risks, and (d) specific questions back to the operator where you need more context.

---

## 0. Who you're helping (operating context — important)

**The operator (Torreé) runs an "Asshole Efficiency" shop.** From this entire session, here's what you need to know about how they work and what they expect:

- **No fluff, no hedging, no "consider the following."** They want complete, decisive, actionable output. "Do it the right way fully with no shortcuts" is a recurring instruction.
- **"idc if anything is more work, do things the right way fully."** They explicitly authorize deep work over speed.
- **They will say "go" repeatedly** and expect continued forward progress, not summaries — but they also value honest assessments ("idk why but..." when something breaks, they report it and expect a real fix).
- **They give rapid-fire visual/UX feedback, often with typos** (e.g. "swiping left to right doesnt seem to work", "make the profile images 30% larger", "gradient in the letters not a bar"). They expect every item addressed, not just the easy ones.
- **They are non-technical enough to need complete, paste-ready solutions** — they should never have to manually edit code.
- **They've reserved "vision" (the ability to see the rendered UI) for last**, and asked for all non-vision work to be done first. So a big chunk of remaining UI/accessibility work is deliberately deferred until they grant visual access.
- **They are budget-relaxed on some things** ("idc about OpenRouter spend limit, I'll just top up and keep it topped up") but the AI layer is still designed cost-consciously (cached embeddings, heuristic pre-filters before LLM).
- **They want to be told the truth** about what's "works" vs "platinum" — they pushed back on a premature "everything's done" and asked for an honest S++ gap audit.

---

## 1. What Muse is

A professional creative-networking platform (photographers, models, filmmakers, musicians, designers, artists) for collaboration, paid bookings, and portfolio work. Explicitly **not** a dating app. Adult content exists but is age-gated and hidden by default. Business model: 5% platform commission on bookings + a `$9.99/mo` Muse Pro subscription.

---

## 2. Current stack (all live)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16.2 (App Router) on Vercel | Single-page app shell; heavy use of inline styles |
| Database + Auth + Storage | Supabase (`ejbwjmzrazfgtisqsamf`) | 47 tables, RLS, storage buckets |
| Payments | Stripe | Checkout (subscription), Identity (age verify), Connect (host payouts) |
| AI/LLM | OpenRouter | `text-embedding-3-small` (embeddings), `gemini-3.7-flash` (chat/moderation) |
| Image moderation | AWS Rekognition | `DetectModerationLabels` on every upload |
| CSAM reporting | NCMEC CyberTipline | Auto-suspend + stage report; ESP application submitted, awaiting creds |
| Error tracking | Custom `errorTracker` → `muse_events_log` | No Sentry yet |
| CI | GitHub Actions | lint + typecheck + unit tests + `npm audit` |
| Observability | None (no Sentry/uptime/analytics dashboard) | |
| Secrets | DPAPI-encrypted vault (24+ entries) + Vercel env vars | |

---

## 3. What's already built (feature-complete for a closed beta)

**Core product:**
- Discover (swipeable cards with match %), Muses (matches list + chat), Chat (preset icebreakers)
- Briefs/Collab, Community (groups + events), Sessions/Bookings, Portfolio, Moments/BTS (24h stories with auto-advance + progress bar), Profile, Settings, Network (Professionals + Forum), Feed (posts + moments)
- Grid/List toggle, search, "Likes You", photo lightbox, Map view (Mapbox)

**AI (backend, not advertised to users):**
- Matching = rules-based (styles/zodiac/MBTI/life-path) + cosine similarity over cached profile embeddings (42 profiles embedded)
- Moderation = free heuristic regex pre-filter + LLM JSON classifier (fails-open)
- Support bot = RAG over a 21-doc knowledge base (Supabase `muse_ai_docs`) + LLM
- Admin brain = rule-based DB queries + LLM synthesis for the owner

**Trust & safety:**
- Rekognition image scanning, text moderation on messages/posts/reports, strike system, auto-suspension, blocking, reporting with AI triage
- Disclosures (consent/boundary/usage-rights form), safety check-ins, trusted contacts
- Age verification (Stripe Identity), geo-blocking for TX/LA/AR/UT adult-content laws
- CSAM pipeline: detect → suspend → stage → auto-transmit (code ready, NCMEC creds pending)

**Legal:**
- ToS (20 sections), Privacy, DMCA (registered, `DMCA-1078382`), Safety — all live
- `COMPLIANCE_HANDOFF.md` written for attorney sign-off (the operator asked me to "do the absolute maximum so the lawyer just nods")

**Hardening already done:**
- CSP + HSTS + X-Frame-Options + nosniff + Referrer-Policy + Permissions-Policy
- Rate limiting on all endpoints; Supabase auth with admin allowlist; email/password validation
- Security headers, dead-path fixes, lazy Supabase client (build-safe in any env)

---

## 4. What happened this session (so you know what's already been decided/done)

A large body of work was completed across this session. Key milestones, in rough order:

1. **OpenRouter AI layer built & activated** — client, RAG knowledge base, moderation, support bot, admin brain, matching via embeddings. Verified live against OpenRouter (embeddings return 1536-dim, `gemini-3.7-flash` returns clean content).
2. **Stripe bug fixed** — invalid `apiVersion` strings caused checkout to 500; removed them, payments now work.
3. **Security pass** — rate-limited 5+ endpoints, closed a content-scan auth hole, moderation wired into messages/posts/reports.
4. **Extensive UI/UX feedback loop** — dozens of fixes driven by the operator's visual runthrough: swipe distance tuning, prompt-arrow fix, FAB enlarged + zig-zag radial menu + camera toggle, page-title gradient-text (was rendering as a "gradient bar" bug), splash sunset waves + setting sun, keyboard-overlay fix, story auto-advance, map black-screen fix (ref conflict), "Matches" renamed to "**Muses**", BTS stories, side-by-side buttons, awwwards-style motion (screen transitions, card stagger, press ripple, scroll-reveal).
5. **Legal/compliance** — DMCA registered, NCMEC ESP application submitted, compliance handoff doc written.
6. **Dead-path hunting (highly productive)** — a systematic "test every button/endpoint" audit found and fixed **5+ real bugs**: broken referral button (wrong endpoint/action/response), unhandled `track-error` (errors silently dropped), ErrorBoundary posting to nonexistent `/api/telemetry`, moderation failing closed instead of open on LLM outage, and a build-breaking top-level `createClient` that only failed in Preview/CI envs.
7. **Production hardening** — security headers consolidated, CI added tests + audit, lazy Supabase client.
8. **Testing** — grew from 18 → 36 unit tests + 14 E2E smoke tests, added coverage enforcement thresholds.
9. **Docs** — `ROADMAP.md`, `OPS_RUNBOOK.md`, `COMPLIANCE_HANDOFF.md`, `CLAUDE_HANDOFF.md`.
10. **A second agent (GitHub Copilot) became active on the repo** and rewrote the landing page with awwwards-style effects (custom cursor, preloader, split-text, marquee, magnetic CTAs, noise overlay). Coordination/merge hygiene now matters.

---

## 5. Known debt & gaps (be honest about these)

1. **`page.tsx` is ~3,800 lines** (177 hooks) — the single biggest technical debt. Only `MatchCard` + `MuseMap` extracted. Blocks maintainability, HMR speed, per-section error boundaries.
2. **Accessibility** — 82 `div onClick` without `role`/`tabIndex`/`aria`; no screen-reader/keyboard audit. Deferred until the operator grants vision.
3. **No Sentry** — `errorTracker` does `sendBeacon` to `/api/muse action=track-error` → `muse_events_log`, but there's no alerting/dashboard.
4. **No staging environment** — the operator has been testing in production.
5. **No product analytics dashboard** — `trackEvent()` fires events into `muse_events_log` (screen_view, signup, swipe, match, message_sent) but nothing consumes them.
6. **No push notifications confirmed** — VAPID is referenced but not end-to-end verified.
7. **Discovery is static** — rules + embeddings seeded once; no live LLM-based ranking/re-ranking.
8. **Missing chat UX** — no read receipts, typing indicators, or message delivery status.
9. **No load testing** — unknown concurrency ceiling.
10. **Test coverage** — 36 unit + 14 E2E smoke; no route-level integration tests yet.

---

## 6. My (the prior agent's) opinions & insights — grounded in this session

- **Testing is the highest-ROI work right now.** Every test written against real code surfaced a real bug (referral endpoint, dropped errors, `/api/telemetry`, moderation fail-open, build-breaking `createClient`). The test suite is the cheapest bug-finder available, and the operator's "test every button" instinct was correct — it keeps paying off.
- **The app is "works," not "platinum."** Security, legal, and core function are production-grade. What separates it from S++ is observability (Sentry/uptime/analytics), architecture (the monolith), test depth, and feature depth.
- **The monolith is the root of most future pain.** Every new feature makes `page.tsx` worse. It should be split *before* adding more features, not after — but the split needs visual verification, which is deliberately deferred.
- **The CSAM pipeline is technically complete but legally dormant** until NCMEC approves the ESP application. This is the single biggest compliance risk in the window before approval.
- **Two agents are now active on this repo** (me + GitHub Copilot). Merge hygiene and clear ownership of files/sections matter.
- **The operator values honesty over reassurance.** They pushed back on a premature "done" and asked for a real S++ gap audit. Don't tell them it's done when it isn't.

---

## 7. Questions I want you to answer

1. **Readiness:** On a 1–10 scale, how ready is Muse for each stage (closed beta / open beta / rollout / 100k)? What's the single biggest blocker at each stage?
2. **Priority:** Of the debt in §5, what's the true order of priority for a small team about to launch? (Weigh effort vs. risk; don't default to "fix everything.")
3. **Monolith:** Is splitting `page.tsx` the right first move, or is there a higher-leverage refactor (state management, data-fetching layer) that should happen first/alongside?
4. **Scale:** What breaks first at 100k users — Supabase (RLS/connections), Vercel (serverless cold starts / function limits), Stripe Connect, the embedding/matching pipeline, or something else? What should be load-tested first?
5. **Analytics:** What events/funnels should a creative-networking platform track from day one?
6. **Observability:** Given no Sentry budget constraints, is Sentry + UptimeRobot + PostHog the right minimal stack, or is there a better free-tier combo?
7. **Launch:** What are the 3 things most likely to go wrong in the first week of closed beta, and how should the operator prepare?
8. **Legal:** Is anything in the compliance posture (NCMEC pending, DMCA registered, age-verification geo-blocking, disclosure consent) a bigger risk than it looks?
9. **Second-agent coordination:** Given GitHub Copilot is now also committing to `main`, what's the healthiest way to divide work and avoid conflicts?

---

## 8. What I need from you (deliverables)

Produce, in order:
1. A **frank readiness verdict** (per stage).
2. A **phased roadmap** — closed beta → open beta → rollout → 100k — with concrete, sequenced items (not a generic list; tie each to §5/§6 and note effort + who/what it depends on).
3. A **risk register** — top 10 risks with likelihood, impact, and mitigation.
4. A **"do this first" shortlist** — the 5 highest-leverage actions for the next 2 weeks.
5. Any **questions back to the operator** where your recommendation depends on information not in this doc (team size, budget, target geography, marketing channel, compliance appetite, etc.).

Be specific, opinionated, and practical. Prefer "here's exactly what to do and why" over "consider the following." The operator values actionable over exhaustive, and honesty over reassurance.
