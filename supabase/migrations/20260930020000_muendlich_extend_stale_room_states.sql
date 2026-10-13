-- Real gap found via a professional-experience audit (2026-09-30), same day
-- as the original stale-room fix: that fix only covered the three PRE-
-- preparation states (waiting_for_partner/both_connected/ready_check). But
-- HardwareCheck.tsx (shown once a room reaches exam_room_ready, right before
-- the live relay connection opens) has its own real dead-end — a denied mic
-- permission left "Weiter" disabled forever with no retry (fixed separately
-- in HardwareCheck.tsx itself) — and a student stuck there who leaves hits
-- the IDENTICAL permanent-lockout bug the original fix addressed, just one
-- state later in the machine. Extends the same trigger to cover
-- preparation/preparation_locked/exam_room_ready too.
--
-- 'preparation' needs different math than a flat updated_at threshold: two
-- real candidates can legitimately sit in a 15-minute (or admin-configured
-- longer) prep window without ever touching the room row again after
-- prep_started_at is set, so a flat "15 minutes since updated_at" carve-out
-- would incorrectly treat a genuinely-in-progress prep session as stale.
-- Uses prep_started_at + prep_seconds + a 5-minute buffer instead — only
-- stale once the room's own prep window has definitely fully elapsed.
--
-- preparation_locked/exam_room_ready are brief transitional states with no
-- comparable timer field — a flat 10-minute updated_at threshold is safe
-- here since normal use passes through them in seconds, not minutes.
-- exam_in_progress is deliberately NOT included: a real live exam has its
-- own relay-side reconnect-grace-period handling, which must keep winning
-- over any staleness-based carve-out here.

CREATE OR REPLACE FUNCTION public.check_single_active_muendlich_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM muendlich_participants p
    JOIN muendlich_rooms r ON r.id = p.room_id
    WHERE p.user_id = NEW.user_id
      AND p.room_id <> NEW.room_id
      AND r.state NOT IN ('finished', 'abandoned')
      AND NOT (
        (r.state IN ('waiting_for_partner', 'both_connected', 'ready_check') AND r.updated_at < now() - interval '15 minutes')
        OR (r.state = 'preparation' AND r.prep_started_at IS NOT NULL AND r.prep_started_at + (r.prep_seconds || ' seconds')::interval + interval '5 minutes' < now())
        OR (r.state IN ('preparation_locked', 'exam_room_ready') AND r.updated_at < now() - interval '10 minutes')
      )
  ) THEN
    RAISE EXCEPTION 'ALREADY_IN_ACTIVE_SESSION';
  END IF;
  RETURN NEW;
END;
$$;
