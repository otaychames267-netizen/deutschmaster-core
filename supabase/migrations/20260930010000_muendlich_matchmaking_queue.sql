-- Real gap found via a "professional experience" audit (2026-09-30): the
-- Prüfungssimulation room only supports two entry paths — create a room and
-- manually share its code with someone, or join a code someone else shared.
-- There is no way to be paired with another waiting student automatically.
-- Most students preparing alone for TELC will not have a study partner ready
-- online at the exact same moment, so this made the (otherwise working)
-- 2-candidate exam effectively unreachable for most real subscribers.
--
-- Minimal matchmaking queue: a student calls join_muendlich_queue(), which
-- either immediately matches them with an existing waiting student of the
-- same level (creating the room right there) or enrolls them to wait. The
-- room CODE (not the raw id) is what both sides end up with, so both clients
-- reuse the EXISTING, already-proven joinOrCreateRoom(code) flow to actually
-- become participants — this migration only creates the room row + pairing
-- record, never touches muendlich_participants itself.

CREATE TABLE IF NOT EXISTS muendlich_matchmaking_queue (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level             TEXT        NOT NULL CHECK (level IN ('TELC_B1', 'TELC_B2')),
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_room_code TEXT        -- set by the second student's match; the first (waiting) student watches their own row for this
);
CREATE UNIQUE INDEX IF NOT EXISTS muendlich_matchmaking_queue_user_idx ON muendlich_matchmaking_queue(user_id);
CREATE INDEX IF NOT EXISTS muendlich_matchmaking_queue_waiting_idx ON muendlich_matchmaking_queue(level, joined_at) WHERE matched_room_code IS NULL;

ALTER TABLE muendlich_matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Own-row only, both directions — a student must be able to see their own
-- queue row (to notice matched_room_code appear via Realtime/poll) and
-- remove it (Cancel search). All INSERT/matching logic goes through the
-- SECURITY DEFINER RPCs below, never a direct client insert, so there is no
-- "insert" policy — direct inserts are simply not possible via PostgREST.
CREATE POLICY "own queue row select" ON muendlich_matchmaking_queue FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "own queue row delete" ON muendlich_matchmaking_queue FOR DELETE TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON muendlich_matchmaking_queue FROM authenticated;
GRANT SELECT, DELETE ON muendlich_matchmaking_queue TO authenticated;

-- Join the queue: matches with an existing waiting same-level student if one
-- exists (creating the room immediately and returning its code to THIS
-- caller), otherwise enrolls this user to wait (returns null — the caller's
-- client then watches its own queue row for matched_room_code, same idiom
-- as everywhere else in this project that watches a server-authoritative
-- field via Realtime + poll rather than a callback).
CREATE OR REPLACE FUNCTION public.join_muendlich_queue(p_level TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_other RECORD;
  v_code TEXT;
  v_room_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level'; END IF;
  IF NOT has_plan_access(v_uid, 'muendlich') THEN RAISE EXCEPTION 'NO_MUENDLICH_ACCESS'; END IF;

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
$$;

REVOKE ALL ON FUNCTION public.join_muendlich_queue(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_muendlich_queue(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_muendlich_queue()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM muendlich_matchmaking_queue WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.leave_muendlich_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_muendlich_queue() TO authenticated;
