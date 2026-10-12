-- Personal AI Sprachtrainer allowance (owner 2026-10-12: "open 5 Mündlich-AI tries for this student").
-- A row gives ONE student sessions_total sessions of the 1:1 AI tutor until expires_at, WITHOUT the Komplett plan (and without anything else of it: has_plan_access only opens the
-- muendlich_ai module for an allowance holder). The sessions are counted from granted_at with the normal "counts as a session" rule (>= 90 s or still running); the daily limit
-- still applies. Someone who buys the Komplett plan simply falls back to the normal limits. RLS on, no policy: service role / SQL only.
-- Grant:  INSERT INTO public.muendlich_ai_allowances (user_id, sessions_total, expires_at, note) VALUES ('<uuid>', 5, now() + interval '30 days', 'why');
-- Revoke: DELETE FROM public.muendlich_ai_allowances WHERE user_id = '<uuid>';
CREATE TABLE IF NOT EXISTS public.muendlich_ai_allowances (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sessions_total int  NOT NULL CHECK (sessions_total > 0),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  note           text
);
ALTER TABLE public.muendlich_ai_allowances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.muendlich_ai_allowance_left(p_user uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT GREATEST(a.sessions_total - public.muendlich_ai_used(a.user_id, 'one_to_one', a.granted_at), 0)
                     FROM public.muendlich_ai_allowances a WHERE a.user_id = p_user AND a.expires_at > now()), 0);
$$;
REVOKE ALL ON FUNCTION public.muendlich_ai_allowance_left(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.muendlich_ai_allowance_left(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.muendlich_ai_quota(p_user uuid, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $f$
DECLARE
  tz constant text := 'Africa/Tunis';
  m_start timestamptz := date_trunc('month', now() AT TIME ZONE tz) AT TIME ZONE tz;
  d_start timestamptz := date_trunc('day', now() AT TIME ZONE tz) AT TIME ZONE tz;
  ml int := public.muendlich_ai_limit('muendlich_ai_monthly_limit', 30);
  dl int := public.muendlich_ai_limit('muendlich_ai_daily_limit', 1);
  bud numeric := COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'muendlich_ai_budget_usd_' || p_kind), 5);
  m_end timestamptz;
  al public.muendlich_ai_allowances%ROWTYPE;
  worst numeric := COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'muendlich_ai_worst_session_usd_' || p_kind),
                            CASE WHEN p_kind = 'one_to_one' THEN 0.27 ELSE 0.45 END);
BEGIN
  IF p_kind = 'one_to_one' THEN
    SELECT * INTO al FROM public.muendlich_ai_allowances WHERE user_id = p_user AND expires_at > now();
    IF FOUND AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p_user AND s.status = 'active' AND s.expires_at > now() AND s.plan_code::text = 'komplett_ai') THEN
      ml := al.sessions_total; m_start := al.granted_at; m_end := al.expires_at;
    END IF;
  END IF;
  IF public.is_d17_staff(p_user) THEN
    RETURN jsonb_build_object('unlimited', true);
  END IF;
  RETURN jsonb_build_object(
    'unlimited', false,
    'monthly_limit', ml, 'monthly_used', public.muendlich_ai_used(p_user, p_kind, m_start),
    'daily_limit', dl, 'daily_used', public.muendlich_ai_used(p_user, p_kind, d_start),
    'budget_usd', bud, 'worst_session_usd', worst, 'spent_usd', round(public.muendlich_ai_spent(p_user, p_kind, m_start), 4),
    'month_resets_at', COALESCE(m_end, m_start + interval '1 month'), 'day_resets_at', (d_start + interval '1 day'));
END;
$f$;

CREATE OR REPLACE FUNCTION public.has_plan_access(p_user_id uuid, p_module text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $f$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN false;
  END IF;

  IF EXISTS (
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
  ) THEN
    RETURN true;
  END IF;
  -- a personal allowance of AI Sprachtrainer sessions (granted by the owner, see muendlich_ai_allowances) opens ONLY the muendlich_ai module and only while sessions are left
  RETURN (p_module IS NOT DISTINCT FROM $q$muendlich_ai$q$) AND public.muendlich_ai_allowance_left(p_user_id) > 0;
END;
$f$;
