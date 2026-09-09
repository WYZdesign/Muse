# MUSE — THE COMPLETE PICTURE

> One-page-plus mental model of the entire app. Read this first, then the sibling docs:
> `MUSE_MONEY.md` (how the money moves), `MUSE_SAFETY_TRANSPARENCY.md` (the trust layer),
> `MUSE_DEMOGRAPHICS_DEMAND.md` (who + demand), `MUSE_GAPS_ADJUSTMENTS.md` (what's missing),
> `MUSE_PITCH_EXPLAIN.md` (how to say it out loud), `MUSE_CLAUDE_CRITIQUE.md` (outside perspective).
> For pure positioning/business-layer, the master is `STRATEGY.md`; for technical debt, `HANDOVER.md`.

---

## 1. What Muse is (in one sentence)

**The verified, consented, protected marketplace for creative shoots and collaborations — the
trust-and-transaction layer that Instagram, ModelMayhem, and Peerspace each have only half of.**

Not a dating app. Not a job board. A way for people who want to be in front of *or* behind a camera
to find each other, agree on terms, book, pay safely, shoot, and be reviewed — so the whole loop
stays professional and protected.

---

## 2. Who it's for (the two-sided market)

The core insight is a **duality** — there are two kinds of creative, and they *need each other*:

| Side | What they are | Examples (from `types.ts`) |
|------|---------------|----------------------------|
| **Behind the camera** (crew) | The people *making* the work | Photographer, Director, Videographer, Editor, Writer, Producer, Designer, MUA, Stylist |
| **In front of the camera** (talent) | The people *in* the work | Model, Actor, Content Creator, Influencer, Dancer, Musician |

This is the "creative duality" that powers the match (#6). Muse deliberately surfaces the *opposite*
side first — a photographer looking for a model; a model looking for a photographer. Same-side collab
(photographer + photographer) is always available as the second option.

Beyond those two, there's a **third, richer player**: the **industry side** — casting directors,
producers, art buyers, agents, creative directors, and studios. They have real budgets and hire talent
at scale. The product already models this in `TIERS_BY_SIDE.industry` (Muse Studio tier).

**The person is:**
- A working or aspiring creative, ~18–35, urban (Los Angeles, New York, Chicago, San Francisco,
  Miami, Austin, Nashville, Denver, Seattle, Portland, Las Vegas).
- Active in the creator economy — already booking collabs in Facebook groups, subreddits, DM threads.
- Someone whose #1 pain isn't "I can't find people" (they can — it's a DM away) but **"I can't trust
  the people I find, and I can't get paid safely.**"

---

## 3. The problem Muse actually solves

The current market runs on **Facebook groups + DMs + Venmo**. That market is huge and proven, but broken:

- **No verification** — anyone can claim to be a pro; "models" and "photographers" lie about age.
- **No consent** — boundaries, usage rights, and content disclosure are verbal/implied.
- **No payment protection** — pay up front and get ghosted, or shoot first and never get paid.
- **No accountability** — scammers and flakes just make a new profile elsewhere.

Muse's answer isn't "more discovery." It's **the trust + transaction layer**: verified identity,
signed disclosure + consent, escrowed payment held until the shoot wraps, time-boxed safety check-ins,
trusted contacts, and two-way reviews that compound into a reputation.

---

## 4. The full journey, end to end (the real loop)

1. **Join + verify.** Make a profile; phone + face verification (Stripe Identity) before any *paid*
   booking. 18+ age gate.
2. **Discover + match.** Swipe/browse creatives near you. Muse's match score weighs shared styles,
   looking-for, the behind/behind-front duality, and "vibe" signals (zodiac, Chinese zodiac, MBTI,
   life path). Matches are mutual.
3. **Reach out (or get reached out to).** Cold outreach to someone you haven't matched goes through a
   **Message Request** inbox — accepted, declined, or blocked by the recipient. Real chats live in
   **Muses** (your matches).
4. **Agree on a shoot.** Either via a **Session listing** (a hosted, priced shoot: `$75/hr`, etc.) or a
   **Collab Brief** (a posted project — paid, TFP, open call, or concept — that creatives apply to).
5. **Book.** The client requests the session; the host confirms, declines, or reschedules.
6. **Pay through escrow.** Stripe **Connect** runs the money. On purchase, funds are *authorized*
   (held), not captured. Neither party can run with the money. (See `MUSE_MONEY.md`.)
7. **Confirm + get safe.** On confirmation, two **pre-shoot 24-hour safety check-ins** are created —
   one for each party. Each has a **disclosure/consent** form and a **trusted contact + location share**.
8. **Shoot.** Either at a **managed studio** (FD Photo Studio = physical safety net) or **on-location**
   (the digital safety stack). Studios confirm arrival — that check-in doubles as a trust sensor.
9. **Wrap up.** One party marks the shoot complete → Muse **captures** the held payment → the host is
   paid (minus commission) → the other party is prompted to **review**.
10. **Review + compound.** Both parties leave a rating + structured criteria (communication,
    reliability, creative quality, professionalism, safety). This feeds the reputation that drives
    future discovery and bookings.

---

## 5. What's actually built (feature map)

Everything below is real, working code (some of it seed/demo data, some live DB):

- **Discover** — swipeable cards, match %, map view (Mapbox), search, grid/list toggle.
- **Muses** — your matches + chat (icebreakers), message-request inbox (accept/decline/block).
- **Collab Briefs** — post paid/volunteer/concept/TFP projects, apply, dismiss.
- **Sessions & Bookings** — priced listings, book/respond/cancel/complete, escrow, reminders.
- **Portfolio** — albums, access levels (public/invite/private), shared Lightbox (swipe/zoom/share/download).
- **Moments / BTS** — 24-hour stories with auto-advance.
- **Communities & Events** — groups with rules/roles/bans/mutes/join-requests, events with RSVP.
- **Forum** — nested threaded discussions, votes, pin/lock, reports.
- **Network** — professionals + a marketplace of creatives.
- **Profile** — portfolios, prompts, personality "vibe" traits, verification, completion %, badges.
- **Analytics** — profile views, boost analytics, viewers, earnings, reviews.
- **Quests** — gamified onboarding/action incentives that award XP, "superpowers," Pro days.
- **Referrals** — earn Pro by referring friends; QR-tracked invite sources.
- **Safety** — disclosures, check-ins, trusted contacts, verification, moderation, strikes, reports.
- **Admin** — full moderation dashboard, audit log, content scanning, NSFW triage.

---

## 6. The matching model (how "getting discovered" works)

`calcMatch()` scores compatibility from 40 baseline + increments:
- **Shared styles** (up to +21)
- **Matching "looking-for"** (+15)
- **Being someone's exact sought type** (+8)
- **Complementary side** (behind + front = +6, +4 more if both are actively looking across the aisle)
- **Zodiac / Chinese zodiac / MBTI / life path** compatibility (+4–6 each)
- **Verified** (+3), **collabs > 50** (+2)

It's a blend of *professional* fit (styles, roles) and *vibe* fit (the personality layer). This is what
claude's critique flags as a tension (professional marketplace vs. personality-matching) — see
`MUSE_CLAUDE_CRITIQUE.md`. `calcMatch` runs both client-side (demo data) and server-side via
`calcMatchScore` powering the live `discover-ranked` endpoint (real DB rows). See
`MUSE_GAPS_ADJUSTMENTS.md` #2a.

---

## 7. The product in 3 themes

1. **Discovery.** Swipe/browse/search/map — surface the *opposite* side first.
2. **Transaction.** Session bookings + briefs → escrow → capture → payout → review. This is where the
   money is.
3. **Trust.** Age verification + consent/disclosure + check-ins + moderation + two-way reviews. This is
   the moat and the brand.

**The emotional core:** Creatives aren't looking to get more efficient — they're looking to **be seen**,
be made into art, be someone's muse. Gig platforms (Upwork/Fiverr) sell efficiency; Muse sells *being
seen*. That's why it can own a brand they can't, and why the safety + "muse" poetry together ARE the product.
