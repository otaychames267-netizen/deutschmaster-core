-- AuraLingovia — Storage Buckets & Policies
-- Run this in the new project's SQL Editor AFTER running FULL_SCHEMA.sql

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Avatars (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- PDF imports (private, service_role only for reads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-imports',
  'pdf-imports',
  false,
  52428800, -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Audio files (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  true,
  52428800, -- 50 MB
  ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Exam assets (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-assets',
  'exam-assets',
  true,
  20971520, -- 20 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Avatars: authenticated users can upload their own
DROP POLICY IF EXISTS "Avatars: authenticated upload" ON storage.objects;
CREATE POLICY "Avatars: authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars: public read" ON storage.objects;
CREATE POLICY "Avatars: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars: owner delete" ON storage.objects;
CREATE POLICY "Avatars: owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- PDF imports: admins/service_role only
DROP POLICY IF EXISTS "PDF imports: admin upload" ON storage.objects;
CREATE POLICY "PDF imports: admin upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pdf-imports'
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "PDF imports: admin read" ON storage.objects;
CREATE POLICY "PDF imports: admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pdf-imports'
  AND public.has_role(auth.uid(), 'admin')
);

-- Audio: public read, admin write
DROP POLICY IF EXISTS "Audio: public read" ON storage.objects;
CREATE POLICY "Audio: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'audio');

DROP POLICY IF EXISTS "Audio: admin upload" ON storage.objects;
CREATE POLICY "Audio: admin upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio' AND public.has_role(auth.uid(), 'admin'));

-- Exam assets: public read, admin write
DROP POLICY IF EXISTS "Exam assets: public read" ON storage.objects;
CREATE POLICY "Exam assets: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'exam-assets');

DROP POLICY IF EXISTS "Exam assets: admin upload" ON storage.objects;
CREATE POLICY "Exam assets: admin upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exam-assets' AND public.has_role(auth.uid(), 'admin'));
