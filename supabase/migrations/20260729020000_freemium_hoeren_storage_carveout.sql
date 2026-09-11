-- ============================================================
-- Real gap found while completing the freemium wiring: the freemium
-- migrations (20260728010000/20260728020000) flagged is_free_sample on
-- hoeren_exercises and added a matching table-level RLS carve-out, but
-- never touched the hoeren-audio/hoeren-images storage buckets. Those
-- buckets' only SELECT policy is `has_plan_access(...) OR is_d17_staff(...)`
-- — a non-subscriber viewing a flagged free-sample Hören exercise gets the
-- exercise row and its Richtig/Falsch statements fine, but
-- createSignedUrl() for the audio/image silently fails, so the "free
-- sample" would render with no playable audio. This is the storage-layer
-- half of the same feature, not a new permission.
--
-- Additive only: a second, narrower permissive SELECT policy alongside the
-- existing plan-gated one. Postgres ORs permissive policies together, so
-- this can only ever add a smaller door for the 12 flagged free-sample
-- audio/image files — it cannot narrow a paying subscriber's existing
-- access to anything.
-- ============================================================

CREATE POLICY "free sample read hoeren-audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'hoeren-audio'
  AND EXISTS (
    SELECT 1 FROM public.hoeren_exercises he
    WHERE he.audio_path = storage.objects.name
      AND he.is_free_sample = true
  )
);

CREATE POLICY "free sample read hoeren-images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'hoeren-images'
  AND EXISTS (
    SELECT 1 FROM public.hoeren_exercises he
    WHERE he.image_path = storage.objects.name
      AND he.is_free_sample = true
  )
);
