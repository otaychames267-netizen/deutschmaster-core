-- muendlich_voice_assignments — persists which ElevenLabs voice was
-- assigned to each Mündlich exam session's AI examiner, keyed on the exam
-- SESSION (muendlich_exam_sessions.id), not the raw user — the examiner is
-- one shared persona both candidates in a room hear, and the product
-- requirement is explicitly "stable within a session, free to rotate
-- between sessions" (see muendlich-relay/src/voice/voiceManager.ts's header
-- comment for the full reasoning). Written/read exclusively by the relay's
-- service-role Supabase client (same pattern as auth_email_log/d17_alerts),
-- never touched by the browser client.
create table if not exists public.muendlich_voice_assignments (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  character_id text not null default 'examiner',
  voice_id text not null,
  assigned_at timestamptz not null default now(),
  unique (session_key, character_id)
);

-- Powers VoiceManager.getUsageCounts()'s recency-windowed load-balancing —
-- "most recent 500 assignments for these voice ids" needs voice_id lookups
-- ordered by assigned_at, which this composite index serves directly.
create index if not exists muendlich_voice_assignments_voice_recency_idx
  on public.muendlich_voice_assignments (voice_id, assigned_at desc);

alter table public.muendlich_voice_assignments enable row level security;

create policy "muendlich_voice_assignments_service_role_all" on public.muendlich_voice_assignments
  for all to service_role using (true) with check (true);
