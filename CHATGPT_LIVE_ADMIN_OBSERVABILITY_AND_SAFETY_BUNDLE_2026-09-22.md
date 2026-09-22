# Live Admin Observability and Safety Bundle — 2026-09-22

## Scope and evidence

Live, read-only audit of `https://muse.wyzdesign.com/muse/admin` and
`/muse/admin/moderation` on 2026-09-22. No scan, report review, warning,
account action, or other moderation mutation was invoked.

## Release blockers / high-priority findings

### ADMIN-P0-01 — Conflicting report counts can cause a safety report to be missed

The Admin Dashboard reports `REPORTS NEEDING REVIEW: 1` and `0 handled so
far`. Following the read-only **Moderation** link, Community Safety displays
`Reports (0)` and `No reports yet`.

This is not an empty-state copy issue: two primary operational surfaces assert
incompatible queue state for the same live system. A report can be invisible
to the people expected to handle it.

**Required remediation**

1. Define one server-authoritative report-status query/shared aggregate for
   dashboard and moderation queue counts.
2. Include explicit status buckets (`open`, `assigned`, `under_review`,
   `actioned`, `dismissed`) and an `updated_at` / refresh state in the UI.
3. Reconcile the currently outstanding record before launch; preserve its
   audit trail.
4. Add integration coverage that creates an open report and asserts matching
   count and record visibility in both surfaces.

**Acceptance**: an authorized moderator sees the same open-report count and
the same report record from the dashboard and the moderation queue after a
fresh load.

### ADMIN-P0-02 — Mobile watchdog freezes are live operational incidents

The dashboard’s 30-day activity summary shows `Error:Watchdog Prior Session
Hang` 12 times and `Error:Watchdog Recover` 11 times. The live activity feed
includes iPhone Safari hangs at approximately 26 seconds and 85 seconds, and a
Windows Chrome hang at approximately 129 seconds, all on `/muse`.

This corroborates the existing app-shell/mobile performance release gate with
production telemetry. It is not safe to dismiss as a single local-browser
artifact.

**Required remediation**

1. Trace each watchdog event to a release SHA, route, device class, and
   navigation/session sequence; preserve the raw event server-side.
2. Prioritize the existing lazy-mount/app-shell reduction work and confirm
   whether long tasks, hydration, network waterfalls, or background polling
   are responsible.
3. Add performance telemetry that records a bounded route/component signal
   rather than only an opaque `post_render_freeze_*` reason.
4. Set a launch SLO/alert and verify representative iPhone Safari plus Chrome
   journeys after the fix.

**Acceptance**: no reproducible post-render freeze in the release test matrix;
watchdog incidence is monitored and below the agreed launch threshold.

## High-priority privacy, reliability, and accessibility findings

### ADMIN-P1-03 — Activity feed exposes stable identifiers and raw user-agent strings

The visible Admin activity feed renders raw `Pid`, `Sid`, millisecond timestamp,
full browser user-agent, and raw error parameter JSON for each event. Examples
include the route and exact time of a session, mobile device/browser signature,
and event-specific error details.

Even on an admin route, this should be protected by least privilege and data
minimization. The page provides no visible role/scope indicator, retention
notice, or redaction boundary. It also makes debugging data difficult to scan.

**Required remediation**

1. Enforce server-side RBAC for every admin data endpoint and route; never
   rely on client-route concealment.
2. Default the operational feed to coarse timestamps, truncated/pseudonymized
   identifiers, normalized device class, and a safe error summary.
3. Gate raw event payloads behind a distinct incident-debug permission with
   access audit logging and defined retention.
4. Ensure analytics/admin telemetry policy truthfully describes this access.

### ADMIN-P1-04 — Observability error taxonomy is noisy and lacks actionable context

The dashboard ranks `Unhandled Rejection` (48), `Window Error` (24), multiple
`Fetch *` failures, `Upload Media Failed`, and watchdog events, but the summary
does not surface release, route/screen (`Screen: unknown` repeatedly),
environment, severity, grouping/fingerprint, or remediation status. Several
`Fetch *` records explicitly contain `AbortError: signal is aborted without
reason`, which may be expected navigation cancellation rather than an outage.

**Required remediation**

1. Normalize events using event ID, severity, route/screen, release SHA,
   fingerprint, count, first/last seen, and safe causal context.
2. Classify expected aborts separately from user-impacting fetch failures.
3. Make unknown screen instrumentation a test failure for navigable app
   screens.
4. Add read-only filtering/grouping and a documented alert threshold for
   launch blockers.

### ADMIN-P1-05 — Admin pages lack document landmarks and live-status semantics

Both audited pages expose a single H1 but no `main`, `nav`, `header`, `footer`,
or ARIA landmark, and no `[aria-live]`, `role=status`, or `role=alert` region.
The dashboard is a large undifferentiated text stream in the accessibility tree.
Async refreshes, report-count changes, and queue changes therefore have no
reliable announcement path for assistive technology.

**Required remediation**: reuse the pending application document-landmark and
status primitive on Admin: labeled navigation, one main landmark, meaningful
section headings, semantic metric/list/table structures, and a concise live
status message for refresh/error state (not every incoming activity row).

### ADMIN-P1-06 — Admin route still exposes incorrect public indexing metadata

Live `/muse/admin` returned:

- canonical: `https://www.wyzdesign.com/muse`
- robots: `index, follow`

This repeats the authenticated-app indexing defect on a particularly sensitive
operational surface. A local source correction was prepared in
`CHATGPT_DIRECT_FIXES_2026-09-22.md`, but it is not deployed.

**Required remediation**: deploy and verify `noindex, nofollow` on every
authenticated/admin route, suppress the public-site canonical there, and set
equivalent response headers where applicable. Confirm with a deployed HTTP and
rendered-DOM check.

## Additional UX notes

- `Review All Profiles` is an enabled primary control adjacent to routine
  navigation. Because it can initiate broad content processing, it must state
  scope/result, resist duplicate invocation, announce progress, and require
  confirmation if it changes review state or triggers non-trivial cost.
- Community Safety provides no displayed last-refresh time or empty-state
  explanation while the dashboard claims an outstanding report. Address this
  along with ADMIN-P0-01.

## Required wyzmind delivery protocol

1. Verify Admin route and endpoint RBAC with an unauthenticated and a
   non-admin account; include negative tests.
2. Reconcile the one live outstanding report before testing queue behavior.
3. Run TypeScript, focused admin/moderation tests, full relevant suite, and
   production build.
4. Commit, push, deploy, and provide deployed SHA/URL.
5. Ask ChatGPT to rerun this read-only live Admin verification; do not claim
   the release gate passed until the counts, metadata, semantics, and telemetry
   checks are observed live.
