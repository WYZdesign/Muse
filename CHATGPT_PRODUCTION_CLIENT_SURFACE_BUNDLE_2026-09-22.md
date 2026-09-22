# Production Client-Surface Hardening Bundle — ChatGPT — 2026-09-22

## Live evidence

The production custom-domain client currently loads resources from:

- first-party `muse.wyzdesign.com`
- Stripe / Stripe Connect (`api.stripe.com`, `connect-js.stripe.com`)
- Google Fonts
- `vercel.live`
- `www.wyzdesign.com`

An embedded Stripe Connect data-layer iframe is present with no iframe title and no sandbox attribute. This may be Stripe-managed/expected; treat it as an intentional third-party dependency to document and constrain rather than blindly modifying provider markup.

## Deliver together

### Production tooling boundary

- Confirm whether `vercel.live` is intentionally enabled on the production custom domain. If not, gate/remove Vercel Live/dev overlay tooling from production builds.
- Add CI or deploy verification that rejects development/live-debug tooling on production domains unless explicitly allowlisted.

### Third-party inventory and policy

- Maintain an allowlist of approved production third-party origins and their purpose: payments, fonts, analytics/monitoring, support, etc.
- Add Content-Security-Policy appropriate to actual runtime needs: restrictive defaults plus explicit `script-src`, `connect-src`, `frame-src`, `img-src`, `font-src`, and `media-src` allowlists.
- Add `frame-ancestors 'none'` or explicitly approved framing policy; set Permissions-Policy appropriate to camera/mic/location/payment needs.
- Verify Stripe Connect origins are limited to documented Stripe endpoints and never dynamically constructed from untrusted input.

### Privacy/performance

- Review Google Fonts against privacy posture and performance budget; self-host/font-display strategy if product policy requires first-party delivery.
- Document payment-provider data flow and required user disclosures/consent behavior.
- Ensure provider iframes have meaningful titles where integration supports it; otherwise document the vendor limitation and exclude provider internals from app-owned accessibility expectations.

## Acceptance checks

1. Production resource-origin snapshot contains only approved origins.
2. No Vercel Live/dev tooling on production unless an explicit environment switch approves it.
3. CSP report-only rollout followed by enforced policy with no unexpected violations.
4. Stripe payment/Connect flows still pass in demo mode and no real transaction is reachable from QA fixtures.
5. Security-header and third-party-origin checks run in CI/deploy verification.
