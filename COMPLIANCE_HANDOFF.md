# Muse — Compliance & Legal Handoff

**Purpose:** This document is the single source of truth for the Muse compliance posture. It is written so that counsel can review it in one sitting, confirm the two outstanding external filings, and sign off — without needing to reverse-engineer the codebase.

**Prepared:** 2026-08-13 · **Operator:** WYZ Design (Torreé) · **Platform:** muse.wyzdesign.com

---

## 1. What is Muse

A professional creative-networking platform (photographers, models, filmmakers, musicians, designers, artists) for collaboration, booking, and portfolio work. Explicitly **not** a dating app. Adult content exists but is age-gated and hidden by default.

---

## 2. Trust & Safety — already implemented (code-complete)

| Capability | Implementation | Notes |
|-----------|----------------|-------|
| **Image moderation** | AWS Rekognition `DetectModerationLabels` on every upload | Fails-closed for CSAM; fails-open (loud log) for non-CSAM when creds missing |
| **Text moderation** | Free heuristic pre-filter + LLM (OpenRouter Gemini) JSON classifier | Wired into messages, posts, and reports |
| **CSAM escalation** | Auto-suspend account + stage CyberTipline report + (new) live submission module | `src/lib/contentScan.ts` |
| **Strike system** | `muse_strikes` with escalating severity → suspension / ban | Admin action `admin-suspend-user` |
| **Reporting** | User → report → `muse_reports` (with AI classification) → moderator review | |
| **Blocking** | User block → `muse_blocks` + UI removal | |
| **Safety check-ins** | Before/during/after shoot check-ins + trusted contacts | `muse_safety_checkins` |
| **Disclosures** | Consent/boundary/usage-rights form before paid+NSFW bookings | Blocks raw payment+NSFW DMs |
| **Age verification** | Stripe Identity (document + selfie) required before paid bookings | |
| **Geo-blocking** | TX (HB 1181), LA (Act 440), AR, UT → ID verification required for adult content | IP geolocation |
| **Rate limiting** | All API endpoints rate-limited (8+ routes) | |
| **Auth** | Supabase Auth; server-side `getServiceClient`; admin email allowlist | |

---

## 3. NCMEC CyberTipline — code ready, needs ESP registration

**Status:** The pipeline is fully built. On any CSAM detection, Muse:
1. Suspends the account immediately,
2. Stages a CyberTipline report (`muse_ncmec_reports`, status `pending_submission`),
3. **Auto-transmits** once ESP credentials are set (`submitToCyberTipline` / `transmitPendingNcmecReports` in `src/lib/contentScan.ts`).

**What counsel/operator must do (external, cannot be done in code):**
1. Go to `report.cybertip.org`.
2. Apply for an **Electronic Service Provider (ESP)** account.
3. On approval, set these env vars in Vercel: `NCMEC_ENDPOINT`, `NCMEC_CLIENT_ID`, `NCMEC_CLIENT_SECRET`.
4. Confirm the report payload field names in `contentScan.ts` against the ESP API spec (a one-line review — the module is deliberately field-mapped and commented).

**Note for counsel:** This is the single highest-risk open item. Until ESP credentials are provisioned, CSAM is detected and accounts are suspended, but reports are **staged, not transmitted**. 18 U.S.C. § 2258A requires reporting; the technical mechanism is ready and the operator must complete registration.

---

## 4. DMCA — page live, needs designated-agent filing

**Status:** `/dmca` page is live with the full takedown + counter-notice procedure. The Terms (§10) reference `dmca@wyzdesign.com`.

**What must be done (external):**
1. File the **Designated Agent** with the U.S. Copyright Office at `dmca.copyright.gov` ($6, valid 3 years).
2. Put the agent registration number + agent name/address on the `/dmca` page (currently a placeholder for the number).

---

## 5. Legal pages — drafted, ready for review

Four pages are live and drafted to be near-final:

| Page | Path | Key content |
|------|------|-------------|
| Terms of Service | `/terms` | 20 sections: eligibility (18+), content license, prohibited content (CSAM zero-tolerance), NSFW age-gating, age verification (TX/LA/AR/UT), payments (5% commission), DMCA, moderation, suspension, IP, disclaimer, liability cap ($100 or 12-mo fees), indemnification, arbitration (AAA), governing law (Delaware) |
| Privacy Policy | `/privacy` | Data collected, usage, sharing, retention, deletion |
| DMCA | `/dmca` | Takedown + counter-notice procedure |
| Safety | `/safety` | Community guidelines + reporting |

**For counsel to review (the actual "nod" items):**
- Liability cap amount (§15) and arbitration clause (§17) — confirm appropriate for the entity structure and risk profile.
- Governing law (Delaware) — confirm it matches the incorporating state.
- Age-verification language (§8) against TX HB 1181 / LA Act 440 / AR / UT current law.
- The disclosure/consent form (model releases, usage rights, NDA) against state image-rights law.
- Privacy Policy vs. CCPA/CPRA (if any California users) and any EU/GDPR exposure.

---

## 6. Data & retention

- Account deletion removes profile + data; 30-day retention then permanent deletion (except where law requires retention — e.g. CSAM evidence, § 2258A).
- All content scans are logged (`muse_content_scans`); CSAM incidents quarantined (`muse_safety_incidents`, `muse_ncmec_reports`).

---

## 7. Outstanding actions (operator, not counsel)

| # | Action | Owner | Blocker? |
|---|--------|-------|----------|
| 1 | NCMEC ESP registration | Operator | **Yes — CSAM transmission** |
| 2 | DMCA designated-agent filing | Operator | No |
| 3 | Set NCMEC env vars after approval | Operator | No |
| 4 | Counsel review of §3–§5 above | Counsel | Recommended |

---

## 8. Sign-off

**Counsel:** I have reviewed the Muse compliance posture (sections 2–7), the four legal pages (`/terms`, `/privacy`, `/dmca`, `/safety`), and the disclosure/consent flow. Except for the outstanding external filings noted above, the platform is compliant to the best of my knowledge.

Signature: ______________  Date: ______________
