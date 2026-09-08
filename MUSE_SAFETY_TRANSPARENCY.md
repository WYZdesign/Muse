# MUSE — SAFETY & TRANSPARENCY (the trust layer)

> How Muse keeps every shoot protected and transparent from first message to final review, and why
> the marketing promise must be about **process** ("verified, consented, protected") not **outcome**
> ("safe, guaranteed"). Grounded in `lib/muse-actions/*`, `api/muse/verification`, `api/muse/connect`,
> and `STRATEGY.md`.

---

## 0. The promise — say it the right way

**DO say:** *"Verified identity, signed consent, escrowed payment, time-boxed check-ins, and a review
trail — every step, for both sides."*

**DON'T say:** *"We guarantee you'll be safe."* (An impossible promise that creates legal exposure.)

Muse sells **a protected process**, not a guaranteed outcome. This is deliberate and it's in the
copy (`STRATEGY.md`). Safety is the *foundation*, never a rhetorical promise.

---

## 1. The two-layer safety model

Muse has **two environments**, and both must feel equally protected:

| Environment | What it is | Physical vs Digital |
|-------------|-----------|---------------------|
| **Studio shoots** | Managed space (FD Photo Studio + partners) | Staff, cameras, insurance, witnesses. A physical safety net. |
| **On-location shoots** | Anywhere else | The full digital safety stack below. |

The digital trust layer is **always on** for both. Studios add physical oversight **on top of** it.

---

## 2. The digital safety stack (every shoot, every side)

### 2.1 Verified identity (Stripe Identity)
- **Phone + face verification** before any *paid* booking. No self-reported ages.
- **18+ age verification** is mandatory and is enforced server-side on paid interactions
  (`isAgeVerificationCurrent`), plus geo-blocking for adult-content laws in TX/LA/AR/UT.
- **Verification can expire (~150 days)** → the app shows a banner and requires re-verification (a
  deliberate re-verify funnel, not a one-time checkbox).

### 2.2 Disclosure + consent (signed, before booking)
- **Disclosure forms** — both parties agree on boundaries, content, and **usage rights** *before* the
  shoot. This is where the consent that the current DM/group-chat market never has actually comes from.
- Hard-block: **NSFW content + payment is not allowed** (scam + minors risk are existential).

### 2.3 Safety check-ins (time-boxed)
- On booking confirmation, two **`pre_shoot_24h` check-ins** are created — one for each party (from
  `sessions.ts`).
- Each party **proceeds or cancels** via `checkinRespond`. A cancel auto-cancels the booking and
  releases any held funds. One-tap cancel is encouraged — the whole point is a frictionless "out."

### 2.4 Trusted contact + location share
- A **safety profile** holds an emergency/trusted contact.
- `safetyDetailsShare` sends shoot details (who, where, when, with whom) via **SMS/email** to a trusted
  contact — so someone outside the app always knows where the shooter is.

### 2.5 Two-way reviews (accountability)
- After a completed shoot, **both** parties review each other: 1–5 rating + text + **5 structured
  criteria** (communication, reliability, creative quality, professionalism, safety).
- This is the reputation that compounds and is visible to future matches/employers.

### 2.6 Moderation + reporting (the enforcement layer)
- **Content moderation** — AWS **Rekognition** scans every upload (`DetectModerationLabels`); the text
  layer has a heuristic pre-filter + AI classifier.
- **Reports** — any user can report; an AI triages; the reporter can see the **actual outcome**
  (`my-reports` returns open/actioned/dismissed). Transparent reporting — no black boxes.
- **Strikes + suspension** — repeated/bad reports trigger **strikes**, an escalation path, and
  **auto-suspension** (a warning → a strike count → a suspension). Two-track enforcement.
- **CSAM** — detect → suspend → stage → auto-transmit (NCMEC CyberTipline). *(Pipeline is code-ready;
  creds are the current gate — see HANDOVER.md.)*

### 2.7 Community governance
- Groups carry **rules** (markdown), **roles** (admin/moderator/member), **bans**, **mutes**,
  **join-request queues** for private groups, and mod tools (kick/ban/unban/set-role/pin/lock).

### 2.8 Blocking + reporting transparency
- **Block** any user (removes them from Discover, matches, and message requests for you).
- **Safe reporting** with strike escalation at **3+ distinct reporters** (auto-escalate to a strike).
- Every report the user files is visible to that user with its resolution status.

---

## 3. Where "transparency" is most visible to users

1. **The process is stated up front** — The landing page names the safety stack, not a vague promise.
2. **Funds are visibly held in escrow** — the booker sees the session rate + an *itemized* "Muse service
   fee"; the host sees their net; `PaymentHistory.tsx` shows what was actually sent.
3. **Check-ins are mandatory and visible** — both parties know the other must confirm.
4. **Reports have outcomes** — `my-reports` shows pending → actioned/dismissed, not silence.
5. **Reviews are two-way and structured** — no anonymous hit-and-runs.

---

## 4. The honesty note (important for the founder)

Safety here is **earned and demonstrated**, not asserted. Muddying the boundary between
"we protect the process" and "we guarantee safety" is the single biggest liability risk. This is exactly
the distinction flagged in `STRATEGY.md` ("promise the process, not the outcome") and it needs an actual
attorney to review the final language (see `_audit_artifacts/ATTORNEY_HANDOFF.md`). Never let a safety
feature outpace the liability language around it.
