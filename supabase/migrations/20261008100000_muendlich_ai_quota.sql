-- AI Mündlich quota (owner 2026-10-08): at most 30 sessions per calendar month and 1 per day, SEPARATELY for the 1:1 AI tutor and the 2:1 AI-examiner exam,
-- per student; staff/admin exempt. Day and month boundaries follow Africa/Tunis. Limits live in platform_settings
-- (muendlich_ai_monthly_limit / muendlich_ai_daily_limit) so they can be changed without a migration.
--
-- What counts as a session: it must actually have run — ended after >= 90 s (1:1) / >= 120 s (2:1), or still open (1:1: started < 5 min ago,
-- 2:1: started < 45 min ago; muendlich_exam_sessions rows only exist once the exam really started). Attempts that fail within seconds
-- (relay down, mic denied) therefore do not burn the slot. Cost safety does NOT depend on this count: the 45 min/day hard cap
-- (voice_tutor_daily_usage) and the per-session character ceilings stay in force.
--
-- Enforcement is in the database so it holds whichever client or relay version is running:
--   * BEFORE INSERT on voice_tutor_sessions (the student's own client creates that row before connecting)
--   * BEFORE INSERT on muendlich_participants (joining any 2:1 room) and inside join_muendlich_queue (fails early, before waiting for a partner)
-- service_role writes (server-side tooling / tests) are not counted; students only ever write through their own authenticated client.
-- Error codes (RAISE EXCEPTION message): MUENDLICH_AI_QUOTA_MONTH / MUENDLICH_AI_QUOTA_DAY, DETAIL = the quota json.

-- Hard dollar ceiling (owner, same day): the worst a single student may cost per month across BOTH modes must stay under 10 USD.
-- Session counts alone cannot promise that (cost per session varies), so the real spend is summed from the measured cost tables
-- (voice_tutor_costs / muendlich_exam_costs) and new sessions are refused once it reaches the budget (default 9.00 USD, leaving room for the one
-- session that may still be running — worst single session is < 0.5 USD thanks to the TTS character ceilings). A session without a cost row yet
-- (still running, or the relay crashed before writing it) is charged a conservative flat estimate; a 2:1 exam's full room cost is attributed
-- to EACH participant although it is really shared, so the bound is an over-estimate.
-- Error code: MUENDLICH_AI_QUOTA_BUDGET.
INSERT INTO public.platform_settings (key, value) VALUES
  ('muendlich_ai_monthly_limit', '30'::jsonb),
  ('muendlich_ai_daily_limit', '1'::jsonb),
  ('muendlich_ai_monthly_budget_usd', '9'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.muendlich_ai_limit(p_key text, p_default int)
 RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = p_key), p_default); $$;

CREATE OR REPLACE FUNCTION public.muendlich_ai_used(p_user uuid, p_kind text, p_since timestamptz)
 RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n int;
BEGIN
  IF p_kind = 'one_to_one' THEN
    SELECT count(*) INTO n FROM public.voice_tutor_sessions s
     WHERE s.user_id = p_user AND s.started_at >= p_since
       AND ((s.ended_at IS NULL AND s.started_at > now() - interval '5 minutes')
         OR (s.ended_at IS NOT NULL AND s.ended_at - s.started_at >= interval '90 seconds'));
  ELSIF p_kind = 'two_to_one' THEN
    SELECT count(DISTINCT es.id) INTO n FROM public.muendlich_exam_sessions es
      JOIN public.muendlich_participants p ON p.room_id = es.room_id
     WHERE p.user_id = p_user AND es.started_at >= p_since
       AND ((es.ended_at IS NULL AND es.started_at > now() - interval '45 minutes')
         OR (es.ended_at IS NOT NULL AND es.ended_at - es.started_at >= interval '120 seconds'));
  ELSE
    RAISE EXCEPTION 'unknown quota kind %', p_kind;
  END IF;
  RETURN COALESCE(n, 0);
END;
$$;

-- Estimated USD spent by this student since p_since, across BOTH modes (same "counts as a session" rule as muendlich_ai_used).
CREATE OR REPLACE FUNCTION public.muendlich_ai_spent(p_user uuid, p_since timestamptz)
 RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE t numeric; e numeric;
BEGIN
  SELECT COALESCE(sum(COALESCE(c.usd_total, 0.25)), 0) INTO t
    FROM public.voice_tutor_sessions s
    LEFT JOIN public.voice_tutor_costs c ON c.session_id = s.id
   WHERE s.user_id = p_user AND s.started_at >= p_since
     AND ((s.ended_at IS NULL AND s.started_at > now() - interval '5 minutes')
       OR (s.ended_at IS NOT NULL AND s.ended_at - s.started_at >= interval '90 seconds'));
  SELECT COALESCE(sum(COALESCE(c.usd_total, 0.45)), 0) INTO e
    FROM (SELECT DISTINCT es.id FROM public.muendlich_exam_sessions es
            JOIN public.muendlich_participants p ON p.room_id = es.room_id
           WHERE p.user_id = p_user AND es.started_at >= p_since
             AND ((es.ended_at IS NULL AND es.started_at > now() - interval '45 minutes')
               OR (es.ended_at IS NOT NULL AND es.ended_at - es.started_at >= interval '120 seconds'))) x
    LEFT JOIN public.muendlich_exam_costs c ON c.session_id = x.id;
  RETURN t + e;
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
  bud numeric := COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'muendlich_ai_monthly_budget_usd'), 9);
BEGIN
  IF public.is_d17_staff(p_user) THEN
    RETURN jsonb_build_object('unlimited', true);
  END IF;
  RETURN jsonb_build_object(
    'unlimited', false,
    'monthly_limit', ml, 'monthly_used', public.muendlich_ai_used(p_user, p_kind, m_start),
    'daily_limit', dl, 'daily_used', public.muendlich_ai_used(p_user, p_kind, d_start),
    'budget_usd', bud, 'spent_usd', round(public.muendlich_ai_spent(p_user, m_start), 4),
    'month_resets_at', (m_start + interval '1 month'), 'day_resets_at', (d_start + interval '1 day'));
END;
$$;

CREATE OR REPLACE FUNCTION public.muendlich_ai_enforce(p_user uuid, p_kind text)
 RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE q jsonb := public.muendlich_ai_quota(p_user, p_kind);
BEGIN
  IF (q->>'unlimited')::boolean THEN RETURN; END IF;
  IF (q->>'spent_usd')::numeric >= (q->>'budget_usd')::numeric THEN
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

CREATE OR REPLACE FUNCTION public.get_my_muendlich_ai_quota()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('one_to_one', public.muendlich_ai_quota(auth.uid(), 'one_to_one'),
                            'two_to_one', public.muendlich_ai_quota(auth.uid(), 'two_to_one'));
$$;

CREATE OR REPLACE FUNCTION public.trg_muendlich_ai_quota_tutor()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  PERFORM public.muendlich_ai_enforce(NEW.user_id, 'one_to_one');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_muendlich_ai_quota_participant()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  PERFORM public.muendlich_ai_enforce(NEW.user_id, 'two_to_one');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_muendlich_ai_quota_tutor ON public.voice_tutor_sessions;
CREATE TRIGGER trg_muendlich_ai_quota_tutor BEFORE INSERT ON public.voice_tutor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_muendlich_ai_quota_tutor();

DROP TRIGGER IF EXISTS trg_muendlich_ai_quota_participant ON public.muendlich_participants;
CREATE TRIGGER trg_muendlich_ai_quota_participant BEFORE INSERT ON public.muendlich_participants
  FOR EACH ROW EXECUTE FUNCTION public.trg_muendlich_ai_quota_participant();

REVOKE ALL ON FUNCTION public.muendlich_ai_limit(text, int), public.muendlich_ai_used(uuid, text, timestamptz), public.muendlich_ai_spent(uuid, timestamptz),
  public.muendlich_ai_quota(uuid, text), public.muendlich_ai_enforce(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_muendlich_ai_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_muendlich_ai_quota() TO authenticated;

-- join_muendlich_queue: identical to the live definition plus one line — the quota check right after the access check.
CREATE OR REPLACE FUNCTION public.join_muendlich_queue(p_level text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_other RECORD;
  v_code TEXT;
  v_room_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level'; END IF;
  IF NOT has_plan_access(v_uid, 'muendlich') THEN RAISE EXCEPTION 'NO_MUENDLICH_ACCESS'; END IF;
  PERFORM public.muendlich_ai_enforce(v_uid, 'two_to_one'); -- fail early, before the student waits for a partner

  -- Same staleness-aware "already active elsewhere" guard as
  -- check_single_active_muendlich_session() (see the previous migration) —
  -- a student already mid-exam, or in a genuinely fresh pre-exam room,
  -- shouldn't be able to also queue for a second one.
  IF EXISTS (
    SELECT 1 FROM muendlich_participants p JOIN muendlich_rooms r ON r.id = p.room_id
    WHERE p.user_id = v_uid AND r.state NOT IN ('finished', 'abandoned')
      AND NOT (r.state IN ('waiting_for_partner', 'both_connected', 'ready_check') AND r.updated_at < now() - interval '15 minutes')
  ) THEN
    RAISE EXCEPTION 'ALREADY_IN_ACTIVE_SESSION';
  END IF;

  -- Clear any stale queue row of our own first (re-clicking "find a
  -- partner" after a previous search timed out) — the unique index on
  -- user_id means a leftover row would otherwise block re-enrolling.
  DELETE FROM muendlich_matchmaking_queue WHERE user_id = v_uid;

  SELECT id, user_id INTO v_other
  FROM muendlich_matchmaking_queue
  WHERE level = p_level AND matched_room_code IS NULL AND user_id <> v_uid
    AND joined_at > now() - interval '5 minutes'
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    v_code := upper(substr(md5(random()::text), 1, 6));
    INSERT INTO muendlich_rooms (code, state, created_by) VALUES (v_code, 'waiting_for_partner', v_uid) RETURNING id INTO v_room_id;
    UPDATE muendlich_matchmaking_queue SET matched_room_code = v_code WHERE id = v_other.id;
    RETURN v_code;
  END IF;

  INSERT INTO muendlich_matchmaking_queue (user_id, level) VALUES (v_uid, p_level);
  RETURN NULL;
END;
$function$;
