# Live Terms surface and modal gaps — 2026-09-22

## Deployed verification

Authenticated Settings → Terms of Service opens a terms modal. One Tab press from the opened modal moved focus to the background Privacy Policy control, confirming that legal modals are also not focus-contained.

The visible terms are a short generic ten-section document. They do not visibly address key launched product surfaces such as marketplace bookings/payments/refunds, creator/booking disputes, verification/identity, recording/voice/video consent, moderation/reporting/appeals, platform role in transactions, or applicable content/licensing boundaries. Section 10 says **“at any material time”**, which appears to be a wording error.

## Required remediation

1. Route Terms through the shared focus-managed modal/page primitive; Tab/Shift+Tab/Escape/Close must not reach background settings.
2. Correct the wording error and replace generic legal copy with counsel-reviewed terms accurately describing the actual product and operations.
3. Cross-check Terms, Privacy, Community Guidelines, DMCA, safety/check-in guidance, payment/refund disclosures, identity verification claims, and deletion/export disclosures for consistency.
4. Version legal documents, display effective dates, retain acceptance records where appropriate, and give material-change notice consistent with the final policy.

## Acceptance evidence

1. Counsel-approved legal matrix maps each active product feature to a current disclosure/policy.
2. Keyboard/modal test proves focus containment and restoration.
3. Content review finds no placeholder/generic claim that contradicts live behavior.
4. Production URLs, metadata, and links resolve to the approved versions.
