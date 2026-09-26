-- muendlich_rooms / muendlich_participants INSERT policies only checked
-- ownership (created_by = auth.uid() / user_id = auth.uid()), never plan
-- access — the 20260716020000 gating pass only updated the SELECT policies
-- for these two tables. Any authenticated non-subscriber could therefore
-- insert directly (bypassing src/lib/muendlich/room.ts's client-side
-- has_plan_access check) and create a room / register as a participant,
-- even though they could never read the room content or spend real exam
-- minutes (both already independently plan-gated). Closes the gap so every
-- write path is consistent with every other table in this system.

DROP POLICY IF EXISTS "rooms insert" ON public.muendlich_rooms;
CREATE POLICY "rooms insert" ON public.muendlich_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.has_plan_access(auth.uid(), 'muendlich') OR public.is_d17_staff(auth.uid())));

DROP POLICY IF EXISTS "participants insert own" ON public.muendlich_participants;
CREATE POLICY "participants insert own" ON public.muendlich_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.has_plan_access(auth.uid(), 'muendlich') OR public.is_d17_staff(auth.uid())));
