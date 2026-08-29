-- ═══ MUSE — OPENROUTER AI EMBEDDINGS MIGRATION (2026-08-13) ═══
-- Stores profile embedding vectors as JSONB (dimension-agnostic) so the
-- match engine can compute cosine similarity in-app without requiring
-- pgvector or a separate Qdrant instance.
--
-- Safe to re-run.

ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS embedding JSONB;
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS embedding_model TEXT NOT NULL DEFAULT '';
ALTER TABLE muse_profiles ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_muse_profiles_embedded ON muse_profiles(embedded_at);

-- ═══ AI knowledge base (RAG) — Muse docs/FAQ embedded for the support + admin AIs ═══
CREATE TABLE IF NOT EXISTS muse_ai_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title)
);

CREATE INDEX IF NOT EXISTS idx_muse_ai_docs_section ON muse_ai_docs(section);

ALTER TABLE muse_ai_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AI docs are service-only" ON muse_ai_docs;
CREATE POLICY "AI docs are service-only" ON muse_ai_docs
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
