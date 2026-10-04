# Video Moderation Enablement Gate — 2026-10-03

## Current safe behavior

`/api/muse/upload` rejects video with `VIDEO_UPLOAD_UNAVAILABLE`. This is the
correct beta default. The app may still model video references in feed and
message data, so uploads must remain disabled until this gate is met.

## Required before enabling video upload

1. **Quarantine:** upload only to a private, non-deliverable location; no public
   URL is returned before the decision is final.
2. **Validation:** server-enforced MIME allowlist, magic-byte check, duration,
   file-size, resolution, codec, and rate limits.
3. **Scanning:** durable malware and sexual-exploitation/CSAM escalation path,
   with explicit provider failure handling that fails closed.
4. **Human review:** moderator queue with provenance, reason codes, assigned
   reviewer, decision timestamps, and least-privilege access.
5. **User process:** pending/rejected copy, appeal path, account consequence
   rules, and a way to report delivered media.
6. **Retention:** deletion and legal-hold rules for originals, derivatives,
   scan logs, and incident records.
7. **Publication:** only approved media moves to the application-visible bucket;
   signed/authorized delivery follows the content audience rule.
8. **Testing:** clean clip, forbidden file, scanner timeout, scanner rejection,
   moderator rejection, appeal, deletion, and unauthorized-fetch tests.
9. **Operations:** on-call owner, escalation contacts, backlog SLA, and an
   audited manual kill switch that restores `VIDEO_UPLOAD_UNAVAILABLE`.

## Closed-beta policy

Do not advertise or permit video uploads in LA, Chicago, or New York cohorts
until all nine conditions have evidence. Voice and image features require their
own documented safety checks; their existence does not prove video readiness.
