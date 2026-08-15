# Muse — NCMEC CSAM Manual Fallback Procedure

**Why this exists:** the automated CSAM pipeline (detect → suspend → stage → auto-transmit) is code-complete, but auto-transmission is **dormant until NCMEC approves the ESP application and credentials are set**. Until then, every CSAM detection suspends the account and stages a report, but the report is **not transmitted**. This document is the manual fallback — read it *before* you need it, not during.

**Legal context:** 18 U.S.C. § 2258A requires reporting CSAM. The reporting obligation attaches at detection, regardless of whether the automated pipeline is live. This procedure must be followed manually in the credential-pending window.

---

## 1. Trigger

Rekognition flags CSAM categories (`Child Sexual Abuse` / `Sexual Exploitation of Minors`). The system automatically:
1. Suspends the offending account (`muse_profiles.suspended = true`).
2. Stages a report in the `muse_ncmec_reports` table (status `pending_submission`).

**If `muse_ncmec_reports` has a new `pending_submission` row, and NCMEC creds are not yet set in Vercel, follow §2 immediately.**

---

## 2. Manual reporting steps

### Step 1 — Find the staged report
Supabase → `muse_ncmec_reports` table → filter `status = pending_submission`, order by `created_at desc`. Record:
- `user_id` (the offender's profile id)
- `file_name` (the offending file)
- `flagged_categories` + `confidence` (Rekognition output)
- `context` (where the upload came from)

### Step 2 — Locate and preserve the evidence
- The original file is in the Supabase storage bucket `muse-uploads` (or already quarantined per the pipeline). **Do not delete it** — preserve it for NCMEC.
- The Rekognition scan metadata is in `muse_content_scans` (matched by `user_id` + timestamp).
- Export/screenshot both records for your own files.

### Step 3 — File the manual report at NCMEC
1. Go to `report.cybertip.org`.
2. Report as an **Electronic Service Provider (ESP)** if your account is approved; otherwise use the standard reporting path.
3. Provide:
   - **Incident type:** Child Sexual Abuse Material
   - **Date/time:** the `created_at` of the staged report
   - **Content description + file:** the flagged file (or its location)
   - **Offender account info:** `user_id`, email/name from `muse_profiles`
   - **Detection method:** automated (AWS Rekognition `DetectModerationLabels`), with `flagged_categories` + `confidence`
   - **Your ESP info:** Muse (WYZ Design), `dmca@wyzdesign.com` / `torree.marcel@gmail.com`

### Step 4 — Record the manual submission
Back in Supabase, update the report row:
```sql
update muse_ncmec_reports
set status = 'submitted_manually', submitted_at = now()
where id = '<report_id>';
```

### Step 5 — Do NOT unsuspend
The offender stays suspended. Escalate to counsel if there is any question.

---

## 3. Contact

- **NCMEC CyberTipline:** `report.cybertip.org`
- **Operator:** Torreé (Torree Harris) — `torree.marcel@gmail.com`
- **Designated agent (DMCA):** `dmca@wyzdesign.com`

---

## 4. Rehearse this

Before closed beta, run this procedure once end-to-end against a **synthetic** staged row (create a test row, walk §2, mark it `submitted_manually`, then delete the test row) so the steps are muscle memory, not first-time-in-a-real-incident.
