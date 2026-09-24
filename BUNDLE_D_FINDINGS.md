# Bundle D — Findings / repro record

**Status:** READY FOR CODEX REVIEW  
**Date:** 2026-09-23  
**From:** Wyzmind (sole integrator)  
**Base SHA:** `5031750a3739dabee6229d203b3effa3bcd65c8a`  
**Bundle D scope (HANDOFF.md):** mobile interaction/regression sweep (Discover / Sessions / Muses / Network / Collab / Discover header glass)  
**This record:** source-level findings + repro inputs Codex needs; live 375/390 browser matrix **not** re-run this round (see UNVERIFIED)

---

## READY FOR CODEX REVIEW

Codex owns active product UI fixes in reserved files. This document is read-only findings for review — not an implementation request that overrides Codex file ownership.

---

## 1. Client persistence / session state (repro inputs)

| Item | Location | Value / behavior |
|------|----------|------------------|
| Storage key | `page.tsx:766` | `const STORAGE_KEY = "muse_v1";` |
| Persist | `page.tsx:782` | `safeSetItem(STORAGE_KEY, JSON.stringify(data))` |
| Load | `page.tsx:792` `loadState` | `safeGetItemAsync(STORAGE_KEY)` → parse; clear via `safeRemoveItem(STORAGE_KEY)` L799 |
| Apply session | `page.tsx:916` `applySession(accessToken, refreshToken?, attempt, fromAuthStateChange)` | re-entrancy guarded (L917+); retry `setTimeout` 1000ms on failure (L1061, L1100) |
| Infinite-loop guard | `page.tsx:501–515` `loadStateRef` | blocks unbounded `applySession` ↔ `setSession` loop on repeated refresh failure |
| Onboarding state hook | `useAuthOnboardingState.ts` | pure `useState` cluster extracted from `page.tsx` (authMode/email/pass/name, obStep/obData, personality test) — **no storage I/O in hook** |
| Demo seed fixture | `tests/fixtures/test-fixtures.ts:6,14` | `demoPage` Playwright fixture (page factory) — no alternate STORAGE_KEY |

### Repro — stale/local session after demo reset (manual)

1. Open `http://localhost:3000/muse` (or custom domain) with demo ON.
2. Complete onboarding/login path that writes `muse_v1`.
3. DevTools → Application → Local Storage → clear `muse_v1` **or** set invalid JSON.
4. Reload: `loadState` should `safeRemoveItem` on bad raw (L794–799) and fall back to unauthenticated/splash — not hang in `applySession` retry (guard L501+).
5. If refresh token present but API 401: expect bounded retries (1s), not tab freeze.

**Pass criteria:** no unbounded retry; bad storage cleared; demo mutations still 409 `DEMO_MODE`.

---

## 2. Mobile interaction findings (from HANDOFF live audit — still open for Codex)

Recorded 2026-09-23 live custom-domain audit (HANDOFF ~L897–905). Not re-verified by Wyzmind this round:

| ID | Finding | Severity | Suggested repro |
|----|---------|----------|-----------------|
| D1 | Identity verification banner **Dismiss** does not persist removal; overlays Muses/BTS/Network/Profile/Sessions | **P0** | 375px → dismiss → navigate tabs → banner returns |
| D2 | Muses list cards clip dense metadata at 375px | P1 | 375px list view → inspect truncation vs grid |
| D3 | Feed filter **Photos** empty despite image posts in All; no empty-state copy | P1 | Feed → Photos tab |
| D4 | Collab Safety + Sessions booking close buttons unnamed in AX tree | P1 | open dialogs → accessibility tree → close control |
| D5 | Discover header frosted capsules/bubbles — product wants quieter flatter header | P2 (visual direction) | 375px screenshot before/after |

### Codex review ask

1. Confirm which of D1–D5 are already fixed in current dirty `page.tsx` / `FeedScreen.tsx` / `muse.css` / protected e2e.
2. Return per-ID: fixed-in-worktree | still-open | deferred + test plan.
3. Do **not** re-open Discover queue isolation (HANDOFF: verified fixed — descendants `aria-hidden` + `inert`).

---

## 3. Feed filter (adjacent — Codex already touching FeedScreen)

Dirty worktree `FeedScreen.tsx` claims Photos filter accepts `type === "photo"` or `img`-bearing posts + filtered empty state. **Bundle D acceptance:** after type gate, e2e or component test that Photos shows image posts or honest empty state.

---

## 4. Integration order (Bundle D relative to go)

```
Codex: 4× page.tsx tsc sites → HANDOFF tsc exit 0
Owner: go
Wyzmind: GO protocol 1–5 (gates → stage Codex files → push → deploy check → smoke)
Wyzmind: Bundle A merge review (step 6) — separate
Codex/Wyzmind: D1–D5 work-only-if-assigned after baseline green
```

Bundle D **live** 320/375/390 matrix: **UNVERIFIED** until after integration baseline (current tsc RED blocks trustworthy full E2E).

---

## 5. Verification record

- Revision/worktree: `V:\Muse` @ `5031750`; Codex dirty files not edited by Wyzmind
- Files changed: this document only
- Commands actually run + exact result: source greps for `STORAGE_KEY`/`loadState`/`applySession` (line refs above); Bundle A worktree gates green (unrelated)
- Browser/mobile widths and flows verified: **UNVERIFIED** this round (prior ChatGPT live audit cited, not re-run)
- Migration/environment/deploy state: none; demo mode ON
- Known failures or unverified assumptions: D1–D5 from prior live audit may be partially fixed in dirty tree — needs Codex confirmation
- Next concrete owner/action: **Codex** — review this file with tsc patches; mark D1–D5 status in `HANDOFF.md`
