# Media Input & Storage Contract Bundle — ChatGPT — 2026-09-22

## Live evidence

Mounted file controls currently expose:

- portfolio/BTS-style picker: `accept="image/*,video/*"`, `multiple=true`
- image picker: `accept="image/*"`

Both are hidden native inputs without programmatic labels; user-facing triggers must own their accessible names.

The broad client `video/*` family can offer formats that the hardened storage policy intentionally rejects. Client affordances, validation, and server allowlists must describe the same contract.

## Deliver as one end-to-end media bundle

1. Define a single typed media policy used by picker config, client validation, API validation, storage allowlist, transcoding, and user-facing copy.
2. Client picker should advertise only supported formats where platform support permits; never treat `accept` as security enforcement.
3. Before upload, validate type/signature where feasible, file size, item count, image dimensions, video duration/resolution, and WebM codec/container compatibility; show actionable errors.
4. Server/storage remains authoritative: verify bytes/signature/MIME, enforce per-type size/count/duration, quarantine/scan as applicable, strip unsafe metadata, and reject mismatch.
5. Use labelled visible upload triggers; hidden inputs must be associated with those triggers and announce accepted formats/multiple-selection behavior.
6. Recording controls must expose idle/requesting/recording/paused/uploading/error states accessibly; do not let unsupported capture output reach storage silently.
7. Add cleanup/idempotency for abandoned uploads and deterministic QA fixtures for unsupported/oversized/corrupt media.

## Acceptance matrix

- Image, JPEG/PNG/WebP/HEIC policy as intended; video MP4/WebM policy as intended; unsupported MOV/AVI/codec variants rejected clearly.
- Valid WebM voice/video capture succeeds end-to-end; invalid WebM/codecs fail before storage where possible and always at server.
- Multiple upload limits, mobile camera capture, cancellation, retry, slow network, and duplicate submit tested.
- Screen reader announces upload purpose, constraints, selection count, recording state, and error/retry action.
