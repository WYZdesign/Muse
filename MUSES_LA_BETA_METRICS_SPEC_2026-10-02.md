# Muses by WYZ — LA Beta Metrics Specification

**Status:** operating specification; no product-code change in this document  
**Launch sequence:** Los Angeles first, then Chicago, then New York  
**Principle:** measure completed, safe creative work—not vanity registrations.

## What already exists

The application already owns a first-party event pipeline in
`src/app/(muse)/muse/lib/analytics.ts`. It sends bounded, fire-and-forget
events to `muse_events_log` through `/api/muse` and includes screen, opaque
profile ID, browser-session ID, and client timestamp. It covers signup and
onboarding, discovery, messages, bookings, reviews, subscriptions, safety,
and error events. The app also has user and admin analytics views, landing
waitlist counts, and privacy language that rules out third-party advertising
cookies.

Keep that foundation. Do not add a paid analytics vendor for the LA beta.
Do not send names, email addresses, exact locations, message bodies, ID
documents, or raw IP addresses as event properties.

## Shared definitions

| Term | Definition |
| --- | --- |
| Invited | A person issued a controlled beta invitation. |
| Verified activated user | An invited person who completes account setup, completes the required verification for the activity they seek, has a usable profile, and performs one meaningful action within seven days. |
| Active creative | A verified activated user who has a meaningful action in the trailing 28 days: discovery action, message, session application, booking action, post, or check-in. |
| Qualified introduction | A mutual match or accepted brief/application where both profiles meet the stated role, location, and safety requirements. |
| Completed collaboration | A confirmed booking marked completed, or an explicitly recorded non-paid TFP collaboration with both participants confirming completion. Keep these two categories separate. |
| Repeat collaboration | A completed collaboration followed by another completed collaboration involving the same user within 60 days. |
| Safety case | A report, block tied to an interaction, failed check-in, payment dispute with a safety element, or escalation to human review. |

## LA launch scorecard

Review weekly with a fixed cohort-date cutoff. Segment every metric by role,
neighborhood/zone rather than precise location, paid versus TFP, invitation
source, device class, and verification state. Suppress a segment smaller than
five people in shared reporting.

| Area | Leading measure | Outcome measure | Decision use |
| --- | --- | --- |
| Supply health | verified activated users by role and zone | percentage of active creatives receiving a qualified introduction in 14 days | Pause acquisition in an oversupplied segment; recruit the missing side. |
| Onboarding | invite accepted → profile usable → verified activated | median hours from invite to verified activation | Fix the step with the largest controlled-cohort drop-off. |
| Matching | discovery views, mutual matches, accepted briefs | qualified introductions per active creative | Do not expand a city where users cannot reach relevant people. |
| Conversation | introduction → first reply within 24 hours | introduction → session application or booking | Investigate role, expectation, or availability mismatches. |
| Collaboration | session application / booking request / confirmation | completed paid bookings and completed TFP collaborations | This is the primary marketplace truth. |
| Retention | week-1 and week-4 active creatives | repeat collaboration within 60 days | Expand only when a useful loop repeats. |
| Trust and safety | reports, blocks, missed check-ins, disputes per 100 active users | acknowledgment and human-resolution time; repeat-offender rate | Any serious case triggers review before growth decisions. |
| Payments | payment authorization and capture success | payout and dispute outcomes | Never count GMV or a booking as complete before capture succeeds. |
| Reliability | client-error events, failed API actions, support contacts | successful critical-flow completion by device | Block broad release for a critical-flow regression. |

## Graduation gates

These gates make the requested 100 → 500 → 1K path concrete. They are
go/no-go checks, not targets to manipulate.

### First 100 — private LA cohort

- 100 verified activated users, with intentional coverage across the
  initially supported roles and LA zones.
- At least 20 confirmed TFP collaborations and 5 completed paid bookings,
  each categorized distinctly.
- Every report, missed safety check-in, payment failure, and support request
  acknowledged by a named human; every serious case receives a documented
  resolution.
- A weekly coordinator review confirms the available supply is sufficient for
  the next invite batch. If not, recruit supply before invitations.
- No unresolved critical defect in signup, verification, reporting/blocking,
  booking, payment authorization/capture, or account recovery.

### First 500 — controlled LA public cohorts

- Maintain the first-100 safety and reliability conditions for four
  consecutive weekly cohorts.
- Demonstrate qualified introductions and completed collaborations in each
  intentionally opened role/zone segment; do not rely on one concentrated
  group to hide empty segments.
- At least two reliable local supply partners or anchors with a documented
  consent-based referral path.
- Publish a lightweight weekly operating report: activation, qualified
  introductions, completions, repeat activity, safety workload, payment
  failures, top customer friction, and the next experiment.

### First 1,000 — LA repeatability

- Sustain weekly active-creative, completion, safety, and support service
  levels through a representative six-week period, including a slower week.
- Show repeat collaboration and retention by cohort, not merely cumulative
  registrations.
- Have staffed escalation ownership for safety, payment disputes, and account
  recovery; document coverage hours and handoff rules.
- Exercise backup/restore, an incident communication path, and a production
  rollback in a safe rehearsal.
- Only then decide whether Chicago begins a constrained founding cohort.

### Chicago and New York

Open Chicago only after LA's 1,000-user gate is met. Use a separate city
cohort and scorecard; never combine cities to manufacture liquidity. Open New
York after Chicago has the same evidence of qualified introductions, safe
completion, and repeat activity. Each city needs local moderation/on-call
coverage and named anchors before public acquisition.

## Event contract additions to consider later

The existing module already records most client behavior. Before adding
events, confirm they are necessary and use stable names. The following are
the only high-value gaps for the launch scorecard:

| Proposed event | When | Minimal properties |
| --- | --- | --- |
| `invite_accepted` | controlled beta invite redeemed | `cohort`, `city`, `source` |
| `profile_usable` | profile reaches launch-defined minimum | `role`, `city_zone` |
| `qualified_intro` | match/application meets eligibility rule | `intro_type`, `role_pair`, `city_zone` |
| `tfp_collaboration_confirmed` | both parties confirm a non-paid collaboration | `collaboration_id`, `role_pair`, `city_zone` |
| `safety_case_acknowledged` | assigned human acknowledges | `case_type`, `severity`, `elapsed_minutes` |
| `safety_case_resolved` | case closed with outcome recorded | `case_type`, `outcome`, `elapsed_minutes` |
| `support_case_created` | support issue enters a queue | `category`, `critical_flow` |

Do not implement these until their storage, retention, RLS, and reporting
queries are reviewed alongside the Supabase security triage. Use opaque IDs;
no free-text reasons or customer content in analytics properties.

## Operating cadence and ownership

| Cadence | Owner | Required output |
| --- | --- | --- |
| Daily during private beta | LA launch lead | New safety/payment/reliability cases, owner, next action. |
| Weekly | Product + community + safety owners | Cohort scorecard, friction findings, invitation decision, experiment result. |
| Monthly | Founder + technical owner | City gate decision, privacy/retention review, incident and recovery review. |

The person deciding invitation volume must see the safety and supply picture,
not only growth counts. A city pause is a valid outcome whenever the loop is
unsafe, unbalanced, or unreliably producing collaborations.

## 100M discipline

At 10K, retain city cohorts and build durable operational dashboards from the
same definitions. At 100K, add formal data ownership, retention enforcement,
privacy review, capacity/load monitoring, and standardized incident response.
At 1M and beyond, plan regional data, high-availability, dedicated trust and
safety, and reliability functions only when measured demand requires them.
The current LA work should prove a dense, safe, repeatable local loop before
spending effort on global-scale infrastructure.
