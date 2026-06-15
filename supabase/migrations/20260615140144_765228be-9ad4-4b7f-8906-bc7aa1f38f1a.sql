CREATE POLICY "admin pdf-imports rw" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'pdf-imports' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'pdf-imports' AND public.has_role(auth.uid(), 'admin'));