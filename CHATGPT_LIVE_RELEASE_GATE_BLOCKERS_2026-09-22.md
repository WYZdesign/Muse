# Muse live release-gate blockers — verified 2026-09-22

This is the current **do-not-open-beta** list from authenticated live validation. A commit, local test, or source diff is not closure. Every item needs: reviewed implementation, TypeScript/full test/build evidence, deployed SHA, and targeted live revalidation.

## P0 — trust, privacy, safety

- **Demo relationship/transaction implication:** Book on a demo paid brief opens a chat claiming a reciprocal match. See `CHATGPT_LIVE_DEMO_BOOKING_MATCH_IMPLICATION_P0_2026-09-22.md`.
- **Deletion/retention promises are false:** Settings Help, deletion confirmation, and Privacy Policy promise deletion of all data, conflicting with required retention. See `CHATGPT_LIVE_DELETION_COPY_CONTRADICTION_P0_2026-09-22.md` and `CHATGPT_LIVE_PRIVACY_POLICY_TRUTHFULNESS_GAPS_2026-09-22.md`.
- **Identity gate language does not match enforcement:** Banner says verification is required to continue, but broad app access remains available. See `CHATGPT_LIVE_IDENTITY_GATE_ENFORCEMENT_MISMATCH_2026-09-22.md`.
- **Safety/report/legal modals leak focus:** report, safety center, menu, and legal overlays allow Tab into background/external controls. See `CHATGPT_LIVE_MENU_MODAL_FOCUS_ESCAPE_2026-09-22.md`.

## P1 — core interaction and accessibility

- Keyboard activation failures: Create Brief, brief Safety info, and Discover Why this match. See corresponding `CHATGPT_LIVE_*_KEYBOARD_REGRESSION_2026-09-22.md` files.
- Nested interactive controls: Feed headers and Network cards. See `CHATGPT_LIVE_FEED_NESTED_ACTIONS_VERIFICATION_2026-09-22.md` and `CHATGPT_LIVE_NETWORK_NESTED_INTERACTIVE_CARDS_2026-09-22.md`.
- Muses match cards are not semantic interactive controls. See `CHATGPT_LIVE_MUSES_MATCH_CARD_SEMANTICS_2026-09-22.md`.
- Chat/BTS/Discover composer and search fields lack labels/context or Escape cancellation. See `CHATGPT_LIVE_CHAT_COMPOSER_A11Y_2026-09-22.md`, `CHATGPT_LIVE_BTS_COMMENT_CONTEXT_2026-09-22.md`, and `CHATGPT_LIVE_DISCOVER_WHY_MATCH_KEYBOARD_REGRESSION_2026-09-22.md`.
- BTS reporting is long-press-only. See `CHATGPT_LIVE_BTS_REPORTING_KEYBOARD_GAP_2026-09-22.md`.
- Notification state starts stale/contradictory and notification rows are non-semantic/gesture-only. See `CHATGPT_LIVE_NOTIFICATION_COUNT_TRUTHFULNESS_2026-09-22.md` and `CHATGPT_LIVE_NOTIFICATION_ITEM_SEMANTICS_AND_SYNC_2026-09-22.md`.

## P1 — deployed metadata/mobile platform

- Live `/muse` remains indexable (`index, follow`), emits the wrong inherited canonical, and disables pinch zoom. Local corrections exist only in the working tree; see `CHATGPT_DIRECT_FIXES_2026-09-22.md`.

## P1 — counsel/operations

- Terms are generic/incomplete for active marketplace, recording, verification, and moderation surfaces; legal modal focus also leaks. See `CHATGPT_LIVE_TERMS_SURFACE_AND_MODAL_GAPS_2026-09-22.md`.

## Minimum next-deployment protocol

1. Wyzmind groups fixes by shared primitive: modal/focus, semantic cards, keyboard controls, disclosure/content, demo-state integrity, and metadata/mobile.
2. For every group, run TypeScript, full unit/integration suite, and production build; record results in the handoff/ledger.
3. Commit, push, deploy, record deployed SHA and time.
4. ChatGPT reruns the matched live keyboard/AX/metadata checks. A failure leaves the gate open.
5. Before invite beta, execute the two-account authorization/payment/safety matrix and complete legal/operations evidence—not only UI tests.
