# RLS Access Classification — 2026-10-03

Supabase currently reports 22 RLS-enabled tables without policies. That state is
**fail closed**, not automatically a defect. This classification prevents the
dangerous response of adding broad permissive policies merely to clear a linter.

| Table | Intended access | Decision |
|---|---|---|
| `schema_migrations` | migration runner only | Keep fail closed. |
| `muse_activity_log` | server trigger/service audit log | Keep fail closed. |
| `muse_boost_purchases` | Stripe/server writes; purchaser history may be exposed through a vetted server route | Keep fail closed until that route exists. |
| `muse_rate_limits` | server function only | Keep fail closed. |
| `muse_storage_cleanup_jobs` | cron/service worker only | Keep fail closed. |
| `muse_community_bans` | moderator/service writes; subject visibility must be deliberate | Keep fail closed. |
| `muse_community_mutes` | moderator/service writes | Keep fail closed. |
| `muse_refund_requests` | user creates/reads own request; admin resolves | **Policy candidate** after owner/booking relation is tested. |
| `muse_brief_applications` | applicant creates/reads own; brief author reads applicants | **Policy candidate** after brief-author relation is tested. |
| `muse_event_rsvps` | attendee creates/reads own; event host reads attendees | **Policy candidate** after event-host relation is tested. |
| `muse_feed_comments` | authenticated readers; author creates/updates/deletes own | **Policy candidate** after feed visibility rules are confirmed. |
| `muse_forum_comments` | community-visible readers; author writes own | **Policy candidate** after membership/private-forum rules are confirmed. |
| `muse_message_requests` | sender/recipient only | **Policy candidate** using `request_from`/`request_to` ownership. |
| `muse_moments` | author writes; audience visibility must mirror product rules | **Policy candidate**, requires moment audience contract. |
| `muse_photo_likes` | signed-in user writes/deletes own; aggregate reading must not expose private media | **Policy candidate** using `user_id` ownership. |
| `muse_reviews` | reviewer creates; reviewee/author visibility follows booking completion and moderation policy | **Policy candidate**, requires eligibility query. |
| `muse_saved_searches` | owner only | **Policy candidate** using `user_id` ownership. |
| `muse_calls` | caller/callee only; service records state | **Policy candidate** using caller/callee ownership. |
| `muse_call_recording_consents` | call participant creates/reads own consent | **Policy candidate** using `user_id` plus participant relation. |
| `muse_community_join_requests` | requester creates/reads own; moderator reads/decides | **Policy candidate** after moderator relation is confirmed. |
| `muse_album_likes` | signed-in user writes/deletes own; album access controls read | **Policy candidate** using `user_id` plus album visibility helper. |
| `muse_quests` | product config; client read may be required, mutation service/admin only | **Policy candidate** only if direct client reads are intentional. |

## Required proof before any RLS migration

1. Trace each candidate table’s client versus service access path.
2. Use the authenticated profile identity derived by the database, never a
   caller-supplied profile ID.
3. Test positive and negative access with two ordinary users plus a moderator
   where applicable.
4. Keep all service-only tables with no client policy.
5. Apply policies in a separate migration with rollback notes; do not mix them
   with function-hardening migration 0031.

This closes the *classification* part of the RLS sweep. It intentionally does
not claim policy implementation or linter clearance.
