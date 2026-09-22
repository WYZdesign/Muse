# Live Muse Assistant Accessibility and Safety Bundle — 2026-09-22

## Evidence

Settings → **Help Guide** opens a live support/chat surface with:

- heading-like text **Muse Assistant** and status text `Online · here to help`;
- shortcut buttons for matching, identity verification, bookings, safety, and
  Muse Pro;
- an editable message field whose only hint is placeholder `Ask me anything...`;
- a disabled **Send** button and **Close** button.

Rendered DOM inspection found no native dialog/`role="dialog"`, no
`aria-modal`, no background `inert`, no programmatic label/ID/name for the
message input, and no visible live/status/log region. No prompt was entered or
sent during this audit.

## P1 — Assistive-technology and modal defects

The support assistant is a context-switching overlay but is semantically an
unlabeled generic surface. Screen-reader users do not receive a durable label
for the input or announcements when responses/availability change. It must use
the shared, focus-contained modal/drawer primitive and semantic chat pattern:

1. `role="dialog"`/`aria-modal="true"` with a programmatic name, focus trap,
   inert background, Escape/Close, and invoker focus restoration.
2. An explicit label for the prompt input, not placeholder-only text.
3. A labelled conversation container using `role="log"` or a carefully scoped
   live region that announces new assistant responses without rereading the
   complete transcript.
4. Clear disabled-send and validation semantics.

## P1 — Assistant identity and sensitive-data boundary need explicit product policy

The welcome message calls the surface a creative “wingmate” and asks what it
can help with, including identity-verification and booking topics. The live UI
does not visibly state whether this is automated/AI assistance, whether a human
may review messages, what data should not be entered, retention/use boundaries,
or how to reach a human support path for urgent safety, payment, legal, or
account-recovery issues.

Before open beta, product/privacy/safety owners must approve and deploy:

- a truthful “AI assistant”/automation disclosure where applicable;
- a concise sensitive-data warning (never solicit passwords, verification
  documents, payment card data, or emergency information);
- a link to the applicable privacy/support policy and a human escalation route;
- server-side prompt/response logging, retention, redaction, abuse-reporting,
  and moderation controls consistent with the published policy;
- tested refusal/escalation behavior for self-harm, imminent safety, payments,
  legal/DMCA, and identity-account access requests.

## Acceptance

Keyboard/screen-reader tests prove that the assistant is correctly labelled,
contained, dismissible, and announced. Product owners provide evidence that
identity, payment, safety, and privacy advice is truthful, bounded, and safely
escalated; no launch claim should rely on generic chat copy alone.
