-- SECURITY FIX: several storage buckets serving paid exam content (Hören
-- audio/images, the shared "audio" bucket used by the exercises/exam
-- pipeline, and Mündlich PDFs) were either fully public (no auth needed at
-- all — confirmed in migrations 20260707090000, 20260706120000, and
-- STORAGE_AND_AUTH_SETUP.sql) or private-but-only-authenticated (no plan
-- check — muendlich-pdfs). Table-level RLS and even server-side signed-URL
-- issuance are irrelevant if the underlying bucket itself will serve any
-- request for a known/guessed path with zero auth — this closes that gap
-- at the one layer that actually controls it: storage.objects RLS.
--
-- hoeren-audio / hoeren-images: gated to the same 'schriftlich' plan check
-- already used for the hoeren_exercises/hoeren_statements tables they
-- belong to (20260716020000_plan_scoped_content_gating.sql).
-- audio: shared bucket for the exercises/exam pipeline, whose parent tables
-- gate per-row via `exercises.module`/`exams.module`; storage.objects can't
-- correlate a path back to a specific row's module, so the safe backstop
-- here is "any active paid subscription" (has_plan_access with p_module
-- NULL matches any active, non-expired plan) rather than leaving it public.
-- muendlich-pdfs: tightened from "any authenticated user" to the 'muendlich'
-- plan check already used for muendlich_materials.
-- exam-assets: unused by any current application code (verified via grep)
-- — locked to admin-only, matching the pdf-imports precedent, since there
-- is no legitimate reader to preserve access for today.

-- ── hoeren-audio ──────────────────────────────────────────────────────────
UPDATE storage.buckets SET public = false WHERE id = 'hoeren-audio';
DROP POLICY IF EXISTS "public read hoeren-audio" ON storage.objects;
CREATE POLICY "plan-gated read hoeren-audio" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hoeren-audio' AND (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())));

-- ── hoeren-images ─────────────────────────────────────────────────────────
UPDATE storage.buckets SET public = false WHERE id = 'hoeren-images';
DROP POLICY IF EXISTS "public read hoeren-images" ON storage.objects;
CREATE POLICY "plan-gated read hoeren-images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hoeren-images' AND (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())));

-- ── audio (exercises/exam pipeline) ──────────────────────────────────────
UPDATE storage.buckets SET public = false WHERE id = 'audio';
DROP POLICY IF EXISTS "Audio: public read" ON storage.objects;
CREATE POLICY "plan-gated read audio" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio' AND (public.has_plan_access(auth.uid(), NULL) OR public.is_d17_staff(auth.uid())));

-- ── muendlich-pdfs ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth read muendlich-pdfs" ON storage.objects;
CREATE POLICY "plan-gated read muendlich-pdfs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'muendlich-pdfs' AND (public.has_plan_access(auth.uid(), 'muendlich') OR public.is_d17_staff(auth.uid())));

-- ── exam-assets (currently unused — lock to admin/service_role) ─────────
UPDATE storage.buckets SET public = false WHERE id = 'exam-assets';
DROP POLICY IF EXISTS "Exam assets: public read" ON storage.objects;
CREATE POLICY "admin read exam-assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'exam-assets' AND public.has_role(auth.uid(), 'admin'));
