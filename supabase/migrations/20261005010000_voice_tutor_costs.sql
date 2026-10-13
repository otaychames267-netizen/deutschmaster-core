-- Measured per-session cost record for the 1:1 AI Voice Tutor (same idea and
-- columns as muendlich_exam_costs for the 2-candidate room): the relay writes the
-- MEASURED vendor usage and USD cost when the tutor session ends. Service-role only
-- (RLS on, no policies). evaluator_* stay 0 here — the tutor's correction pass runs
-- in the main app (api.muendlich.tutor-correction), not in the relay.
create table if not exists public.voice_tutor_costs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.voice_tutor_sessions(id) on delete cascade,
  room_id uuid,
  end_reason text,
  duration_seconds integer,
  tts_characters integer not null default 0,
  stt_provider text,
  stt_forwarded_minutes numeric(10,3),
  groq_requests integer,
  groq_billed_seconds numeric(10,1),
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
alter table public.voice_tutor_costs enable row level security;
