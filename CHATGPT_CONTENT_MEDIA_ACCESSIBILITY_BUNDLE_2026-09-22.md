# Content Media Accessibility Bundle — 2026-09-22

## Live Feed evidence

On the current deployed mobile Feed:

- Creator avatars are usefully named (for example, `Riley Patel's avatar`).
- Two content images are exposed only as `Post image` despite representing distinct creator work, each approximately 419–428 px wide.
- The composer/avatar image has alt `T`, which is not meaningful to a nonvisual user.
- No visible video was mounted in the current filter state; video accessibility must still be enforced as a content contract rather than inferred from this screen.

## Required content contract

1. **User-authored image description.** Make a description/alt field part of post creation and edit. Require it for informative media, permit deliberately empty alt only for user-marked decorative media, and provide a suggested draft without pretending generated text is guaranteed accurate.
2. **Feed rendering.** For an informative image, expose creator-provided description (not generic `Post image`); for a linked post card, avoid repeating identical title/alt/name information. Use meaningful profile image labels only when avatar opens a profile; otherwise treat avatar as decorative beside already-present author text.
3. **Composer identity.** Replace `T` with an intent-bearing name such as `Your profile photo` or mark it decorative if the adjacent UI already identifies the current user.
4. **Video/audio.** Require captions/subtitles for speech-focused video, accessible media controls, transcript/caption upload/edit paths, poster-image alt policy, and a text alternative for voice notes where practical. Enforce server-side media processing/validation along with the existing MIME-policy bundle.
5. **Privacy.** Warn creators that descriptions/transcripts can contain personal data; honor edit/delete/retention controls and never use private media metadata in public previews without authorization.

## Acceptance checks

- Screen-reader Feed distinguishes the two currently generic media posts without relying on visual context.
- Composer permits meaningful alt authoring and renders `alt=""` only for explicit decorative selection.
- Keyboard user can operate media, toggle captions where present, and access a transcript.
- Tests cover missing description, decorative image, failed media processing, post edit, and authorized/private-media visibility.

