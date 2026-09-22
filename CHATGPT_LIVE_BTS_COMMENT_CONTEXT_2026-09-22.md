# Live BTS comment context and label gap — 2026-09-22

## Deployed verification

On the authenticated BTS screen, activating `Comment` for Maya Chen’s moment opens a text field and a disabled `Send comment` button. The text field has no accessible name, and the active UI exposes no programmatic context naming the moment/author being replied to.

## Required remediation

Use an associated visible or programmatic label such as `Comment on Maya Chen’s moment`. Keep the composer in a labelled contextual container or dialog, and label the send action `Send comment on Maya Chen’s moment` when the surrounding relationship cannot be reliably inferred.

Escape was also sent directly to the focused comment field and did not dismiss the composer. Provide a visible Cancel control and keyboard Escape dismissal; both should restore focus to the originating Comment action without discarding text silently unless that consequence is disclosed.

## Acceptance evidence

1. AX snapshot names the comment field and target moment/creator.
2. Keyboard opens, types, cancels, and sends through the same flow as pointer input; focus returns to the originating Comment action on cancel.
3. The action stays disabled until valid content exists and announces validation/error/success once.
