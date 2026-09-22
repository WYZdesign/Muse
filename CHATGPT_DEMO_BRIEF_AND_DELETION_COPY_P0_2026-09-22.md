# P0: demo brief safety and deletion-copy alignment — 2026-09-22

## Local changes ready for review

### Demo Collab briefs

`src/app/(muse)/muse/screens/CollabScreen.tsx`

- Every Collab brief is visibly marked `DEMO PREVIEW` while demo mode is on.
- Demo mode hides applicant/interest counts so seeded inventory cannot imply
  real marketplace liquidity.
- Demo Respond and Book no longer open a recipient chat; their message makes
  clear that no message, booking, payment, match, or notification was created.
- Demo Apply and saved-brief actions remain local state only and skip server
  writes. The Apply confirmation says no creator was notified.
- Demo Discovery no longer randomly creates a mutual match, incoming like, or
  recipient notification. It records only an explicit local interest preview.
- Demo chats identify themselves as previews and disable text, quick-reply,
  image, voice, video, send, and LiveKit call actions so no recipient is
  contacted.
- Non-demo behavior is unchanged.

### Account-deletion wording

- `SettingsScreen.tsx`: Help and Settings wording now accurately says account
  access and associated content are removed, with narrow legal/safety/fraud/
  dispute/recordkeeping retention disclosed and the Privacy Policy referenced.
- `page.tsx`: The final delete confirmation uses the same approved wording;
  it no longer promises that all data is deleted or that every retained record
  is later purged.

## Local validation

- TypeScript syntax transpilation passed for `CollabScreen.tsx`,
  `SettingsScreen.tsx`, and `page.tsx`.

## Release checks

1. In demo mode, verify Respond/Apply/Book never creates a chat, message,
   booking, payment, match, notification, or analytics record.
2. In non-demo staging, verify the real two-account request and acceptance
   lifecycle remains unchanged.
3. Search all user-visible deletion copy and obtain counsel/release-owner
   approval before real-user beta.
4. Run elevated build and full tests before commit/deploy.
