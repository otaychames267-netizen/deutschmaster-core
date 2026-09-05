-- muendlich_elevenlabs_usage — insert-only ledger of ElevenLabs credit
-- consumption for the Claude+ElevenLabs Mündlich voice backend, kept
-- entirely separate from the existing minutes-based muendlich_credits
-- system (deduct_muendlich_minutes_dual) rather than replacing it — this
-- is a new, additive safety net specific to this backend's real vendor
-- economics (ElevenLabs bills in characters/minutes, not exam-minutes),
-- not a redesign of the existing entitlement model.
--
-- One row per participant per exam session (both candidates in a room are
-- charged the same session usage, mirroring deduct_muendlich_minutes_dual's
-- existing "dual" pattern — each candidate's own 60,000-credit allowance is
-- debited for their participation in a session, not split between them).
create table if not exists public.muendlich_elevenlabs_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key text not null, -- muendlich_exam_sessions.id
  tts_characters int not null default 0,
  stt_minutes numeric not null default 0,
  tts_credits numeric not null default 0,
  stt_credits numeric not null default 0,
  total_credits numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, session_key)
);

create index if not exists muendlich_elevenlabs_usage_user_idx
  on public.muendlich_elevenlabs_usage (user_id);

alter table public.muendlich_elevenlabs_usage enable row level security;

create policy "muendlich_elevenlabs_usage_service_role_all" on public.muendlich_elevenlabs_usage
  for all to service_role using (true) with check (true);

-- Sum of a user's total_credits across all sessions — the single source of
-- truth the pre-flight and mid-exam hard-cap checks both read from.
-- SECURITY DEFINER so the relay's user-scoped client (not just the
-- service-role admin client) can call it too if ever needed, without
-- granting broader table access.
create or replace function public.get_muendlich_elevenlabs_credits_used(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(total_credits), 0)
  from public.muendlich_elevenlabs_usage
  where user_id = p_user_id;
$$;
