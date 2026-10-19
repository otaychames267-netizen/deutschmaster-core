-- Plan "Komplett" (komplett_ai): Schriftlich + Mündlich Vorbereitung + AI Sprachtrainer 1:1 (module 'muendlich_ai'). See 20261010200000.
--
--   * has_plan_access: new module 'muendlich_ai' is true ONLY for an active komplett_ai subscription (never for komplett / premium / muendlich /
--     schriftlich, and the 2026-10-05 grandfather clause does not apply to it). komplett_ai also satisfies module 'schriftlich', but deliberately NOT
--     'muendlich' (the exam rooms / minutes wallet stay out of this plan — the 2-candidate exam is not sold and not shown).
--   * voice_tutor_sessions: BEFORE INSERT guard — until now the INSERT policy only checked user_id = auth.uid(), so the plan check lived in the UI alone.
--     Staff and service_role are exempt (same rule as the quota trigger). Error code NO_AI_ACCESS.
--   * the wallet grants (30 essay credits) and the Struktur auto-assignment now include komplett_ai.

INSERT INTO public.plans (code, name, description, price_eur, price_tnd, price_usd, active)
VALUES ('komplett_ai', 'Komplett',
        'Complete preparation — everything in Schriftlich + the AI Sprachtrainer: speaking practice with an AI examiner (Teil 1, 2 and 3)',
        18.2, 60, 19.4, true)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, price_eur = EXCLUDED.price_eur, price_tnd = EXCLUDED.price_tnd,
      price_usd = EXCLUDED.price_usd, active = true, updated_at = now();

CREATE OR REPLACE FUNCTION public.has_plan_access(p_user_id uuid, p_module text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.expires_at > now()
      AND CASE
        WHEN p_module = 'muendlich_ai' THEN s.plan_code::text = 'komplett_ai'     -- the AI Sprachtrainer: the Komplett plan only
        ELSE (
          p_module IS NULL
          OR p_module NOT IN ('schriftlich', 'muendlich')           -- 'muendlich_prep' and anything unscoped: any active plan
          OR s.plan_code IS NULL
          OR s.plan_code::text IN ('komplett', 'premium')
          OR s.plan_code::text = p_module
          OR (p_module = 'schriftlich' AND s.plan_code::text = 'komplett_ai')
          OR s.started_at < timestamptz '2026-10-05 10:50:47+00'                      -- grandfathered: bought while every plan meant full access
        )
      END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_voice_tutor_plan_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.is_d17_staff(NEW.user_id) THEN RETURN NEW; END IF;
  IF NOT public.has_plan_access(NEW.user_id, 'muendlich_ai') THEN
    RAISE EXCEPTION 'NO_AI_ACCESS' USING ERRCODE = 'P0001', HINT = 'The AI Sprachtrainer is part of the Komplett plan.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_voice_tutor_plan_guard ON public.voice_tutor_sessions;
CREATE TRIGGER trg_voice_tutor_plan_guard BEFORE INSERT ON public.voice_tutor_sessions FOR EACH ROW EXECUTE FUNCTION public.trg_voice_tutor_plan_guard();

CREATE OR REPLACE FUNCTION public.trg_subscriptions_assign_struktur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- same entitlement rule as has_plan_access(user, 'schriftlich'), evaluated on the row itself (has_plan_access refuses when the caller is not the user)
  IF NEW.status::text = 'active'
     AND NEW.expires_at > now()
     AND (
       NEW.plan_code IS NULL
       OR NEW.plan_code::text IN ('komplett', 'komplett_ai', 'premium', 'schriftlich')
       OR NEW.started_at < timestamptz '2026-10-05 10:50:47+00'
     )
  THEN
    PERFORM public.assign_struktur_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- The wallet grant of 30 essay credits follows the plan list inside these two functions. They are patched in place from their live definition (same
-- signature, same body, one list widened) so nothing else about them can drift.
DO $patch$
DECLARE
  def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'activate_d17_order';
  def := replace(def, 'IF p_plan_code IN (''schriftlich'', ''komplett'') THEN', 'IF p_plan_code IN (''schriftlich'', ''komplett'', ''komplett_ai'') THEN');
  IF position('komplett_ai' IN def) = 0 THEN RAISE EXCEPTION 'activate_d17_order: essay-credit plan list not found — patch not applied'; END IF;
  EXECUTE def;

  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'admin_manual_subscription_action';
  def := replace(def, 'if p_plan_code in (''schriftlich'', ''komplett'') then', 'if p_plan_code in (''schriftlich'', ''komplett'', ''komplett_ai'') then');
  IF position('komplett_ai' IN def) = 0 THEN RAISE EXCEPTION 'admin_manual_subscription_action: essay-credit plan list not found — patch not applied'; END IF;
  EXECUTE def;
END
$patch$;
