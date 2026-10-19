-- ============================================================
-- D17 v3 hardening — Phase 11: dynamic risk configuration + history.
--
-- Seeds the previously-hardcoded thresholds into platform_settings (the
-- same table the kill switch already uses), so an admin can tune them
-- without a code deploy. set_platform_setting is upgraded to log every
-- change to a new history table BEFORE overwriting — no setting change is
-- ever silently lost, matching the "never overwrite configuration without
-- preserving previous values" requirement. Existing callers (the kill
-- switch toggle) get history tracking automatically, no app code changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_settings_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL,
  old_value   jsonb,
  new_value   jsonb NOT NULL,
  changed_by  uuid REFERENCES auth.users(id),
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_settings_history_key_idx ON public.platform_settings_history(key, changed_at DESC);
GRANT SELECT ON public.platform_settings_history TO authenticated;
GRANT ALL ON public.platform_settings_history TO service_role;
ALTER TABLE public.platform_settings_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_settings_history_read_admin" ON public.platform_settings_history;
CREATE POLICY "platform_settings_history_read_admin" ON public.platform_settings_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_platform_setting(p_key text, p_value jsonb, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_value jsonb;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT value INTO v_old_value FROM public.platform_settings WHERE key = p_key;

  INSERT INTO public.platform_settings_history (key, old_value, new_value, changed_by)
  VALUES (p_key, v_old_value, p_value, p_admin_id);

  INSERT INTO public.platform_settings (key, value, updated_by, updated_at)
  VALUES (p_key, p_value, p_admin_id, now())
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.set_platform_setting(text, jsonb, uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_platform_setting(text, jsonb, uuid) TO service_role;

-- Seed defaults matching the values already hardcoded in application code —
-- purely additive, no behavior change until an admin actually edits one.
INSERT INTO public.platform_settings (key, value) VALUES
  ('d17_auto_approve_threshold', '90'::jsonb),
  ('d17_max_attempts_per_order', '5'::jsonb),
  ('d17_manual_review_window_hours', '8'::jsonb),
  ('d17_ten_minute_submission_limit', '3'::jsonb),
  ('d17_hourly_submission_limit', '5'::jsonb),
  ('d17_confirmation_window_minutes', '10'::jsonb),
  ('d17_suspension_tier1_hours', '1'::jsonb),
  ('d17_suspension_tier2_hours', '24'::jsonb)
ON CONFLICT (key) DO NOTHING;
