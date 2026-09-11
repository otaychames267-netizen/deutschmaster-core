-- Closes a real gap found during live RBAC verification: the muendlich_materials
-- SELECT policy only checked plan access, not is_unassigned_center. Any
-- authenticated user with 'muendlich' plan access could read the full row data
-- (title, body_text, speaking_toolbox) for topics not yet introduced in any
-- exam center — the UI hid them via a client-side filter, but a raw REST/API
-- call bypassed that entirely. Verified live: a real non-admin test account
-- signed in and queried all 53 Teil3 rows including the 17 flagged ones.
--
-- This moves the restriction to the actual security boundary (RLS), matching
-- the pattern already used for the muendlich-pdfs storage split: admins and
-- D17 staff keep full read access; everyone else with plan access only sees
-- rows where is_unassigned_center is false.

drop policy if exists "auth read materials" on public.muendlich_materials;
create policy "auth read materials" on public.muendlich_materials
  for select using (
    (public.has_plan_access(auth.uid(), 'muendlich') and is_unassigned_center = false)
    or public.has_role(auth.uid(), 'admin')
    or public.is_d17_staff(auth.uid())
  );
