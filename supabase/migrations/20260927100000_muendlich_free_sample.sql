-- Mündlich free-trial teaser (2026-09-27): mirrors the existing Schriftlich
-- "free-sample" gate (20260728010000_freemium_samples_and_sim_trial.sql)
-- so non-subscribed visitors can try a handful of Teil 2/Teil 3 topics in
-- full, not just browse titles via get_muendlich_catalog's always-open grid.

alter table public.muendlich_materials
  add column if not exists is_free_sample boolean not null default false;

-- Additive permissive policy — Postgres ORs multiple permissive SELECT
-- policies together, so this only ever WIDENS access on top of the existing
-- has_plan_access-gated "auth read materials" policy
-- (20260919120000_fix_muendlich_unassigned_center_paywall.sql), exactly the
-- same non-destructive pattern the Schriftlich free-sample policies use.
drop policy if exists "free sample read muendlich_materials" on public.muendlich_materials;
create policy "free sample read muendlich_materials" on public.muendlich_materials
  for select using (is_free_sample = true);

-- Surface the flag in the browsable catalog so the frontend can badge these
-- cards, matching how is_free_sample already flows through
-- get_exercise_catalog for Schriftlich.
drop function if exists public.get_muendlich_catalog(integer, text);

create function public.get_muendlich_catalog(p_teil integer, p_level text)
returns table (
  id uuid, title text, theme_category text, difficulty_level text,
  is_unassigned_center boolean, body_text text, is_free_sample boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.title, m.theme_category, m.difficulty_level, m.is_unassigned_center, m.body_text, m.is_free_sample
  from public.muendlich_materials m
  where m.teil = p_teil and m.level = p_level and m.category = 'themen'
  order by m.is_unassigned_center, m.title;
$$;

grant execute on function public.get_muendlich_catalog(integer, text) to anon, authenticated;
