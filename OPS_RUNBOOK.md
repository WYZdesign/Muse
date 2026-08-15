# Muse — Operations Runbook

Production operations reference for muse.wyzdesign.com. Covers backup/restore, incident response, secrets rotation, staging, and deployment.

---

## 1. Service topology (production)

| Service | Where | Note |
|---------|-------|------|
| App | Vercel (`muse` project) | Auto-deploys on push to `main` |
| Database + Auth + Storage | Supabase (`ejbwjmzrazfgtisqsamf`) | Production project |
| Vector embeddings | Supabase (`muse_profiles.embedding`, `muse_ai_docs`) | Replaced Ollama/Qdrant |
| AI (LLM + moderation) | OpenRouter | `OPENROUTER_API_KEY` |
| Payments | Stripe (live) | Checkout, Identity, Connect |
| Content scanning | AWS Rekognition | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` |
| CSAM reporting | NCMEC CyberTipline | ESP creds pending approval |

---

## 2. Backup & restore

**Supabase (primary data):**
- Enable **Point-in-Time Recovery (PITR)** on Supabase → Database → Backups. This is the single most important backup step and requires the Pro plan.
- Manual backup: Supabase Dashboard → Database → Backups → **Create backup**.
- Schema reference: `sql/MUSE_SCHEMA_FULL_20260813.sql` (single idempotent migration for all 47 tables).

**Vercel env vars (config-as-code):**
- Full list in `COMPLIANCE_HANDOFF.md` + the DPAPI vault (`W:\WYZ_Command_Center\.vault\credentials.enc`).
- To restore: re-add via Vercel → Settings → Environment Variables (names documented in `.env.example`).

**Restore test (run quarterly):**
1. Create a new Supabase project (or a staging project).
2. Run `MUSE_SCHEMA_FULL_20260813.sql` in SQL Editor.
3. Restore a PITR backup.
4. Point a staging Vercel env at it and smoke-test `/api/health` + `/muse`.

---

## 3. Incident response

**P0 — CSAM detected:** the pipeline auto-suspends the account and stages/queues a CyberTipline report (`muse_ncmec_reports`). Verify in Supabase that the account is `suspended: true`. Do NOT unsuspend. After NCMEC approval, reports auto-transmit.

**P0 — data breach / leaked key:** immediately rotate the affected credential (see §4), revoke in the provider, check `muse_admin_audit_log` for anomalous admin activity.

**P1 — app down:** check Vercel → Deployments (last build) and `https://muse.wyzdesign.com/api/health`. Roll back via Vercel → Deployments → "Redeploy" a previous version, or `git revert`.

**P2 — degraded feature:** check `_LOGS/` and the browser console; errors surface in `errorTracker` (console/sendBeacon until Sentry is wired).

---

## 4. Secrets rotation

All secrets live in two places: **Vercel env vars** and the **DPAPI vault** (`wyz_vault.py`). Rotate in BOTH when any changes.

| Secret | Rotate at | Rotate how |
|--------|-----------|-----------|
| `SUPABASE_SECRET_KEY` / `SERVICE_ROLE` | 90 days or on leak | Supabase → Settings → API → regenerate |
| `STRIPE_SECRET_KEY` | 90 days or on leak | Stripe → Developers → API keys → roll |
| `STRIPE_WEBHOOK_SECRET` | with Stripe key | Stripe → Webhooks → endpoint → roll secret |
| `AWS_SECRET_ACCESS_KEY` | 90 days or on leak | IAM → user → rotate access key |
| `OPENROUTER_API_KEY` | on leak | openrouter.ai → Keys → rotate |
| `CRON_SECRET` | on leak | any random string in Vercel |

---

## 5. Staging environment (recommended)

1. Vercel → create a **Preview** environment or a second project `muse-staging` pointing at the same repo.
2. Supabase → create a staging project (or a separate schema) — do NOT reuse production.
3. Set staging env vars (separate Supabase URL/key, Stripe **test** keys, a test OpenRouter key).
4. Deploy `main` → staging first, verify, then promote to production.

---

## 6. Deployment checklist (before promoting to production)

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `npm test` passes
- [ ] `npm audit` no high/critical (CI enforces)
- [ ] Build succeeds (Vercel auto)
- [ ] `/api/health` + `/terms` + `/muse` return 200
- [ ] Visual smoke-test (Discover → Muses → Chat → Bookings → Settings)

---

## 7. Monitoring & alerting (recommended)

- Uptime: UptimeRobot / BetterStack on `https://muse.wyzdesign.com/api/health`.
- Errors: Sentry (wire `NEXT_PUBLIC_SENTRY_DSN` — `src/lib/errorTracker.ts` is ready).
- Logs: Vercel → Observability → Runtime Logs.
- Analytics: wire a product-analytics SDK (PostHog/Mixpanel) for funnel + retention.
