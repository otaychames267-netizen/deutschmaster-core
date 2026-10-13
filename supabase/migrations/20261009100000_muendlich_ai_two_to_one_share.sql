-- Owner 2026-10-09: "at most 5 USD per student in the worst case; if two students share a room, the two together at most 10 USD".
-- Until now a 2:1 room's FULL cost was booked to EACH of its participants, so the 5 USD wall was reached at half the real spend (a pair of students
-- could cost the platform at most ~5 USD, not 10). The room's cost is now split between the participants of the room (normally 2): every student is booked
-- exactly their own share, so  sum over students of (booked spend)  =  real spend  and each student is capped at 5 USD of real cost per month.
--
-- Only muendlich_ai_spent() changes (2:1 branch: usd_total / participants, flat estimate 0.45 / participants when no cost row exists).
-- The strict check  spent + worst_session <= budget  needs the worst case of ONE student's SHARE of a room: half of the 0.45 USD worst room
-- (7,000-char ElevenLabs ceiling + STT + examiner) = 0.23 USD, so the setting below is lowered from 0.45 (it can be changed again without a migration —
-- e.g. when Qwen/DeepInfra TTS goes live the worst room is ~0.24 USD, a share of ~0.12).
-- 1:1 is untouched.

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
    -- this student's share of every counted room: the room's cost divided by the number of students in the room
    SELECT COALESCE(sum(COALESCE(c.usd_total, 0.45) / x.n_participants), 0) INTO n
      FROM (SELECT es.id,
                   GREATEST((SELECT count(DISTINCT p2.user_id) FROM public.muendlich_participants p2 WHERE p2.room_id = es.room_id), 1) AS n_participants
              FROM public.muendlich_exam_sessions es
             WHERE EXISTS (SELECT 1 FROM public.muendlich_participants p WHERE p.room_id = es.room_id AND p.user_id = p_user)
               AND es.started_at >= p_since
               AND ((es.ended_at IS NULL AND es.started_at > now() - interval '45 minutes')
                 OR (es.ended_at IS NOT NULL AND es.ended_at - es.started_at >= interval '120 seconds'))) x
      LEFT JOIN public.muendlich_exam_costs c ON c.session_id = x.id;
  ELSE
    RAISE EXCEPTION 'unknown quota kind %', p_kind;
  END IF;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.muendlich_ai_spent(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;

-- the worst case of one student's SHARE of a room (see the header)
INSERT INTO public.platform_settings (key, value) VALUES ('muendlich_ai_worst_session_usd_two_to_one', '0.23'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
