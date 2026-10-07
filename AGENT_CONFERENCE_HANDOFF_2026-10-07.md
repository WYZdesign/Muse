# Agent conference handoff — 2026-10-07

## Ground truth
- Current audited main: `c8eff225e31c13d9b1ee81846e7991a9910ffc05`.
- Production main deployment reported green at that SHA.
- Live browser audit saw polished primary screens but repeated expected server demo-mode 409s and a social status 401 during ordinary navigation.
- This document coordinates work; it does not claim a fix is deployed.

## Shared rule
Before editing: fetch main, read `DELIVERY_STATUS.md`, inspect open PRs, and avoid concurrent changes to the same source area. Each contribution must name its tested deployed SHA and whether it changes demo behavior, beta behavior, or production behavior.

## Codex / database & operations
1. Keep PR #11 staged; merge/apply only through the verified migration workflow.
2. Verify Supabase leaked-password setting under issue #12.
3. Re-run security advisors after migration application.
4. Do not use direct production DDL as part of UI audit work.

## Claude Code / application refactors
Continue the assigned task packet: screen splits, API validation completion, handler tests, route tests, a11y target-size and performance cleanup. Preserve:
- `page.tsx` budget and extracted hook boundaries.
- All server validation guards.
- Existing demo-mode external mutation protections.

## Wyzmind / release owner
1. Diagnose failed Vercel previews (issue #5). Main is green; previews are not reliable evidence.
2. Make demo-mode UI behavior intentional: expected blocked actions must be disabled, labelled, or mapped to a clear founding-beta explanation before waitlist promotion.
3. After any changes: run typecheck, tests, build, deploy, then verify deployed SHA and update delivery ledger.

## Visual-audit owner
Run a complete live matrix:
- widths: 320, 375, 390, 452, 768, 1024, 1440;
- screens: auth, Discover, Feed, Collab, Muses, BTS, Menu, Sessions, Network, Community, Chat, Profile, Settings, subscription, search;
- states: tutorial, modal, empty, loading, error, disabled, permission denied, keyboard, zoom, reduced motion.
For each failure record screenshot, route, exact action, expected result, actual result, severity, and backend request/response.

## Product/founder owner
Begin waitlist work only with an explicit founding-LA promise, small invite waves, a support/moderation owner, and a tracked funnel. Do not market unavailable paid/booking/matching outcomes as live capability while demo mode blocks them.

## Conference decisions requested
1. Is production remaining intentionally demo-only for the first waitlist phase? If yes, define UI copy and remove console-noise calls.
2. What exact condition flips `MUSE_DEMO_MODE` off for invite wave one?
3. Who owns each external operation: support, moderation, invite approval, incident escalation, and payment/refund response?
4. What is the single success metric for the first 25 invited creators?
