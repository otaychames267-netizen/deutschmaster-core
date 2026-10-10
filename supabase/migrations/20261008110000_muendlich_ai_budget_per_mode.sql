-- Follow-up to 20261008100000_muendlich_ai_quota.sql (owner, same day): the monthly dollar ceiling is now PER MODE —
-- at most 5 USD of AI Mündlich per student per month for the 1:1 tutor and at most 5 USD for the 2:1 exam room, so the two together can never pass 10 USD
-- (was: one combined 9 USD budget).
--
-- The check is strict: a new session starts only if  spent_this_month(mode) + worst_session(mode) <= budget(mode),
-- i.e. the session that is about to start could not push the student over the budget even in its worst case
-- (1:1 worst ~0.27 USD: 3,500-char TTS ceiling + uncached Claude + STT; 2:1 worst ~0.45 USD: 7,000-char ceiling + STT + examiner).
-- The 2:1 room's full cost is attributed to EACH participant although it is shared, so real spend is lower than counted.
-- All values live in platform_settings and can be changed without a migration:
--   muendlich_ai_budget_usd_one_to_one / _two_to_one (5), muendlich_ai_worst_session_usd_one_to_one (0.27) / _two_to_one (0.45).
-- Error code unchanged: MUENDLICH_AI_QUOTA_BUDGET.

INSERT INTO public.platform_settings (key, value) VALUES
  ('muendlich_ai_budget_usd_one_to_one', '5'::jsonb),
  ('muendlich_ai_budget_usd_two_to_one', '5'::jsonb),
  ('muendlich_ai_worst_session_usd_one_to_one', '0.27'::jsonb),
  ('muendlich_ai_worst_session_usd_two_to_one', '0.45'::jsonb)
ON CONFLICT (key) DO NOTHING;

DELETE FROM public.platform_settings WHERE key = 'muendlich_ai_monthly_budget_usd';

-- Estimated USD spent by this student since p_since in ONE mode (same "counts as a session" rule as muendlich_ai_used).
CREATE OR REPLACE FUNCTION public.muendlich_ai_spent(p_user uuid, p_kind text, p_since timestamptz)
 RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n numeric;
BEGIN
  IF p_kind = 'one_to_one' THEN
    SELECT COALESCE(sum(COALESCE(c.usd_total, 0.25)), 0) INTO n
      FROM public.voice_tutor_sessions s
      LEFT JOIN public.voice_tutor_costs c ON c.session_id = s.id
     WHERE s.user_id = p_user AND s.started_at >= p_since
       AND ((s.ended_at IS NULL AND s.started_at > now() - interval '5 minutes')
         OR (s.ended_at IS NOT NULL AND s.ended_at - s.started_at >= interval '90 seconds'));
  ELSIF p_kind = 'two_to_one' THEN
    SELECT COALESCE(sum(COALESCE(c.usd_total, 0.45)), 0) INTO n
      FROM (SELECT DISTINCT es.id FROM public.muendlich_exam_sessions es
              JOIN public.muendlich_participants p ON p.room_id = es.room_id
             WHERE p.user_id = p_user AND es.started_at >= p_since
               AND ((es.ended_at IS NULL AND es.started_at > now() - interval '45 minutes')
                 OR (es.ended_at IS NOT NULL AND es.ended_at - es.started_at >= interval '120 seconds'))) x
      LEFT JOIN public.muendlich_exam_costs c ON c.session_id = x.id;
  ELSE
    RAISE EXCEPTION 'unknown quota kind %', p_kind;
  END IF;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.muendlich_ai_quota(p_user uuid, p_kind text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  tz constant text := 'Africa/Tunis';
  m_start timestamptz := date_trunc('month', now() AT TIME ZONE tz) AT TIME ZONE tz;
  d_start timestamptz := date_trunc('day', now() AT TIME ZONE tz) AT TIME ZONE tz;
  ml int := public.muendlich_ai_limit('muendlich_ai_monthly_limit', 30);
  dl int := public.muendlich_ai_limit('muendlich_ai_daily_limit', 1);
  bud numeric := COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'muendlich_ai_budget_usd_' || p_kind), 5);
  worst numeric := COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'muendlich_ai_worst_session_usd_' || p_kind),
                            CASE WHEN p_kind = 'one_to_one' THEN 0.27 ELSE 0.45 END);
BEGIN
  IF public.is_d17_staff(p_user) THEN
    RETURN jsonb_build_object('unlimited', true);
  END IF;
  RETURN jsonb_build_object(
    'unlimited', false,
    'monthly_limit', ml, 'monthly_used', public.muendlich_ai_used(p_user, p_kind, m_start),
    'daily_limit', dl, 'daily_used', public.muendlich_ai_used(p_user, p_kind, d_start),
    'budget_usd', bud, 'worst_session_usd', worst, 'spent_usd', round(public.muendlich_ai_spent(p_user, p_kind, m_start), 4),
    'month_resets_at', (m_start + interval '1 month'), 'day_resets_at', (d_start + interval '1 day'));
END;
$$;

CREATE OR REPLACE FUNCTION public.muendlich_ai_enforce(p_user uuid, p_kind text)
 RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE q jsonb := public.muendlich_ai_quota(p_user, p_kind);
BEGIN
  IF (q->>'unlimited')::boolean THEN RETURN; END IF;
  IF (q->>'spent_usd')::numeric + (q->>'worst_session_usd')::numeric > (q->>'budget_usd')::numeric THEN
    RAISE EXCEPTION 'MUENDLICH_AI_QUOTA_BUDGET' USING DETAIL = q::text;
  END IF;
  IF (q->>'monthly_used')::int >= (q->>'monthly_limit')::int THEN
    RAISE EXCEPTION 'MUENDLICH_AI_QUOTA_MONTH' USING DETAIL = q::text;
  END IF;
  IF (q->>'daily_used')::int >= (q->>'daily_limit')::int THEN
    RAISE EXCEPTION 'MUENDLICH_AI_QUOTA_DAY' USING DETAIL = q::text;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.muendlich_ai_spent(uuid, timestamptz);
REVOKE ALL ON FUNCTION public.muendlich_ai_spent(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
