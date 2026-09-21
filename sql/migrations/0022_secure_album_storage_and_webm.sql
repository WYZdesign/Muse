-- Album media requires an object-storage privacy boundary. Public URLs cannot
-- honor per-album public/invite/private access levels.
UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','audio/webm','video/webm']
WHERE id = 'muse-uploads';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('muse-private', 'muse-private', false, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Uploads are server-side only: /api/muse/upload authenticates, validates file
-- signatures, moderates content, and writes with the service role.
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
