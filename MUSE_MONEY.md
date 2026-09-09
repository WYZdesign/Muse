# MUSE — HOW THE MONEY MOVES

> The full business model: how creatives make money, how Muse (the owner) makes money, and the exact
> booking → checkout → payment → wrap-up flow. Grounded in the code (`api/muse/connect/route.ts`,
> `api/checkout/route.ts`, `api/webhooks/stripe/route.ts`, `lib/config.ts`, `lib/muse-actions/sessions.ts`).

---

## 1. The two revenue engines

Muse makes money two ways:

1. **Subscriptions** — recurring Muse Pro / Muse Studio.
2. **Marketplace take** — a cut of every paid booking (the big one).

Plus three **growth/incentive** levers that don't directly charge the core act but create the loop:
referrals (earn Pro), boosts (visibility), and TFP (free portfolio-building that seeds the supply side).

---

## 2. How users (creatives) make money

### A. Sell their skills as a bookable Session
A host lists a **Session** with a rate (e.g. `$75/hr`). Clients book it. When the shoot wraps, the host
is paid. This is the primary earning path for **behind-camera** and service creatives.

### B. Get hired via a paid Collab Brief
A client posts a **Brief** with a budget (e.g. `$2,000–$3,000`, `$5,000–$8,000`). Creatives apply and
get paid for the gig. This is project-based income.

### C. Work as an industry hire
The **industry side** (casting directors, producers, art buyers, agents) list paid roles. Talent
(applies) gets booked. Higher-ticket, higher-volume work.

### D. Monetize a profile (crossover passive income)
Professionals (agents, studios, art buyers) list themselves with rates and openings. On Muse they get
verified, pre-qualified clients (see `STRATEGY.md`).

### E. Trade-for-portfolio (TFP) — free, but it's the funnel
TFP work is **unpaid by design** — it's how a new creative gets 10 portfolio images, builds their
profile, gets a review trail, and climbs into paid work. Muse never charges for TFP. It is the
acquisition engine that feeds A/B/C/D.

> **Why TFP matters to the model:** "normie" → finds photographer → free first shoot → portfolio →
> back on the app as a stronger profile → eventually books/pays. The whole flywheel turns on the free
> tier being genuinely good.

---

## 3. How Muse (the owner) makes money

### Subscription tiers (freemium)
| Tier | Price | Notes |
|------|-------|-------|
| Free | $0 forever | Basic profile, limited likes, standard discover. The acquisition tier. |
| **Muse Pro** | **$9.99/mo** (or $79.99/yr, ~33% off) | Unlimited likes, see who likes you, advanced filters, read receipts, 1×/week boost, incognito, priority discover. |
| **Muse Studio** (industry) | **$29.99/mo** | Agency/casting/brand tier — boosted brief placement, unlimited talent lists, priority support. Live Stripe price `price_muse_studio_monthly`. |

### Marketplace take on paid bookings (the big engine)
Every paid Session booking carries a **15% blended platform take**, split so neither side eats it alone:

- **MUSE_HOST_COMMISSION_RATE = 7%** — deducted from the *host's* payout.
- **MUSE_BUYER_SERVICE_FEE_RATE = 8%** — added *on top of* the session rate and charged to the
  *booker* as an itemized "Muse service fee" (visible, not buried).

Both amounts go to `application_fee_amount` (the platform's share). The host is paid
`amount − 7%`. The booker pays `rate + 8%`.

**Real example (a `$100/hr` session):**
- Booker is charged **$108** ($100 session rate + $8 service fee) via escrow.
- Muse keeps **`$8 fee + $7 commission = $15`** (15%).
- Host receives **$93** (via Stripe Connect destination charge).

### À la carte boosts (pay-per-boost)
3-tier duration pricing for one-off boost purchases (free users buy inventory, Pro users get 1×/week free):

| Duration | Price | Use case |
|----------|-------|----------|
| 24 hours | **$3.99** | Quick visibility spike for a weekend shoot |
| 72 hours | **$9.99** | Extended visibility for a launch or portfolio drop |
| 7 days | **$19.99** | Maximum exposure for serious booking push |

Boost inventory is granted on webhook confirmation (`boost-purchase-complete`). Active boost duration
extends (not stacks) if already boosted. Quest rewards also grant boost inventory.

### Growth levers (not direct core charges, but they generate direct revenue)
- **Referrals** — "refer 3 friends → get a year of Pro free." Cheap acquisition.
- **Boosts** — Pro get 1×/week free; free users buy à la carte (see above). Boost = top of the Discover stack.
- **Founding tier** — first 150 get lifetime Pro free (acquisition + social proof, not revenue).

---

## 4. The full booking → checkout → payment → wrap-up flow (exact, from code)

### PHASE 1 — BOOK
- Client finds a **Session** → `sessionBook` → creates a booking `status: pending` → notifies the host.
- Host responds via `bookingRespond`:
  - **accept** → `status: confirmed` + creates **two pre-shoot 24h safety check-ins** (one per party).
  - **decline** → `status: cancelled`.
  - **reschedule** → back to `pending` with a new date.

### PHASE 2 — PAY (escrow)
- Client opens checkout → **`connect` → `create-booking-checkout`** → Stripe **Checkout Session**.
- The amount + payee are derived **server-side** from the session record (never trust the client).
- `payment_intent_data.capture_method = "manual"` → **authorize/hold only, NOT captured.** Funds are
  held in escrow. Neither party can take the money yet.
- **Guard against double-payment:** if a payment already reached `held` or `succeeded`, a second
  checkout is rejected (409).
- A `muse_booking_payments` row is upserted with `status: pending`.

### PHASE 3 — SHOOT
- Pre-shoot **safety check-ins** fire 24h before (each party responds proceed/cancel).
- Disclosure + consent forms signed. Trusted contact + location shared.
- The shoot happens (managed studio or on-location).

### PHASE 4 — COMPLETE (capture)
- One party calls `bookingComplete` (only allowed when `status: confirmed`).
- Muse **captures** the held PaymentIntent → money actually moves → payment row → `status: succeeded`.
- The host is paid their net via Stripe Connect destination charge.
- The other party is notified to **leave a review**.

### PHASE 5 — REVIEW
- `reviewSubmit` → both parties leave a 1–5 rating + text + **5 structured criteria** (communication,
  reliability, creative quality, professionalism, safety).
- These reviews + match/booking history are the trust signal that drives future discovery.

### FAILURE / CANCELLATION PATHS
- `bookingCancel` (either party) → booking `cancelled` + Stripe PaymentIntent **cancelled** (no charge).
- `checkinRespond` cancelling → booking auto-cancelled, held funds released.
- Capture failure → `bookingComplete` returns 402, booking stays `confirmed`, money still held.
- **Refund requests** → user submits via sessions flow → `admin-refunds` lists open requests →
  `admin-resolve-refund` resolves with note + audit log.

---

## 5. Connecting the flows to "making money"

| You are | You make money via | Muse makes money via |
|---------|-------------------|----------------------|
| Photographer / Director / Videographer / Editor / Composer | Booking your Sessions | 15% take on the booking |
| Model / Actor / Content Creator | Being booked (paid briefs / industry hires) | Pro subscription + brief monetization |
| Studio / space | Filling idle hours, paid rentals | Space-tier subscription + marketplace take |
| Agency / casting / brand | Finding vetted talent | Muse Studio tier ($29.99/mo) |
| Everyone (growth) | Referrals → free Pro | Subscription conversion |

---

## 6. The flywheel (why the model compounds)

1. **Free tier** → TFP builds profiles + reviews + supply.
2. **Verified + reviewed** profiles → trust → more paid bookings.
3. **Paid bookings** → Muse earns 15% + converts free users to Pro.
4. **Pro perks** (boost, priority discover, advanced filters) → more visibility → more bookings.
5. **Reviews + trust history** (behavioral data) → the moat no one can copy.

The valuation story is a **payments/trust story**, not a social-graph story. Measure **bookings closed,
dollars moved, and repeat rate** — never raw signups (see `STRATEGY.md`).
