# Muse App — Attorney Handoff Memo
## Date: 2026-08-09 | For: Legal Counsel Review

---

## 1. WHAT IS MUSE?

Muse is a mobile-first creative professional networking and collaboration platform. It includes:
- Profile discovery (swipe-based matching)
- Professional networking & connections
- Booking/paid sessions marketplace (with Stripe Connect payments)
- In-app messaging
- Community groups and forums
- Photo/portfolio sharing (with album system and access tiers)
- NSFW+paid collaboration disclosure system (novel safety feature)

**Target launch:** TBD pending attorney clearance of items below.

**Platform:** Web app (mobile responsive) + Capacitor native iOS/Android (post-launch).
**Infrastructure:** Next.js on Vercel, Supabase (PostgreSQL + Storage + Auth), Stripe (Connect + Identity), AWS Rekognition (content scanning).
**Business model:** Freemium — free tier with daily limits, Muse Pro at $9.99/mo, 5% marketplace commission on bookings.
**User base:** Creative professionals aged 18+, primarily US-based portfolio models, photographers, designers, musicians, filmmakers.

---

## 2. CRITICAL LEGAL QUESTIONS REQUIRING YOUR REVIEW

### A. CSAM Reporting Compliance (18 U.S.C. § 2258A)
Muse is a "remote computing service provider" under the statute. This means a **mandatory federal obligation** to report apparent child sexual abuse material to NCMEC's CyberTipline within approximately 24 hours of obtaining actual knowledge. The engineering team has:
- Integrated AWS Rekognition for automated image scanning of uploads
- Needs: your review of whether the current Rekognition-based pipeline meets the "actual knowledge" threshold
- Needs: your sign-off on the proposed NCMEC auto-report workflow
- Needs: confirmation that the proposed 1-year preservation window in a quarantined Storage bucket meets statutory requirements
- **Penalty for non-compliance: $600,000 first offense, $850,000 subsequent offenses** (updated 2024 via Pub. L. 118-59)

### B. Age Verification
Muse currently uses a self-reported age gate ("Over 18" / "Under 18") with optional Stripe Identity verification for paid bookings. We have 8+ states with active age verification laws:
- **Texas (HB 1181):** Age verification required for adult content access
- **Louisiana (Act 440):** Government ID or digital ID verification
- **California:** Two laws — CA Age-Appropriate Design Code Act AND Digital Age Assurance Act (requires OS-level age signal API by Dec 2026)
- **Utah, Arkansas, and others:** Age verification + parental consent for minors

**Questions for you:**
1. Does self-reported age gate satisfy any state law? (Almost certainly no for TX/LA.)
2. Is Stripe Identity (government document + selfie match) sufficient as an "age verification system" under these statutes?
3. Should we geo-block TX/LA/AR/UT until full compliance is achieved, or is there a path to compliance that doesn't require processing government IDs for 100% of users?
4. What is our exposure from the Supreme Court's *Free Speech Coalition v. Paxton* ruling? (Held AV laws constitutional 6-3.)
5. COPPA concerns: if a user self-reports as under 13 (the age gate has an "Under 18" option), do we have obligations to prevent data collection?

### C. NSFW + Paid Work Disclosure System
Muse's novel safety feature: any user who proposes NSFW work (nudity, explicit acts) combined with payment ($) MUST file a structured disclosure form. This is enforced server-side (not bypassable). The system:
- Creates an auditable record in `muse_disclosures`
- Issues automatic strikes for violations
- Can trigger account suspension

**Questions for you:**
1. Is this disclosure system sufficient to establish a "reasonable" safety practice for a platform that allows NSFW creative work?
2. Are there any legal risks in *facilitating* (vs. prohibiting) NSFW creative collaboration through a structured disclosure framework?
3. Does FOSTA-SESTA have any bearing on this feature? (The disclosure system explicitly blocks NSFW+payment combinations involving illegal activity.)

### D. General TOS/Privacy Requirements
We need your review of:
- Terms of Service (to be drafted — can be based on standard SaaS TOS with industry-specific additions)
- Privacy Policy (disclosing: Supabase data storage, Stripe payment processing, AWS Rekognition content scanning, NCMEC CSAM reporting)
- DMCA agent registration (must file with U.S. Copyright Office)
- GDPR compliance (if any EU users are expected)
- CCPA compliance (any CA users)

---

## 3. WHAT'S BEEN DONE (Engineering)

### Security hardening (completed 2026-08-09):
1. Row Level Security policies tightened on all 7 tables that had overly permissive access
2. Rate limiting added to all API routes (connect, referral, verification, push, auth)
3. Server-side disclosure enforcement verified as non-bypassable
4. Delete-account now explicitly cleans `muse_verification_sessions` 
5. `join-community` member count is server-computed (not client-trusted since fix)
6. All `block` upserts have explicit `onConflict` constraints

### Content safety:
- AWS Rekognition integration exists in codebase — **needs live credential verification**
- NCMEC reporting workflow is NOT yet built — **high priority, must be done before launch**
- Content preservation pipeline NOT yet built — **must be done before launch**

### Age verification:
- Age gate modal exists (self-reported)
- Stripe Identity verification flow exists at `/api/muse/verification`
- Stripe Identity enforcement on bookings: **needs live verification**

### Payments:
- Stripe Connect with 5% marketplace commission: **code complete, needs live verification**
- Stripe Identity: code complete, needs enforcement verification

### What's NOT yet done:
- Terms of Service document
- Privacy Policy document
- DMCA agent registration
- GDPR/CCPA data export/deletion flows (beyond basic account deletion)
- State-specific geo-blocking
- NCMEC CyberTipline integration

---

## 4. RECOMMENDED NEXT STEPS (in order)

1. **Attorney reviews this memo** and answers the legal questions in Section 2
2. **Attorney drafts/reviews TOS + Privacy Policy** (we can provide a first draft based on industry templates)
3. **Attorney confirms** whether self-reported age gate + Stripe Identity is sufficient, or if geo-blocking is needed for non-compliant states
4. **Engineering builds** NCMEC CyberTipline auto-report integration + content quarantine storage
5. **Engineering verifies** AWS Rekognition is live with valid credentials across all upload paths
6. **Attorney files** DMCA agent designation with U.S. Copyright Office
7. **Launch** once all hard gates (Section 2 of compliance checklist) are cleared

---

## 5. TECHNICAL ARCHITECTURE (for reference)

| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend | Next.js 14, React 18, CSS | Single page app, 3500-line main component |
| Backend | Next.js API routes (Vercel Serverless) | All API routes under `/api/muse/` |
| Database | Supabase PostgreSQL + Storage | RLS enabled on all tables |
| Auth | Supabase Auth (`@supabase/ssr` for cookie-based sessions) | Email/password + OAuth (Google, Apple) |
| Payments | Stripe Connect (Express accounts) + Stripe Identity | 5% commission, destination charges |
| Content scanning | AWS Rekognition (`detectModerationLabels`) | Integrated in upload pipeline |
| Push notifications | Web Push API + Supabase Realtime | Optional, browser-native |
| AI/ML | Ollama (local), Gemini (OpenRouter) | Embeddings-based matching (deferred to post-launch) |

---

## 6. KEY CONTACTS

- **Owner/Founder:** Torreé — WYZMIND/SOVEREIGN
- **Codebase location:** `W:\WYZ_Command_Center\Muse`
- **Production URL:** https://muse.wyzdesign.com
- **GitHub:** WYZdesign/Muse (branch: `main`)
- **Hosting:** Vercel (project: `muse`)
- **Database:** Supabase (org: WYZdesign)

---

## 7. DOCUMENTS PROVIDED

1. This memo (ATTORNEY_HANDOFF.md)
2. Compliance checklist (COMPLIANCE_CHECKLIST.md) — detailed engineering/legal task list
3. SQL schema (`sql/muse_complete_schema.sql`) — full database structure with RLS policies
4. Live application accessible at https://muse.wyzdesign.com for testing

---

**END OF MEMO**

We are ready to proceed with all non-legal engineering tasks immediately. We cannot launch until the legal questions in Section 2 are answered and the hard gates in Section 4 are cleared.
