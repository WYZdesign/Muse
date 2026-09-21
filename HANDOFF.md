# HANDOFF: opencode → ChatGPT

**Date:** 2026-09-21
**From:** opencode (mimo-v2.5-free) — the CLI agent that built most of this codebase
**To:** ChatGPT — you have access to V:\Muse (local) and GitHub (WYZdesign/Muse)

## What just happened this session

I (opencode) did a triple-audit of the entire Muse codebase. ChatGPT also did two independent audits. I fixed everything I could. Here's the full picture.

## Fixes I pushed (commit 1946f82, deployed)

1. **CRITICAL: OAuth state fallback removed** — `src/lib/oauth-state.ts` no longer falls back to a hardcoded string. Throws on startup if `OAUTH_STATE_SECRET` is unset.
2. **HIGH: OAuth callback rate-limited** — `src/app/api/muse/social/callback/route.ts` now calls `checkRate(ip, "oauth_callback", 10)` before token exchange.
3. **UI: Social button text overflow fixed** — Removed `overflow:"hidden"` from the Google/Facebook/X buttons on the signup screen. Labels were clipped.
4. **UI: Terms text contrast bumped** — `fontSize:12 → 13`, `color:var(--muted) → rgba(255,255,255,0.65)`. Also bumped `.auth-divider` text.
5. **DEMO_MODE disabled** — Added `NEXT_PUBLIC_DEMO_MODE=false` to Vercel Production. Demo profiles/feed/matches are now OFF. This was the biggest P0 ChatGPT caught.

## What ChatGPT's audits found (P0s not yet fixed)

### 1. Public storage bucket for "private" albums
- `sql/muse_storage.sql` creates `muse-uploads` as `public: true`, grants SELECT to `public`
- Upload route returns `getPublicUrl(...)`
- Album page hides private/invite records at UI level, but anyone with the URL can access
- **Fix needed:** Private bucket + signed URLs, or at minimum a storage RLS policy

### 2. WebM not in bucket MIME policy
- Bucket SQL allows JPEG/PNG/WebP/GIF only
- Upload route accepts WebM (audio/webm, video/webm) for voice/video notes
- Voice/video notes may fail at storage layer
- **Fix needed:** Add audio/webm and video/webm to bucket policy

### 3. Account deletion vs retention policy conflict
- Code immediately deletes messages/posts/bookings/reports
- Privacy copy says 30-day retention for most data, 7 years for bookings
- **Fix needed:** Soft-delete + scheduled job, or update privacy copy to match behavior

### 4. Recording consent is UI-only
- Call recording works via LiveKit Egress → R2
- No server-side consent enforcement before starting egress
- **Fix needed:** Persist affirmative consent from all participants before starting recording

### 5. Call age-verification fails open
- If the DB query for age verification throws, the catch block allows the call to continue
- **Fix needed:** Fail closed on verification lookup failure

## How to work on V:\Muse

### Git
- Repo: `V:\Muse` (git repo, main branch)
- Remote: `https://github.com/WYZdesign/Muse.git`
- Current HEAD: `1946f82` (pushed, deployed)
- Working tree: clean

### TypeScript
- `npx tsc --noEmit` — must pass before committing
- Test suite: `npx vitest run` (359 tests, all passing)

### Deployment
- Push to `main` → Vercel auto-deploys
- Verify deploy: `python W:\WYZ_Command_Center\wyz_deploy_check.py <sha>`
- Env vars: managed via `vercel env` CLI or Vercel dashboard

### Database
- Supabase project: `ejbwjmzrazfgtisqsamf`
- 21 migrations in `V:\Muse\sql\migrations/` — all applied, tracked in `schema_migrations`
- Migration runner: `V:\Muse\scripts\run_migrations.py` (requires `DATABASE_URL`)
- SQL suite: `W:\WYZ_Command_Center\run_muse_sql_v2.py` (legacy, still works)
- Anon key: works for reads via PostgREST (RLS applies)
- Service role: bypasses RLS, used server-side

### Vault (credentials)
- Location: `W:\WYZ_Command_Center\.vault\` (DPAPI encrypted)
- Access: `python -c "from wyz_vault import get_credential; print(get_credential('KEY_NAME'))"`
- Key names: `muse_SUPABASE_SECRET_KEY`, `muse_SUPABASE_SERVICE_ROLE_KEY`, `muse_SUPABASE_ANON_KEY_LEGACY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `STRIPE_SECRET_KEY`, etc.

### Vercel env vars (key ones)
- `NEXT_PUBLIC_SUPABASE_URL` = `https://ejbwjmzrazfgtisqsamf.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = legacy anon JWT (role=anon)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = same anon JWT (verified working)
- `SUPABASE_SECRET_KEY` = `sb_secret_G1Ndcqnv...` (rotated 2026-09-21)
- `SUPABASE_SERVICE_ROLE_KEY` = legacy service_role JWT
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_51U0n04...`
- `STRIPE_SECRET_KEY` = `sk_live_...`
- `LIVEKIT_URL` = `wss://muse-msyvhjy1.livekit.cloud`
- `LIVEKIT_API_KEY` = `APIgMyZWcT3nX8R`
- `NEXT_PUBLIC_DEMO_MODE` = `false` (just set this session)

### Code conventions
- `src/app/(muse)/muse/` — all Muse screens, components, hooks
- `src/app/api/muse/` — API routes (GET/POST handlers)
- `src/lib/` — shared utilities (supabase, rate-limit, oauth-state, etc.)
- `src/app/(muse)/muse/muse.css` — all styles (single file, 1900+ lines)
- `src/app/(muse)/muse/page.tsx` — main app shell (4100+ lines, handles auth/matching/navigation)
- Tests: `src/**/*.test.ts` (vitest)

### Key architecture
- **Auth:** Supabase Auth (email + OAuth). Client uses anon JWT, server uses service-role.
- **DB:** Supabase Postgres with RLS. Server-side uses service-role (bypasses RLS).
- **Storage:** Supabase Storage (`muse-uploads` bucket, currently public).
- **Payments:** Stripe Connect (embedded) + Stripe Identity (age verification).
- **Calls:** LiveKit (rooms, tokens, Egress for recording → R2).
- **Moderation:** Sightengine + AWS Rekognition dual scan.
- **AI:** OpenRouter (matching), Groq (transcription), Replicate (3D depth).
- **Email:** Resend.
- **Push:** VAPID web push.

## What to fix next (priority order)

1. **Storage bucket privacy** — Make private albums actually private (signed URLs or RLS)
2. **WebM MIME policy** — Add audio/webm, video/webm to bucket
3. **Recording consent** — Server-side consent before Egress start
4. **Call age-verification fail-closed** — Remove catch-all that allows calls on DB error
5. **Account deletion retention** — Align code with privacy policy (soft-delete or update copy)

## Rules
- DO NOT edit `wyz_os.ps1` (PowerShell entry, append-only)
- DO NOT commit secrets (check `git diff` before pushing)
- Always `npx tsc --noEmit` before committing
- Push to main → Vercel auto-deploys → verify with `wyz_deploy_check.py`
