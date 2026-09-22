# P0: live account-deletion copy contradicts the stated retention policy — 2026-09-22

## Deployed verification

Authenticated Settings was checked live at `https://muse.wyzdesign.com/muse`.

Under **Help & Support**, the visible answer to **“How do I delete my account?”** says:

> “This permanently removes all your data.”

That contradicts the implemented legal/privacy position previously adopted for immediate removal of account access and associated content while retaining only narrowly required legal, fraud, safety, dispute, and recordkeeping evidence.

The live delete-confirmation modal repeats the problem more specifically:

> “All your data, matches, messages, and portfolio will be permanently deleted.”

This is the highest-risk wording because it appears immediately before the irreversible user action.

## Required remediation

Replace the in-app answer and any matching confirmation/support/export copy with the approved retention wording. State immediate account-access/content removal precisely, link to the Privacy Policy for retained-record categories, and do not claim deletion of records that policy or law requires to be retained. Confirm the delete-flow confirmation screen uses the same wording.

## Acceptance evidence

1. Repository search finds no unconditional `all your data`/`all data` deletion promise except where legally true and scoped.
2. Settings Help, delete confirmation, Privacy Policy, Terms, support emails, export responses, and API errors use consistent language.
3. Test covers the displayed deletion disclosure and preserves the existing deletion/retention behavior.
4. Counsel/release owner signs off on the final wording before real-user beta.
