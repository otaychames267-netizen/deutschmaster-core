-- Real bug found via a professional-experience audit (2026-09-30): a student
-- who created a Mündlich exam room and never found a partner (or whose
-- partner never confirmed Ready) had NO way to leave that room state — the
-- 'abandoned' RoomState value was defined in the CHECK constraint and already
-- excluded by check_single_active_muendlich_session()'s "is this user in an
-- active session" trigger, but nothing anywhere in the codebase ever wrote
-- it. Fixed the app-level "Leave" button path separately (room.ts's new
-- abandonRoomIfIncomplete()), but that only covers a user who explicitly
-- clicks Leave — someone who just closes the tab/browser leaves a room stuck
-- in waiting_for_partner/both_connected/ready_check forever, permanently
-- blocking them from ever starting or joining another room again with zero
-- self-service recovery.
--
-- Fixed here at the trigger level (the actual hard enforcement point, not
-- just the client's friendly pre-check in joinOrCreateRoom) with the same
-- lazy-expiry idiom already used everywhere else in this project (muendlich_
-- credits' 30-day window, api_usage_ledger's daily rows, etc.) — no pg_cron
-- needed: a room that's been sitting in a pre-exam state for more than 15
-- minutes with no state change is just treated as inactive for the purposes
-- of this check, without ever writing a row. Once a room reaches
-- 'preparation' or later, this staleness carve-out no longer applies — a
-- real mid-exam disconnect must keep blocking a second concurrent session,
-- exactly as before.

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
        r.state IN ('waiting_for_partner', 'both_connected', 'ready_check')
        AND r.updated_at < now() - interval '15 minutes'
      )
  ) THEN
    RAISE EXCEPTION 'ALREADY_IN_ACTIVE_SESSION';
  END IF;
  RETURN NEW;
END;
$$;
