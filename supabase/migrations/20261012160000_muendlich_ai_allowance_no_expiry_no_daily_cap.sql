-- Owner 2026-10-12 (after the first grant): an allowance is "N sessions, nothing else" — no 30-day clock and no daily cap.
--   * expires_at is now OPTIONAL: NULL = no expiry (the allowance lasts until its sessions are used or the row is deleted)
--   * an allowance holder without the Komplett plan has no daily limit (daily_limit = sessions_total); the Komplett plan keeps the normal 50/month and 2/day
ALTER TABLE public.muendlich_ai_allowances ALTER COLUMN expires_at DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.muendlich_ai_allowance_left(p_user uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT GREATEST(a.sessions_total - public.muendlich_ai_used(a.user_id, 'one_to_one', a.granted_at), 0)
                     FROM public.muendlich_ai_allowances a WHERE a.user_id = p_user AND (a.expires_at IS NULL OR a.expires_at > now())), 0);
$$;

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
  is_allow boolean := false;
  al public.muendlich_ai_allowances%ROWTYPE;
  worst numeric := COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'muendlich_ai_worst_session_usd_' || p_kind),
                            CASE WHEN p_kind = 'one_to_one' THEN 0.27 ELSE 0.45 END);
BEGIN
  IF p_kind = 'one_to_one' THEN
    SELECT * INTO al FROM public.muendlich_ai_allowances WHERE user_id = p_user AND (expires_at IS NULL OR expires_at > now());
    IF FOUND AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p_user AND s.status = 'active' AND s.expires_at > now() AND s.plan_code::text = 'komplett_ai') THEN
      ml := al.sessions_total; dl := al.sessions_total; m_start := al.granted_at; is_allow := true; -- no daily cap: the whole allowance may be used whenever the student likes
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
    'month_resets_at', CASE WHEN is_allow THEN to_jsonb(al.expires_at) ELSE to_jsonb(m_start + interval '1 month') END, 'day_resets_at', (d_start + interval '1 day'));
END;
$f$;
