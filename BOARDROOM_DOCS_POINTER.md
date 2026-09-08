# BOARDROOM DOCS — POINTER FOR CLAUDE

> Claude — you asked where the "boardroom" topic docs went. They're at the repo root as the
> `MUSE_*.md` files (committed to `main` in `d8ae0c2`, all pushed + live). Read these for the
> **strategy / product / business** layer. This is the "conference boardroom" pack — not engineering.

## The 7 docs (read in this order)
| File | What it is |
|------|------------|
| `MUSE_OVERVIEW.md` | What Muse is, who it's for, the full end-to-end journey, feature map, matching model. **Start here.** |
| `MUSE_MONEY.md` | How creatives make money + how Muse makes money (15% blended take + Pro/Studio subs) + the exact book→checkout→escrow→complete→review flow. |
| `MUSE_SAFETY_TRANSPARENCY.md` | The trust layer: verification, disclosure/consent, escrow, check-ins, reviews; the **"process not outcome"** promise. |
| `MUSE_DEMOGRAPHICS_DEMAND.md` | Behind/front/industry buyers, audience shape, market validation, demand ladder. |
| `MUSE_GAPS_ADJUSTMENTS.md` | **The actionable working list** — what's missing for booking / making money / getting discovered. Each item tagged ✅ SHIPPED / ⚠️ OP step / BLOCKED. |
| `MUSE_PITCH_EXPLAIN.md` | One-liners + full pitches for creatives, buyers, studios, investors, boardroom + always-say/never-say. |
| `MUSE_CLAUDE_CRITIQUE.md` | The outside/critique perspective + honest verdict ("works, not platinum"). |

## Older/non-boardroom docs (don't conflate)
- `STRATEGY.md` — the original strategic positioning + moat + expansion layer (read this too, recent).
- `HANDOVER.md` — technical remaining-work backlog (NOT the boardroom layer).
- `CLAUDE_HANDOFF.md` / `COMPLIANCE_HANDOFF.md` — infra/readiness/compliance audits.

## The 3 things that matter most (from the whole pack)
1. **Revenue:** 15% blended take on every paid booking (7% host + 8% buyer, via Stripe Connect escrow) + Pro/Studio subscriptions.
2. **Top money gap (now FIXED):** Studio tier ($29.99/mo) wasn't purchasable — webhook `KNOWN_TIERS` was missing `muse_studio`. Fixed in `ad40d8d`.
3. **Top market gap (now FIXED):** discovery ran on demo data — now `discover-ranked` + `boost-status` + `creative-trust` give live-ranked discovery with boosted/trust signals (`c47082d`).

## The blunt verdict (don't water it down)
Muse is **"works, not platinum."** Strong wedge (trust/transaction layer for shoots) + real supply
advantage (FD Studio + Mixers). Biggest strategic risk: the zodiac/MBTI/vibe match can read as
dating-app energy — keep vibe secondary, rank primarily on professional fit.
