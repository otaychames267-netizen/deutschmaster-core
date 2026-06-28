-- Mündlich Vorbereitung PDFs bucket. Private; authenticated users read, admins write.
INSERT INTO storage.buckets (id, name, public) VALUES ('muendlich-pdfs','muendlich-pdfs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth read muendlich-pdfs"  ON storage.objects;
DROP POLICY IF EXISTS "admin write muendlich-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "admin del muendlich-pdfs"  ON storage.objects;

CREATE POLICY "auth read muendlich-pdfs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'muendlich-pdfs');
CREATE POLICY "admin write muendlich-pdfs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'muendlich-pdfs' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
CREATE POLICY "admin del muendlich-pdfs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'muendlich-pdfs' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
