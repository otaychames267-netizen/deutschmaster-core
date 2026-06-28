-- ─────────────────────────────────────────────────────────────────────────────
-- Import page-image storage (Milestone 2)
--
-- A PRIVATE storage bucket holding the source PDF page images for review.
-- Path hierarchy:  <section>/teil-<n>/<pdf-slug>/page-<num>.png
--   e.g.  lesen/teil-2/lesen-teil-2-1/page-15.png
--
-- The service-role importer uploads images (bypasses RLS). The in-app review
-- screen reads them as an authenticated admin via the policies below.
-- Purely additive; no existing functionality affected.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('import-pages', 'import-pages', false)
ON CONFLICT (id) DO NOTHING;

-- Admin/super_admin/owner may read & manage objects in this bucket only.
DROP POLICY IF EXISTS "admin read import-pages"   ON storage.objects;
DROP POLICY IF EXISTS "admin write import-pages"  ON storage.objects;
DROP POLICY IF EXISTS "admin update import-pages" ON storage.objects;
DROP POLICY IF EXISTS "admin delete import-pages" ON storage.objects;

CREATE POLICY "admin read import-pages" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'import-pages'
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write import-pages" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'import-pages'
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin update import-pages" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'import-pages'
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin delete import-pages" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'import-pages'
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
