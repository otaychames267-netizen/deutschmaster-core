-- Public audio bucket for Hören Phase 2 (MP3 upload). Created now so the
-- upload step later needs no schema/UI changes — audio_path already exists
-- on hoeren_exercises and the player component already reads from this bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('hoeren-audio', 'hoeren-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read hoeren-audio" ON storage.objects FOR SELECT
  USING (bucket_id = 'hoeren-audio');

CREATE POLICY "admin write hoeren-audio" ON storage.objects FOR ALL TO authenticated
  USING    (bucket_id = 'hoeren-audio' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (bucket_id = 'hoeren-audio' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
