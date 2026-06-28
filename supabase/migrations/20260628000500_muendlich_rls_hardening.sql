-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY HARDENING — replace the permissive Phase-1 "USING(true)" policies on
-- the room tables with membership/ownership-based RLS.
--
-- Before: any authenticated user could read every room's chat, tamper with any
-- room's state/timer/selections, spoof participant rows, or delete any room.
-- After: a user may only act within rooms they are a participant of, may only
-- insert/modify their OWN participant row, and may only create rooms as themselves.
--
-- Note: SELECT on rooms stays open (a joiner must look up a room by its code before
-- becoming a member); room rows expose only code/state/timestamps, nothing private.
-- ─────────────────────────────────────────────────────────────────────────────

-- helper predicate (inline EXISTS): is auth.uid() a participant of <room_id>?
-- (participants SELECT remains open, so no policy recursion.)

-- ── rooms ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth rooms" ON muendlich_rooms;
CREATE POLICY "rooms select" ON muendlich_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms insert" ON muendlich_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "rooms update" ON muendlich_rooms FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM muendlich_participants p WHERE p.room_id = muendlich_rooms.id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM muendlich_participants p WHERE p.room_id = muendlich_rooms.id AND p.user_id = auth.uid()));
CREATE POLICY "rooms delete" ON muendlich_rooms FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ── participants ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth participants" ON muendlich_participants;
CREATE POLICY "participants select" ON muendlich_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "participants insert own" ON muendlich_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants update own" ON muendlich_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants delete own" ON muendlich_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── selections (members only) ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth selections" ON muendlich_selections;
CREATE POLICY "selections member" ON muendlich_selections FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM muendlich_participants p WHERE p.room_id = muendlich_selections.room_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM muendlich_participants p WHERE p.room_id = muendlich_selections.room_id AND p.user_id = auth.uid()));

-- ── chat (members only; can only post as self) ────────────────────────────────
DROP POLICY IF EXISTS "auth chat" ON muendlich_chat;
CREATE POLICY "chat select member" ON muendlich_chat FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM muendlich_participants p WHERE p.room_id = muendlich_chat.room_id AND p.user_id = auth.uid()));
CREATE POLICY "chat insert member" ON muendlich_chat FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM muendlich_participants p WHERE p.room_id = muendlich_chat.room_id AND p.user_id = auth.uid()));
