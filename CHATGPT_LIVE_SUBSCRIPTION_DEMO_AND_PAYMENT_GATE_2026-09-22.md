# Live Subscription Demo and Payment Gate — 2026-09-22

## Evidence

Live Settings → Subscription opened without selecting a plan, applying a code,
boosting, or beginning checkout. The account is labelled:

> Founding Member, Lifetime Pro — You're locked in for life. Thanks for
> believing in Muse. Browse plans below anytime — you won't be charged.

The same screen displays live-looking commercial choices:

- Muse Pro: `$9.99 /month`, **Select Muse Pro**
- Muse Pro Annual: `$79.99 /year`, **Select Muse Pro Annual**
- **Boost Now (24h)** and **Buy Boost — $3.99**

It provides only `Promo code` placeholder plus an unnamed text field and
**Apply**. Rendered DOM has no label/name/ARIA label for the promo input and no
`main`/`role=main` landmark on the screen.

## P0 — Demo/founding-membership transaction boundaries are ambiguous

Showing purchase-selection and buy controls immediately beneath a promise that
the user “won't be charged” is contradictory unless they are explicitly
disabled or transition to a clearly labelled non-transactional demo preview.
The page must not create a checkout, payment intent, subscription, boost,
credit debit, analytics conversion, or any other durable monetary side effect
in demo mode. That requires server-side enforcement, not client copy.

For a real commercial release, the preview page must show material purchase
terms before any checkout initiation: currency/price, billing cadence, renewal,
cancellation method/effective date, tax/fees treatment, feature entitlement,
refund policy where relevant, and links to current Terms/Privacy. Final
checkout confirmation must be handled by the authorized payment provider with
authoritative server-created prices/amounts.

## Required remediation

1. Establish a single product state for demo, founding/lifetime, free, paid,
   expired, and trial users. Render controls/messages from it consistently.
2. In demo: label the surface **Demo — purchases disabled**, disable or replace
   all purchase/boost/apply controls with non-mutating previews, and reject all
   related server mutations/Stripe-session creation.
3. For lifetime/founding access: hide/reconcile unavailable plan choices or
   explain exactly which optional purchasable add-ons remain, rather than make
   an unconditional “won't be charged” promise.
4. Make promotion input a labelled control (e.g., **Promo code**) with
   validation/result announcement; never trust client discounts/prices.
5. Add one semantic main landmark and correct route heading hierarchy.
6. Test zero side effects from every commercial control in demo and test
   entitlement/checkout idempotency, cancel, retry, webhook, and refund cases
   in production-mode staging.

## Acceptance gate

Capture server logs/database/payment-provider evidence that activating every
commercial control in demo produces no checkout, payment intent, subscription,
credit/boost change, or conversion event. On a non-demo staging account,
independently verify the disclosed price/terms and complete lifecycle with a
test payment provider. Re-run accessible keyboard/screen-reader form tests.
