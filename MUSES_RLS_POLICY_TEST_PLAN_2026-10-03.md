# RLS Policy Test Plan — 2026-10-03

## Evidence collected

- Production `pg_policies` has **no policies** for the 14 user-facing candidate
  tables in the companion classification.
- Current access logic is concentrated in these server modules:
  `src/lib/muse-actions/{feed,messaging,communities,sessions,quests,albums,get}.ts`
  and `src/app/api/muse/call/route.ts`.
- Therefore policy rollout must be introduced as an explicit product decision;
  it is not a safe linter-only cleanup.

## Migration slices and test matrix

| Slice | Tables | Required policy shape | Minimum two-user test |
|---|---|---|---|
| Ownership-only | `muse_saved_searches`, `muse_photo_likes` | `auth.uid()` → current profile ID equals `user_id`; select/write/delete own | A can CRUD own; B cannot read, update, or delete A’s row. |
| Bilateral | `muse_message_requests`, `muse_calls`, `muse_call_recording_consents` | current profile is sender/recipient or caller/callee; consent also requires call participation | Each participant can read; third user cannot; neither can forge the other participant ID. |
| Author plus audience | `muse_feed_comments`, `muse_forum_comments`, `muse_moments`, `muse_reviews` | author owns mutation; reads derive from parent visibility/membership/booking policy | Author writes own; allowed viewer reads; blocked user and unrelated user cannot read private content. |
| Requester plus moderator | `muse_brief_applications`, `muse_event_rsvps`, `muse_community_join_requests` | requester owns create/read; brief/event/community owner gets read and controlled decision rights | Requester creates; owner sees/reviews; third user cannot enumerate or approve. |
| Album-scoped | `muse_album_likes` | owner writes own like; reads use existing album visibility helper | Viewer with album access sees permitted aggregate; no-access user cannot query/like private album. |
| Product configuration | `muse_quests` | authenticated/public select only if the UI requires it; all writes service/admin | Ordinary user reads only approved active fields; user cannot create/update/delete. |
| Financial workflow | `muse_refund_requests`, `muse_boost_purchases` | purchaser/requester reads own, submits only permitted fields; admin/service resolves | User sees own records; cannot modify amount/status; other user sees nothing. |

## Implementation guardrails

1. Add one migration slice at a time and include `DROP POLICY IF EXISTS` only
   when replacing a policy introduced by this project.
2. Do not grant table privileges or use `USING (true)` to silence the advisor.
3. Resolve user identity through a hardened helper tied to `auth.uid()`; do not
   trust a body/profile ID.
4. Keep the five service-only tables policy-free.
5. Add database-level policy tests or an isolated integration suite before
   applying each slice to production.
6. Re-run the Supabase security advisor afterward. A remaining
   `rls_enabled_no_policy` notice is acceptable only for the documented
   service-only tables.
