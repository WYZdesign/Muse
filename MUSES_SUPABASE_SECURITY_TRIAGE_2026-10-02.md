# Muses by WYZ — Supabase Security Triage

**Scope:** reconcile the Supabase Security Advisor findings observed on 2026-10-02 with the repository’s actual call paths. This is a review packet, not an approval to mutate production.

## Findings that can be safely planned

| Advisor finding | Repository evidence | Proposed disposition | Required proof before production |
|---|---|---|---|
| `atomic_like_count` public `SECURITY DEFINER` RPC | It is called only by `src/lib/muse-actions/feed.ts`; the API dispatcher constructs `ActionContext.sb` with `getServiceClient()`, so the action runs server-side. | Revoke direct `PUBLIC`, `anon`, and `authenticated` execution; retain `service_role`. Pin `search_path` and preserve its two-table allowlist. | API tests for feed/moment likes and direct anon/auth RPC denial. |
| `claim_founding_status` public `SECURITY DEFINER` RPC | The function is used by `auto_claim_founding_trigger`; no client call path was found. Existing SQL grants authenticated/service role but does not explicitly revoke `PUBLIC`. | Revoke `PUBLIC`/`anon`/`authenticated`; grant only `service_role` if direct administration still needs it. Pin `search_path`. | Profile-creation/founding-tier trigger test and direct RPC denial. |
| `auto_claim_founding_trigger` direct RPC | It is a trigger function, not a product API. | Revoke `PUBLIC`, `anon`, and `authenticated`; trigger invocation remains unaffected. Pin `search_path`. | Insert-profile trigger test plus direct RPC denial. |
| `log_muse_activity` direct RPC | It is a trigger function in the legacy schema. | Revoke direct public execution and pin `search_path`; retain the trigger behavior. | Trigger/audit-log regression test plus direct RPC denial. |
| `rls_auto_enable` direct RPC | It is administrative/schema infrastructure, never a product endpoint. | Revoke direct public execution; move or restrict administrative usage to `service_role`. Pin `search_path`. | Migration/admin maintenance test and direct RPC denial. |
| `report_to_ncmec` mutable `search_path` | It updates incident state and must never be a broad public operation. | Pin `search_path`; restrict execution to the service role or the dedicated trusted caller. | NCMEC/manual-fallback route test and authorization denial tests. |
| `check_rate` mutable `search_path` | Existing catch-up SQL already revokes anon/auth and grants service role. | Keep privilege model; add pinned `search_path` and ensure the migration is represented in the canonical migration chain. | Rate-limit regression tests. |

## Intentional RLS helpers: do not revoke blindly

`muse_current_profile_id`, `muse_owns_album`, and `muse_can_view_album` are deliberately callable by `anon`/`authenticated` because PostgreSQL RLS policies use them. Migration `0028_fix_album_rls_recursion.sql` already defines them as `SECURITY DEFINER STABLE SET search_path = public`.

Their Advisor warnings are therefore an **accepted, documented exception** only if the following tests pass:

1. Anonymous callers can see only public albums/media.
2. Authenticated non-matches cannot see invite-only albums/media.
3. Mutual matches can see allowed invite-only albums/media.
4. Owners can manage their own albums/media.
5. Blocked users cannot bypass visibility.
6. Private, deleted, and expired signed URLs remain inaccessible.

## RLS-enabled tables without policies

The 22 Advisor findings must be classified individually before policy creation. Many are expected to be server-only tables accessed via `getServiceClient()`. For each table, record one of:

- **Server-only:** leave RLS enabled with no client policy; prove anon/auth queries are denied.
- **User-readable:** add narrowly scoped `SELECT` policy and test ownership/match/role boundaries.
- **User-writable:** add explicit `INSERT`/`UPDATE`/`DELETE` policies with `WITH CHECK` and test cross-account denial.

Never add permissive blanket policies simply to clear an advisor warning.

## Migration procedure

1. Add a single idempotent, numbered migration after the current `0030_add_birthdate.sql` migration.
2. Use `ALTER FUNCTION ... SET search_path = public` only after verifying every referenced object is schema-qualified or intentionally public.
3. Revoke `PUBLIC` first, then `anon` and `authenticated` as appropriate; grant only the minimum role required.
4. Add route/RPC denial tests before applying any production change.
5. Apply on a non-production environment or disposable database first; verify the function list and every transaction path.
6. Apply production only with a rollback/restore plan and record the exact migration result in `DELIVERY_STATUS.md`.

## Separate Supabase dashboard action

Enable **leaked password protection** in Supabase Auth. This is a dashboard/configuration setting, not a SQL migration; record the date, environment, and post-change registration/reset test.

## Current status

No production schema, function, policy, or Auth setting was changed by this review. The next implementation work must be isolated from active wyzmind code changes and reviewed against the test matrix above.
