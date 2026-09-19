-- Owner-reported bug (2026-09-19): the "Themen, die in Tunesien noch nie
-- vorgekommen sind" topics (muendlich_materials.is_unassigned_center = true)
-- are visibly listed with a title/preview/badge to every catalog viewer, but
-- clicking "Thema öffnen" shows the paywall/subscribe screen even to an
-- already-active subscriber. Root cause: the SELECT RLS policy added in
-- 20260810100000_muendlich_unassigned_row_level_rls.sql required
-- `is_unassigned_center = false` in the plan-access branch, so a paying
-- subscriber's row fetch legitimately returned nothing for these topics and
-- the UI's "no row => show paywall" fallback fired — indistinguishable from
-- lacking a subscription at all.
--
-- These topics were never meant to be admin-only preview content — the
-- catalog already surfaces their full title, level, category and Person A/B
-- preview text to every viewer via get_muendlich_catalog, labelled with an
-- informational (not a lock) notice that they haven't appeared in a Tunisian
-- exam center yet. Fix: any user with active plan access (any plan_code,
-- matching how every other row in this table already behaves) can read the
-- full row regardless of is_unassigned_center. No content changes; the
-- informational notice and badge stay as-is.

drop policy if exists "auth read materials" on public.muendlich_materials;
create policy "auth read materials" on public.muendlich_materials
  for select using (
    public.has_plan_access(auth.uid(), 'muendlich')
    or public.has_role(auth.uid(), 'admin')
    or public.is_d17_staff(auth.uid())
  );
