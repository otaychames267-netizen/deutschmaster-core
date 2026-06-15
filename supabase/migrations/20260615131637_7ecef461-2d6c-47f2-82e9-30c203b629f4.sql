
CREATE POLICY "audio_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio');
CREATE POLICY "audio_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "audio_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "audio_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'));
