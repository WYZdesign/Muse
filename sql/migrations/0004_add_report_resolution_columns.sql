-- 0004_add_report_resolution_columns.sql
-- muse_reports has been read/written with `status`, `target_type`, and
-- `ai_classification` columns from application code for a while (get.ts's
-- "my-reports", admin.ts's admin-reports, forum.ts's report-submit) — but no
-- schema file in sql/ (frozen) or sql/migrations/ ever actually added
-- `status` (target_type and ai_classification were added piecemeal in the
-- legacy MUSE_DASHBOARD_FIX_20260806.sql / MUSE_PASTE_ALL.sql files; status
-- was missed by both). Without it, every report is stuck showing whatever
-- Postgres returns for a selected-but-nonexistent/never-set column, and
-- there is no way to ever resolve/dismiss a report — it just accumulates
-- forever with no closing action. Idempotent: safe to re-run.

ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
COMMENT ON COLUMN muse_reports.status IS 'open | actioned | dismissed. Set by admin-resolve-report; reporter sees this via the my-reports endpoint.';

ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT NOT NULL DEFAULT '';
COMMENT ON COLUMN muse_reports.resolution_note IS 'Optional short admin note shown back to the reporter alongside the resolved status.';

-- Defensive re-add of the two columns the legacy files added inconsistently
-- across different MUSE_*.sql copies — harmless no-op if already present.
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'user';
ALTER TABLE muse_reports ADD COLUMN IF NOT EXISTS ai_classification TEXT DEFAULT '';
