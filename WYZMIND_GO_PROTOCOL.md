# WYZMIND GO PROTOCOL — say "go" and nothing else

**Date:** 2026-09-23  
**From:** Wyzmind (integrator)  
**Audience:** Owner (Torreé), ChatGPT/Codex, any future agent  
**Status:** ARMED — waiting on typecheck green, then owner **`go`**

---

## Communication rule

All state handoffs go through:

1. **`HANDOFF.md`** — append-only verification records (commands + exact output)
2. **`WYZMIND_GO_PROTOCOL.md`** (this file) — the only authorized integration sequence
3. **`DELIVERY_STATUS.md`** — what is actually an ancestor of `origin/main`

Do not chat-drive the next step. When the gate below is green, append proof to `HANDOFF.md`. When the owner types **`go`**, Wyzmind executes this protocol with no further questions.

---

## Current gate (as of last probe)

| Gate | Result |
|------|--------|
| HEAD | `5031750a3739dabee6229d203b3effa3bcd65c8a` (`main`) |
| Staged files | none |
| Deployed by Wyzmind | no |
| Demo mode | ON (`MUSE_DEMO_MODE` unchanged) |
| Cache-free tsc | **RED — exit 2, 4 errors, all `page.tsx`** |
| Focused eslint page+Feed | exit 0 |
| Working tree | 8 dirty files (ChatGPT type work + Feed fix + protected test files + `muse.css`) |

### Exact tsc failures ChatGPT must clear (last probe)

```text
page.tsx(2257,37): TS2345 number not assignable to string
page.tsx(2276,35): TS2345 number not assignable to string
page.tsx(3771,41): TS2322 string | undefined not assignable to string | StaticImport
page.tsx(3771,56): TS2322 string | undefined not assignable to string
```

### Preconditions before owner should say `go`

- [ ] ChatGPT signals `page.tsx` type remediation complete
- [ ] Wyzmind re-runs: `.\node_modules\.bin\tsc.cmd --noEmit --incremental false --pretty false` → **exit 0**
- [ ] Wyzmind appends that exact output to `HANDOFF.md`
- [ ] Still **no** push/deploy until after `go`

---

## On owner message `go` — Wyzmind executes in order

Stop on first failure; append failure to `HANDOFF.md`; do not push.

### 1. Preflight on shared tree

```powershell
cd V:\Muse
git rev-parse HEAD
git status --short
.\node_modules\.bin\tsc.cmd --noEmit --incremental false --pretty false
.\node_modules\.bin\eslint.cmd "src/app/(muse)/muse/page.tsx" "src/app/(muse)/muse/screens/FeedScreen.tsx"
.\node_modules\.bin\vitest.cmd run
npm run build
```

Require: tsc **0**, eslint **0 errors**, vitest green, build success.

### 2. Stage ChatGPT integration bundle only

Allowed to stage (ChatGPT/Codex exclusive + agreed Feed fix):

- `src/app/(muse)/muse/page.tsx`
- `src/app/(muse)/muse/hooks/useAuthOnboardingState.ts`
- `src/app/(muse)/muse/screens/FeedScreen.tsx`
- `HANDOFF.md`, `WYZMIND_GO_PROTOCOL.md`

**Do not stage** without separate green review + owner OK:

- `tests/e2e/demo-mode.spec.ts`, `tests/e2e/smoke.spec.ts`, `tests/fixtures/test-fixtures.ts`, `tests/helpers/test-helpers.ts`
- `src/app/(muse)/muse/muse.css` (concurrent dirty — inspect diff first)
- Anything under Bundle A worktree until Bundle A protocol (step 6)

### 3. Commit + push (Wyzmind only)

```powershell
git add <files from step 2>
git commit -m "type: page.tsx remediation + Feed filter empty-state (ChatGPT/Codex) + gate record"
git push origin main
```

Confirm `git log -1 --oneline` matches pushed SHA.

### 4. Deploy verification

```powershell
python W:\WYZ_Command_Center\wyz_deploy_check.py <full-sha>
```

Require **`DEPLOY IS LIVE` / `READY`** for that exact SHA. Local build ≠ live.

### 5. Post-deploy smoke

- `https://muse.wyzdesign.com/api/health` → 200
- Live mutation still demo-gated (expect `409` `DEMO_MODE` on `create-album`)
- UI Badge / smoke e2e as applicable
- Append results to `HANDOFF.md`
- Update `DELIVERY_STATUS.md` verified SHA only after deploy check passes

### 6. Bundle A (separate — only after steps 1–5 stable)

Worktree: `C:\Users\torre\AppData\Local\Temp\opencode\muse-bundle-a`  
Branch: `bundle/a-album-private-storage`  
Base: `5031750`  
State: **29/29 vitest green** in worktree; migration `0025_add_storage_cleanup_jobs.sql` **REQUIRED, not applied**; not merged.

On go + type integration done:

1. Re-run Bundle A vitest/tsc/eslint in worktree  
2. Review diff; append Bundle A HANDOFF footer  
3. Merge/cherry-pick to integration branch  
4. Re-run full gates  
5. Apply `0025` to Supabase **only** if owner explicitly authorizes migration (separate from `go` unless owner says `go` includes migrate)

### 7. Stop

No extra refactors. No secret commits. Demo mode stays ON unless owner explicitly disables it in writing.

---

## File ownership map

| Path | Owner | Notes |
|------|-------|-------|
| `page.tsx`, `useAuthOnboardingState.ts` | ChatGPT/Codex | Wyzmind gates only |
| `FeedScreen.tsx` | ChatGPT/Codex | filter + empty-state |
| Protected e2e/helpers/fixtures | ChatGPT contract | do not stage casually |
| `muse.css` | inspect | concurrent dirty |
| Bundle A worktree albums.* + 0025 | Wyzmind | isolated |
| `HANDOFF.md`, this file, `DELIVERY_STATUS.md` | Wyzmind integrates | append-only for records |
| Stage / push / deploy / migrate | **Wyzmind only** | after `go` + green gates |

---

## One-line cheat sheet

```text
ChatGPT: HANDOFF.md "type clean" + exact tsc exit 0 proof
Owner:   go
Wyzmind: protocol steps 1–7, no questions
```

---

## Stage allowlist delta — 2026-09-23 (non-blocked work)

Additional Wyzmind-owned docs safe to stage with the type integration commit:

- `HANDOFF.md`
- `WYZMIND_GO_PROTOCOL.md`
- `BUNDLE_B_EVIDENCE.md`
- `BUNDLE_D_FINDINGS.md`

Bundle A remains **branch-only**:

- Worktree commit **`a504daa`** on `bundle/a-album-private-storage` (base `5031750`)
- Files: `albums.ts`, `albums.test.ts`, `sql/migrations/0025_add_storage_cleanup_jobs.sql`, `BUNDLE_A_HANDOFF.md`
- Gates in worktree: vitest 29/29 exit 0 · eslint 0 errors/12 warnings exit 0 · cache-free tsc **exit 0**
- **Not merged to main** · migration 0025 **not applied**
