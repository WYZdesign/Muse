# Demo-Ready Release Evidence Gate — Wyzmind Execution Checklist

This is the single evidence checklist for deciding whether the demo is ready. Do not mark any item complete based only on code intent, compilation, or a visual spot-check. Keep demo mode enabled until every applicable row has current evidence.

| Gate | Required proof | Current state |
|---|---|---|
| Storage privacy | Private album object cannot be read with raw public URL; authorized owner/viewer gets short-lived signed URL; unauthorized user gets denial; tests + deployed configuration evidence. | Revalidate reported P0 fix |
| Media contract | Client picker, client validation, API validation, storage allowlist, and processing agree on images/video/audio including WebM; rejected MIME/content mismatch is denied. | Revalidate reported P0 fix |
| Recording consent | Egress/recording request is server-denied unless required consent/eligibility is current; direct API and retry/race tests pass. | Revalidate reported P0 fix |
| Call age gate | DB/read/error/timeout fails closed; underage/unverified user cannot create/join protected call. | Revalidate reported P0 fix |
| Account deletion | Product copy, API behavior, scheduled purge, recoverability, backups, and retention policy consistently honor the declared 30-day period. | Revalidate reported P0 fix |
| Auth abuse | Enumeration-safe responses, per-account/IP limits, OAuth state/secret handling, password/reset session protections, and abuse telemetry tested. | Revalidate earlier P1 work |
| Identity gate | Server-side authorization blocks gated actions; live verification/onboarding UI is a named modal with background inert/focus trap; demo deferral is explicit and safe. | **Open P0** — see `CHATGPT_VERIFICATION_GATE_AND_ONBOARDING_MODAL_P0_2026-09-22.md` |
| Discover state | Reactions are one-shot/idempotent; no premature next-card exposure; undo targets correct person; failure/reduced-motion paths work. | **Open P1** — see interaction bundle |
| Discover accessibility | One active card only; queued cards inert + non-hit-testable; carousel duplicates removed; all targets meet mobile size. | **Open P1** — see regression bundle |
| App shell | Exactly one main/nav, working skip target, inactive screens unmounted/inert, all overlays modalized correctly. | **Open P1** — see app-shell bundle |
| Mobile platform | Zoom enabled; safe area + virtual keyboard checked; 320/339/390/414 viewports have no clipping/overlap; reduced-motion checked. | **Open P1** |
| Privacy/indexing | Authenticated/personalized routes noindex; CSP/Permissions Policy reviewed; third-party client surfaces intentional; no private content in metadata or public cache. | **Open P1** |
| QA safety | Demo fixtures are isolated/resettable; test actions cannot notify/create data for real users; deterministic data supports all flows. | **Open P1** |
| Regression evidence | `npx tsc --noEmit`, full unit suite, lint, build, authenticated mobile E2E, and manual keyboard/screen-reader smoke result pasted with commit/deploy SHA. | Missing current evidence |

## Required Wyzmind handback format

For each completed row, append the commit SHA, deployed URL/environment, command output summary, exact test names, and a concise negative test result. For any incomplete row, state owner, remaining risk, and expected verification path. Never replace this evidence with an unsupported `all clear`.

## Demo decision

The release remains **demo-only / not demo-ready for sign-off** until this file has evidence for every row. This does not ask to disable demo mode; it makes the demo safety boundary and verification requirements explicit.

