# Vercel Environment Contract — 2026-10-03

This is a source-derived, value-free contract for the Muse Vercel project. It
does **not** prove dashboard values are present; the Vercel connector is not
available in this session.

## Must be configured for core production

- `NEXT_PUBLIC_SUPABASE_URL`
- One publishable client key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` or
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- One server secret: `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL` (canonical HTTPS app URL)
- `NEXT_PUBLIC_SITE_URL` when session checkout flows are enabled
- `ADMIN_EMAILS`, `NEXT_PUBLIC_OWNER_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`
- `MUSE_DEMO_MODE` and `NEXT_PUBLIC_DEMO_MODE` explicitly set to production
  values, never left implicit

## Conditional feature contracts

| Feature | Variables |
|---|---|
| Stripe subscriptions, bookings, Connect | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Email | `RESEND_API_KEY`, `UNSUBSCRIBE_SECRET`, `NEXTAUTH_SECRET` |
| Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| Image/content safety | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET` |
| Safety escalation | `NCMEC_ENDPOINT`, `NCMEC_CLIENT_ID`, `NCMEC_CLIENT_SECRET` |
| Calls/recording | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` |
| Social OAuth | provider client ID/secret pairs for Instagram, Facebook, Spotify, SoundCloud; `OAUTH_STATE_SECRET`, `OAUTH_TOKEN_KEY` |
| AI | `OPENROUTER_API_KEY`; optional model overrides; `GROQ_API_KEY`; Replicate vars where depth generation is enabled |
| Maps/native billing | `NEXT_PUBLIC_MAPBOX_TOKEN`, RevenueCat platform API keys |

## Dashboard audit procedure

1. Compare only variable **names**, scope, and target values to this contract;
   never copy values into a ticket, handover, or chat.
2. Confirm `NEXT_PUBLIC_SUPABASE_URL` points to Muse project
   `ejbwjmzrazfgtisqsamf`, not the WYZ-Design project.
3. Check values for a leading BOM/whitespace, particularly copied public keys
   and URLs.
4. Confirm server secrets have no `NEXT_PUBLIC_` prefix and production scope is
   selected intentionally.
5. Redeploy only after the audit, then verify the deployment SHA and health
   route from an authorized browser/network.
