-- Owner decision (2026-10-05): Schriftlich (30 DT) is sold on its own and includes ONLY the Mündlich Vorbereitung
-- cards (the muendlich_materials library) — not the Mündlich exam rooms / AI. Mündlich-only includes no Schriftlich.
-- Komplett / Premium include everything.
--
-- The 2026-08-10 migration (20260810120000) had collapsed every plan into full access by making has_plan_access
-- ignore its module argument. Module scoping is restored here, with:
--   * a NEW module 'muendlich_prep' = any active plan (used by muendlich_materials, i.e. the Vorbereitung cards);
--   * a GRANDFATHER clause: subscriptions that STARTED before the cutoff below were bought while every plan meant
--     full access, so they keep it until they expire — nobody loses something they paid for;
--   * plan_code IS NULL treated as full (defensive: legacy rows).
-- 'muendlich' (rooms, participants, matchmaking queue, minutes) now needs plan muendlich / komplett / premium;
-- 'schriftlich' (Lesen, Hören, Sprachbausteine, Schreiben credits, simulations) needs schriftlich / komplett / premium.
-- Any other / NULL module keeps the old behaviour (any active subscription), so every existing caller is unchanged.
CREATE OR REPLACE FUNCTION public.has_plan_access(p_user_id uuid, p_module text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.expires_at > now()
      AND (
        p_module IS NULL
        OR p_module NOT IN ('schriftlich', 'muendlich')           -- 'muendlich_prep' and anything unscoped: any active plan
        OR s.plan_code IS NULL
        OR s.plan_code::text IN ('komplett', 'premium')
        OR s.plan_code::text = p_module
        OR s.started_at < timestamptz '2026-10-05 10:50:47+00'                      -- grandfathered: bought while every plan meant full access
      )
  );
END;
$$;

-- The Mündlich Vorbereitung library is open to every paying plan (the cards), exactly as before for everyone.
ALTER POLICY "auth read materials" ON public.muendlich_materials
  USING (
    public.has_plan_access(auth.uid(), 'muendlich_prep'::text)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_d17_staff(auth.uid())
  );

UPDATE public.plans
SET description = 'Written exam preparation — Lesen, Hören, Sprachbausteine, Schreiben + the Mündlich Vorbereitung cards (no AI exam)',
    updated_at = now()
WHERE code = 'schriftlich';

-- The Vorbereitung cards open their PDFs (Tipps / Redemittel) from this private bucket, so it follows the same rule as the
-- cards themselves — otherwise a Schriftlich user would see a card whose PDF refuses to load.
ALTER POLICY "plan-gated read muendlich-pdfs" ON storage.objects
  USING (
    bucket_id = 'muendlich-pdfs'
    AND name !~~ '%/admin/%'
    AND (public.has_plan_access(auth.uid(), 'muendlich_prep'::text) OR public.is_d17_staff(auth.uid()))
  );
