# Muse App — Legal Compliance Checklist
## Prepared: 2026-08-09 | For attorney review before launch

---

## 1. CSAM REPORTING (18 U.S.C. § 2258A)

### Legal Obligation
- **24 hours from actual knowledge**: Must report any apparent child sexual abuse material (CSAM) to NCMEC CyberTipline
- **Mandatory reporter**: As a "provider" (remote computing service provider), Muse is covered
- **Failure penalty**: $600,000 (1st offense, under 100M MAU), $850,000 (2nd+)
- **Preservation duty**: Must preserve reported content and commingled data for **1 year** in a secure location consistent with NIST Cybersecurity Framework
- **No monitoring requirement**: § 2258A(f) explicitly states nothing requires Muse to monitor users or content — this is a reactive, not proactive, obligation

### Muse Implementation Status
- [ ] AWS Rekognition content moderation pipeline: **CONFIRM LIVE with valid credentials**
  - Code path: `src/app/api/muse/route.ts` references Rekognition for image scanning
  - Must verify: IAM credentials configured, Rekognition API responding, results logged
  - Upload paths covered: avatar, portfolio, chat, feed — **verify all 4 paths**
- [ ] NCMEC CyberTipline reporting workflow: **BUILD automated integration**
  - API: https://report.cybertip.org (NCMEC provides ESP API access)
  - Required fields per report: file hash, upload timestamp, uploader IP, uploader email/user ID
  - Must capture: `muse_profiles.email`, IP from `x-forwarded-for`, file reference to Supabase Storage
  - This is bare-minimum — non-negotiable for launch
- [ ] Content preservation policy: **IMPLEMENT 1-year preservation**
  - Flagged content must be moved to a separate locked Storage bucket
  - Must survive user deletion, account deletion, and normal content lifecycle
  - Access must be limited to authorized personnel (per § 2258A(h)(3))

### Recommended Architecture
```
User Upload → AWS Rekognition (`detectModerationLabels`)
  ├── No flag → normal storage
  └── CSAM flag detected → 
       ├── Move file to `muse-content-quarantine` bucket (immutable, 1yr retention)
       ├── Log to `muse_csam_reports` table
       ├── Auto-report to NCMEC CyberTipline API
       ├── Suspend offending account
       └── Notify admin via email
```

---

## 2. AGE VERIFICATION

### Federal: COPPA (Children's Online Privacy Protection Act)
- Applies to: collecting personal information from children under 13
- Requirement: verifiable parental consent before collecting data from users under 13
- COPPA applies regardless of whether your app targets children — if you KNOW someone is under 13
- Current Muse status: age gate modal exists, "Under 18" button redirects away

### State Laws (Active as of 2026)
| State | Law | Age | Requires | Muse Impact |
|-------|-----|-----|----------|-------------|
| Texas | HB 1181 | 18+ | Age verification for adult content | Apply if any NSFW content accessible |
| Louisiana | Act 440 | 18+ | Government ID or digital ID for adult sites | LA Wallet integration if serving LA users |
| California | AAGEA + Digital Age Assurance Act | 18+ | OS-level age signal API by Dec 2026 | Must query age attestation API on launch |
| Utah | Social Media Regulation Act | 18+ | Age verification + parental consent | May apply if classified as social media |
| Arkansas | Social Media Safety Act | 18+ | Age verification + parental consent | Similar to Utah |

### Muse Implementation Status
- [ ] COPPA compliance: **Confirm no data collection from users self-identifying as under 13**
- [ ] Age gate: exists as `AgeVerificationModal` component — **confirm applies to ALL entry points**
- [ ] Stripe Identity verification: **CONFIRM actually gates bookings/payments**
  - Code exists at `src/app/api/muse/verification/route.ts`
  - Must verify: user cannot book paid session without passing verification
- [ ] State-by-state geo-blocking: **IMPLEMENT for non-compliant jurisdictions**
  - Simplest: `x-forwarded-for` → IP geolocation → block TX/LA/AR/UT until compliant
  - Alternative: blanket block NSFW/adult content in US until attorney confirms strategy
- [ ] CA Digital Age Assurance Act: **MONITOR — deadline Dec 2026**
  - Requires OS-level age signal API calls on app launch
  - Affects iOS (Apple) and Android (Google) apps via Capacitor

### Supreme Court Precedent
*Free Speech Coalition v. Paxton* (2024): Age verification laws are constitutional. The Court held 6-3 that such laws "only incidentally burden the protected speech of adults." This means: **state AV laws will stand and more are coming.**

---

## 3. DISCLOSURE / TRUST & SAFETY

### Current Status: PARTIALLY IMPLEMENTED
- Server-side NSFW+payment hard block: **CONFIRMED WORKING** (route.ts lines 736-758)
- Client-side chat keyword intercept: **UX ONLY**, not enforcement
- Check-in/strike system: **NOT YET TRACE TESTED end-to-end**
  - Schema exists (`muse_activity_log`, strike tracking)
  - Must verify: auto-strike fires on disclosure violation, appeal path works, admin panel is functional

### Recommended Additions
- [ ] End-to-end test of strike → suspension → appeal workflow
- [ ] Admin moderation queue must be reachable and functional (not just a component that exists)
- [ ] Disclosure system: add TOS checkbox confirming awareness of disclosure requirements for NSFW+paid work

---

## 4. DATA PRIVACY & DELETION

### Account Deletion
- [ ] `delete-account` endpoint: **Now explicitly deletes `muse_verification_sessions`** (added 2026-08-09)
- [ ] Still relies on FK CASCADE for `muse_sessions` and `muse_error_logs`
- [ ] **No data export in machine-readable format** — may need to add for GDPR/CCPA compliance
- [ ] Supabase Storage: **CONFIRM profile photos/portfolio files are deleted** on account deletion

### Privacy Policy
- [ ] Privacy policy document: **MUST EXIST before launch**
- [ ] Must disclose: data collected, how used, third-party sharing (Supabase, Stripe, AWS Rekognition)
- [ ] GDPR: if ANY EU users expected, need consent mechanism + data export + right to deletion
- [ ] CCPA: if ANY California users, need opt-out mechanism for data sale (Stripe counts as "sharing")

---

## 5. PAYMENTS / FINANCIAL COMPLIANCE

### Stripe Connect
- [ ] 5% commission rate: **CONFIRMED in code** (`COMMISSION_RATE = 0.05` in connect/route.ts)
- [ ] Escrow behavior: **VERIFY with Stripe dashboard** — payment held until booking complete? Direct transfer?
- [ ] Terms of Service: must disclose the 5% marketplace commission to users
- [ ] Stripe Identity for paid bookings: **ENFORCEMENT MUST BE VERIFIED** — user should not be able to pay without verification

### Tax Compliance
- [ ] 1099-K issuance: Stripe issues for $600+ in payments (US)
- [ ] Terms must state users are responsible for reporting their own income

---

## 6. INTELLECTUAL PROPERTY

### Content Ownership
- [ ] Users retain rights to uploaded content (standard UGC model)
- [ ] Muse needs license to display content on platform (standard TOS grant)
- [ ] DMCA compliance: **IMPLEMENT takedown procedure + registered agent**
  - Must file DMCA agent designation with U.S. Copyright Office
  - Must have visible "Report Copyright Infringement" mechanism

### Placeholder Profiles
- [ ] All placeholder images: **OWNER CONFIRMS self-shot, model releases not needed**
- [ ] Any third-party images: must have written release covering commercial use on a dating/social platform

---

## 7. TERMS OF SERVICE ESSENTIALS

### Must Include (bare minimum for launch):
1. Age restriction: 18+ only
2. NSFW+paid work disclosure requirements (your novel safety feature — must be in TOS)
3. Prohibited content: CSAM (zero tolerance + reporting obligation), harassment, illegal activity
4. 5% marketplace commission disclosure
5. DMCA takedown contact
6. Governing law + jurisdiction
7. Limitation of liability
8. Account termination policy

---

## 8. ATTORNEY REVIEW ITEMS

**Hard gates — cannot launch without attorney sign-off:**
1. NCMEC reporting workflow is compliant with § 2258A (federal)
2. Age verification strategy covers all relevant state laws (TX, LA, CA, UT, AR at minimum)
3. Terms of Service and Privacy Policy are legally sufficient
4. DMCA agent registration is complete
5. Data deletion meets GDPR/CCPA minimum requirements
6. No exposure from placeholder profile content (even if self-shot)
7. 5% commission is lawful and properly disclosed

---

## SUMMARY OF ACTION ITEMS (ordered by urgency)

| # | Item | Type | Deadline | Owner |
|---|------|------|----------|-------|
| 1 | Verify AWS Rekognition is live | Engineering | Before launch | Build |
| 2 | Build NCMEC CyberTipline auto-report | Engineering | Before launch | Build |
| 3 | Implement 1-year content preservation for flagged material | Engineering | Before launch | Build |
| 4 | Verify Stripe Identity gates bookings | Engineering | Before launch | Build |
| 5 | Add TOS + Privacy Policy documents | Legal | Before launch | Attorney |
| 6 | File DMCA agent designation | Legal | Before launch | Attorney |
| 7 | Add state geo-blocking for non-compliant jurisdictions | Engineering | Before launch | Build |
| 8 | End-to-end strike/suspension/appeal test | Engineering + Legal | Before launch | Build + Attorney |
| 9 | GDPR/CCPA audit for data export/deletion | Legal | Post-launch | Attorney |
| 10 | CA Digital Age Assurance Act compliance (Dec 2026) | Engineering | Q4 2026 | Build |
