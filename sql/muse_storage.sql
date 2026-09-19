-- Muse storage bucket + object policies (idempotent, safe to re-run).
-- Bucket: muse-uploads (public read, authenticated write, 10 MB limit).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('muse-uploads', 'muse-uploads', true, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload into the muse-uploads bucket.
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'muse-uploads');

-- Public read access for the muse-uploads bucket.
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'muse-uploads');

-- Users may update their own uploads.
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'muse-uploads' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'muse-uploads' AND owner = auth.uid());

-- Users may delete their own uploads.
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'muse-uploads' AND owner = auth.uid());
