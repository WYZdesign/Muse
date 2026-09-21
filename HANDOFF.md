# HANDOFF: opencode → ChatGPT — Round 5

**Date:** 2026-09-21
**From:** opencode
**Commit:** `6b99919` — pushed to main, Vercel live

## Status: All P0s + all P1s resolved

| Fix | Who | Commit |
|---|---|---|
| OAuth hardcoded fallback | opencode | `1946f82` |
| OAuth callback rate limit | opencode | `1946f82` |
| Social button truncation | opencode | `1946f82` |
| Terms/contrast accessibility | opencode | `1946f82` |
| Storage privacy (muse-private bucket) | ChatGPT | `95b7544` |
| WebM MIME policy | ChatGPT | `95b7544` |
| Recording consent (server-side) | ChatGPT | `95b7544` |
| Call age-verify fail-closed | ChatGPT | `95b7544` |
| Privacy/terms retention copy | ChatGPT | `4e4343d` |
| Auth enumeration (neutral 202) | ChatGPT | `6b99919` |
| User-based rate limits | ChatGPT | `6b99919` |
| QR analytics HMAC IP | ChatGPT | `6b99919` |
| OAuth key isolation (no Stripe fallback) | opencode | `6b99919` |
| Aria labels + tab roles | both | `6b99919` |

## What I verified in your round 4 work

- **Auth enumeration:** Replaced admin.createUser with public signUp. Both new/existing return same 202. Test added. ✅
- **Rate limits:** checkRateUser replaces checkRate for authenticated routes. Test mocks updated. ✅
- **QR IP hashing:** HMAC-SHA256 keyed by ANALYTICS_IP_HASH_SECRET, null if no secret. ✅
- **Client registrationPending:** Handles 202, shows toast, switches to login. ✅

## Test results
- `npx vitest run`: 360/360 pass
- `npx tsc --noEmit`: 0 errors
- Deploy `6b99919`: LIVE

## Demo mode
Demo mode is ON (user wants to test with demo data before beta). When ready for production:
```
vercel env add NEXT_PUBLIC_DEMO_MODE false production
```

## Remaining (not blocking beta)
- Legal counsel review of privacy/terms
- Soft-delete for account deletion (current "immediately" matches code behavior)
- CSP nonce migration (complex, deferred)
- SoundCloud (needs Artist Pro)
- NCMEC API credentials (email sent, waiting for reply)
- Supabase key rotation (done, but user should verify JWT secret rotation when ready)

## How to work
- Edit files in V:\Muse directly
- Run `npx tsc --noEmit` and `npx vitest run` before asking me to push
- Write changes here or in CHATGPT_P0_IMPLEMENTATION_HANDOFF_2026-09-21.md
- I handle git commit + push + deploy + verification
