-- Create form_submissions table for persistent form storage
CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  form_type TEXT NOT NULL,
  data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ip TEXT
);

-- Index for admin queries by form type
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_date ON form_submissions(submitted_at DESC);

-- RLS — allow service role full access, anon can insert only
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (form submissions)
CREATE POLICY "Allow inserts" ON form_submissions FOR INSERT WITH CHECK (true);

-- Allow reads only for service role (admin dashboard)
CREATE POLICY "Service role reads" ON form_submissions FOR SELECT USING (auth.role() = 'service_role');
