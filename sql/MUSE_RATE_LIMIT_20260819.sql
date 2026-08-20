-- ─────────────────────────────────────────────────────────────
-- Muse durable rate limiting (serverless-safe)
--
-- Problem: the old rate limiter was an in-memory JS Map, which
-- resets on every Vercel cold start and is per-instance — so it
-- offered no real protection against distributed/bursty traffic.
--
-- Fix: an atomic Postgres-backed counter via check_rate() RPC.
-- The function upserts a per-key counter in a single statement,
-- resetting the window when it's older than 1 minute, and returns
-- true only when the count is within the limit. Single-statement
-- atomicity means concurrent invocations can't double-count.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS muse_rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_muse_rate_limits_window ON muse_rate_limits (window_start);

-- Periodic cleanup: keep the table from growing unbounded. Rows are
-- tiny and only one per unique ip:action, but pruning anything older
-- than 1 hour keeps it lean. (Optional — safe to run on a schedule.)
-- DELETE FROM muse_rate_limits WHERE window_start < now() - interval '1 hour';

CREATE OR REPLACE FUNCTION check_rate(p_key TEXT, p_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Atomic upsert: increment if within the current minute window,
  -- otherwise reset to 1 for a fresh window.
  INSERT INTO muse_rate_limits (key, count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN muse_rate_limits.window_start < now() - interval '1 minute'
          THEN 1
          ELSE muse_rate_limits.count + 1
        END,
        window_start = CASE
          WHEN muse_rate_limits.window_start < now() - interval '1 minute'
          THEN now()
          ELSE muse_rate_limits.window_start
        END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- Allow the service role to execute the RPC (application uses the
-- service client). Anonymous/authenticated users must NOT have direct
-- execute rights — only the server calls this.
GRANT EXECUTE ON FUNCTION check_rate(TEXT, INT) TO service_role;
REVOKE EXECUTE ON FUNCTION check_rate(TEXT, INT) FROM anon, authenticated;
