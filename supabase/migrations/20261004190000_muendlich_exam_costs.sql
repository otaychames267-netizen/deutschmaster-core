-- Real per-exam cost record for the Mündlich exam room.
--
-- One row per exam session, written by the relay (service role) when the room
-- ends: the MEASURED usage of every paid vendor (ElevenLabs TTS characters,
-- Groq billed seconds / ElevenLabs STT minutes, Claude tokens for the examiner
-- and for the evaluation) and the dollar cost computed from it at the vendors'
-- published rates. Replaces "cost per exam" being an estimate from simulations.
--
-- Not user-facing: RLS is enabled with NO policies, so only the service role
-- (the relay, admin SQL) can read or write it.

create table if not exists public.muendlich_exam_costs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.muendlich_exam_sessions(id) on delete cascade,
  room_id uuid,
  end_reason text,
  duration_seconds integer,

  tts_characters integer not null default 0,

  stt_provider text,                          -- groq | elevenlabs | groq+elevenlabs_failover
  stt_forwarded_minutes numeric(10,3),        -- raw audio minutes forwarded to STT (both candidates)
  groq_requests integer,
  groq_billed_seconds numeric(10,1),          -- Groq bills each request for >= 10s
  elevenlabs_stt_minutes numeric(10,3),

  examiner_model text,
  examiner_input_tokens integer not null default 0,
  examiner_output_tokens integer not null default 0,
  examiner_cache_write_tokens integer not null default 0,
  examiner_cache_read_tokens integer not null default 0,

  evaluator_model text,
  evaluator_input_tokens integer not null default 0,
  evaluator_output_tokens integer not null default 0,
  evaluator_cache_write_tokens integer not null default 0,
  evaluator_cache_read_tokens integer not null default 0,

  usd_tts numeric(10,5) not null default 0,
  usd_stt numeric(10,5) not null default 0,
  usd_examiner numeric(10,5) not null default 0,
  usd_evaluator numeric(10,5) not null default 0,
  usd_total numeric(10,5) not null default 0,

  created_at timestamptz not null default now()
);

alter table public.muendlich_exam_costs enable row level security;

comment on table public.muendlich_exam_costs is
  'Measured per-exam vendor usage and USD cost (service-role only). usd_* use the vendors'' published rates; usage numbers are measured.';
