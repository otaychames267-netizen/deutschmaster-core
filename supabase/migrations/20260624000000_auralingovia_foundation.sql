-- ============================================================
-- AuraLingovia Foundation Schema
-- Complete clean rebuild — all previous tables dropped first
-- ============================================================

-- Drop old tables in dependency order (if they exist)
drop table if exists public.pdf_import_logs cascade;
drop table if exists public.pdf_import_results cascade;
drop table if exists public.pdf_import_jobs cascade;
drop table if exists public.pdf_imports cascade;
drop table if exists public.attempt_answers cascade;
drop table if exists public.attempt_results cascade;
drop table if exists public.attempt_sessions cascade;
drop table if exists public.answer_keys cascade;
drop table if exists public.exam_items cascade;
drop table if exists public.audio_files cascade;
drop table if exists public.exams cascade;
drop table if exists public.referral_rewards cascade;
drop table if exists public.referrals cascade;
drop table if exists public.notifications cascade;
drop table if exists public.login_history cascade;
drop table if exists public.devices cascade;
drop table if exists public.password_reset_tokens cascade;

-- Drop old tables from previous schema that conflict
drop table if exists public.exercises cascade;
drop table if exists public.exercise_sessions cascade;
drop table if exists public.exercise_attempts cascade;
drop table if exists public.audio_assets cascade;
drop table if exists public.messages cascade;
drop table if exists public.badges cascade;
drop table if exists public.certificates cascade;
drop table if exists public.leaderboard cascade;
drop table if exists public.study_streaks cascade;
drop table if exists public.progress_tracking cascade;
drop table if exists public.vocabulary_notes cascade;

-- Drop old enums (if they exist)
drop type if exists public.exercise_kind cascade;
drop type if exists public.import_status cascade;
drop type if exists public.attempt_status cascade;
drop type if exists public.exam_section cascade;

-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'student');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_level') then
    create type public.user_level as enum ('TELC_B1', 'TELC_B2');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'plan_code') then
    create type public.plan_code as enum ('schriftlich', 'muendlich', 'komplett');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('trial', 'active', 'expired', 'cancelled', 'suspended');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
  end if;
end $$;

create type public.exam_module   as enum ('schriftlich', 'muendlich');
create type public.exam_section  as enum ('lesen', 'hoeren', 'sprachbausteine', 'schreiben', 'muendlich');
create type public.exam_teil     as enum ('teil_1', 'teil_2', 'teil_3');
create type public.exam_type     as enum ('vorbereitung', 'simulation');
create type public.exam_status   as enum ('draft', 'published', 'archived');
create type public.item_kind     as enum (
  'heading_match',   -- Lesen Teil 1: heading → text matching
  'passage_mcq',     -- Lesen Teil 2: read → A/B/C
  'situation_match', -- Lesen Teil 3: situation → info text
  'gap_fill',        -- Sprachbausteine: fill in the blank
  'listening_mcq',   -- Hören: A/B/C after audio
  'writing_prompt',  -- Schreiben: open response prompt
  'speaking_prompt'  -- Mündlich: speaking card
);
create type public.import_status as enum ('pending', 'processing', 'needs_review', 'approved', 'failed');
create type public.referral_status as enum ('pending', 'converted', 'rejected');

-- ============================================================
-- PROFILES
-- ============================================================

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Ensure all required columns exist
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name') then
    alter table public.profiles add column full_name text;
  end if;
end $$;

-- ============================================================
-- PLANS (upsert to avoid conflicts)
-- ============================================================

insert into public.plans (code, name, description, price_eur, price_tnd, price_usd, active) values
  ('schriftlich', 'Schriftlich', 'Written exam preparation — Lesen, Hören, Sprachbausteine, Schreiben', 6.00, 20.00, 6.50, true),
  ('muendlich',   'Mündlich',   'Oral exam preparation — speaking simulation and practice',              6.00, 20.00, 6.50, true),
  ('komplett',    'Komplett',   'Complete preparation — written + oral, full access',                   12.00, 40.00, 13.00, true)
on conflict (code) do update set
  name        = excluded.name,
  description = excluded.description,
  price_eur   = excluded.price_eur,
  price_tnd   = excluded.price_tnd,
  price_usd   = excluded.price_usd,
  active      = excluded.active,
  updated_at  = now();

-- ============================================================
-- SUBSCRIPTIONS (RLS already set in earlier migration — keep)
-- ============================================================

-- Add Stripe fields if missing
alter table public.subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_price_id        text;

-- ============================================================
-- REFERRALS
-- ============================================================

create table public.referrals (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references auth.users(id) on delete cascade,
  referred_id     uuid not null references auth.users(id) on delete cascade,
  referral_code   text not null,
  status          public.referral_status not null default 'pending',
  converted_at    timestamptz,
  created_at      timestamptz not null default now(),
  constraint no_self_referral check (referrer_id <> referred_id),
  unique (referred_id)  -- one referral per referred user
);

create index on public.referrals(referrer_id);
create index on public.referrals(referral_code);

grant select, insert on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;

create policy "referrals_select_own" on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "referrals_insert_own" on public.referrals for insert to authenticated
  with check (referred_id = auth.uid());

create table public.referral_rewards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  referral_id     uuid references public.referrals(id),
  days_granted    int not null,
  reason          text not null,  -- '1_referral', '5_referrals', '10_referrals'
  applied_at      timestamptz,
  created_at      timestamptz not null default now()
);

grant select on public.referral_rewards to authenticated;
grant all on public.referral_rewards to service_role;
alter table public.referral_rewards enable row level security;

create policy "rewards_select_own" on public.referral_rewards for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- DEVICES & SECURITY
-- ============================================================

create table public.devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  device_name     text,
  user_agent      text,
  ip_address      text,
  last_seen_at    timestamptz not null default now(),
  is_trusted      boolean not null default false,
  created_at      timestamptz not null default now()
);

create index on public.devices(user_id);
grant select, insert, update, delete on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;
create policy "devices_own" on public.devices for all to authenticated using (user_id = auth.uid());

create table public.login_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  ip_address      text,
  user_agent      text,
  success         boolean not null,
  failure_reason  text,
  created_at      timestamptz not null default now()
);

create index on public.login_history(user_id);
grant insert on public.login_history to authenticated;
grant select on public.login_history to authenticated;
grant all on public.login_history to service_role;
alter table public.login_history enable row level security;
create policy "login_history_own" on public.login_history for select to authenticated using (user_id = auth.uid());
create policy "login_history_insert" on public.login_history for insert to authenticated with check (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  body            text not null,
  type            text not null default 'info', -- info | success | warning | error
  read            boolean not null default false,
  action_url      text,
  created_at      timestamptz not null default now()
);

create index on public.notifications(user_id, read);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_own" on public.notifications for all to authenticated using (user_id = auth.uid());

-- ============================================================
-- AUDIO FILES
-- ============================================================

create table public.audio_files (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  storage_path    text not null,  -- Supabase Storage path (private bucket)
  duration_sec    int,
  transcript      text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

grant select on public.audio_files to authenticated;
grant all on public.audio_files to service_role;
alter table public.audio_files enable row level security;
create policy "audio_public_read" on public.audio_files for select to authenticated using (true);
create policy "audio_admin_write" on public.audio_files for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- EXAMS
-- ============================================================

create table public.exams (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  level           public.user_level  not null,
  module          public.exam_module not null,
  section         public.exam_section,             -- null for simulation
  teil            public.exam_teil,                -- null for full-simulation or schreiben
  exam_type       public.exam_type   not null,
  status          public.exam_status not null default 'draft',
  source_pdf_id   uuid,                            -- link to pdf_imports
  display_order   int not null default 0,
  metadata        jsonb not null default '{}',     -- flexible per-section config
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.exams(level, module, section, teil, exam_type, status);
grant select on public.exams to authenticated;
grant all on public.exams to service_role;
alter table public.exams enable row level security;
create policy "exams_published_read" on public.exams for select to authenticated
  using (status = 'published' or public.has_role(auth.uid(), 'admin'));
create policy "exams_admin_write" on public.exams for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- EXAM ITEMS (ordered content blocks within an exam)
-- ============================================================

create table public.exam_items (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams(id) on delete cascade,
  position        int  not null,           -- ordering within exam
  kind            public.item_kind not null,
  content         jsonb not null,          -- structure varies by kind (see docs)
  audio_file_id   uuid references public.audio_files(id),
  points          numeric(5,2) not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.exam_items(exam_id, position);
grant select on public.exam_items to authenticated;
grant all on public.exam_items to service_role;
alter table public.exam_items enable row level security;
create policy "items_read_via_exam" on public.exam_items for select to authenticated
  using (exists (
    select 1 from public.exams e
    where e.id = exam_id
    and (e.status = 'published' or public.has_role(auth.uid(), 'admin'))
  ));
create policy "items_admin_write" on public.exam_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- ANSWER KEYS — service_role ONLY, never exposed to students
-- ============================================================

create table public.answer_keys (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams(id) on delete cascade unique,
  answers         jsonb not null,   -- {"item_id": "correct_answer", ...}
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- NO grant to authenticated — service_role only
grant all on public.answer_keys to service_role;
alter table public.answer_keys enable row level security;
-- No RLS policies for authenticated → no authenticated user can ever read this

-- ============================================================
-- PDF IMPORT ENGINE — 5-stage state machine
-- ============================================================

create table public.pdf_imports (
  id              uuid primary key default gen_random_uuid(),
  filename        text not null,
  storage_path    text not null,    -- private bucket path
  file_size       bigint,
  uploaded_by     uuid not null references auth.users(id),
  status          public.import_status not null default 'pending',
  detected_level  public.user_level,
  detected_module public.exam_module,
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.pdf_imports(status);
grant select, insert on public.pdf_imports to authenticated;
grant all on public.pdf_imports to service_role;
alter table public.pdf_imports enable row level security;
create policy "imports_admin" on public.pdf_imports for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.pdf_import_jobs (
  id              uuid primary key default gen_random_uuid(),
  import_id       uuid not null references public.pdf_imports(id) on delete cascade,
  stage           text not null,  -- 'extract' | 'structure' | 'solutions' | 'validate'
  status          public.import_status not null default 'pending',
  started_at      timestamptz,
  completed_at    timestamptz,
  error_message   text,
  created_at      timestamptz not null default now()
);

grant select on public.pdf_import_jobs to authenticated;
grant all on public.pdf_import_jobs to service_role;
alter table public.pdf_import_jobs enable row level security;
create policy "import_jobs_admin" on public.pdf_import_jobs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table public.pdf_import_logs (
  id              uuid primary key default gen_random_uuid(),
  import_id       uuid not null references public.pdf_imports(id) on delete cascade,
  level           text not null default 'info',  -- 'info' | 'warn' | 'error'
  message         text not null,
  context         jsonb,
  created_at      timestamptz not null default now()
);

create index on public.pdf_import_logs(import_id);
grant select on public.pdf_import_logs to authenticated;
grant all on public.pdf_import_logs to service_role;
alter table public.pdf_import_logs enable row level security;
create policy "import_logs_admin" on public.pdf_import_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table public.pdf_import_results (
  id              uuid primary key default gen_random_uuid(),
  import_id       uuid not null references public.pdf_imports(id) on delete cascade,
  extracted_exams jsonb not null default '[]',   -- raw extracted content (pre-review)
  extracted_keys  jsonb not null default '{}',   -- raw answer keys (pre-review)
  reviewer_notes  text,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

grant select on public.pdf_import_results to authenticated;
grant all on public.pdf_import_results to service_role;
alter table public.pdf_import_results enable row level security;
create policy "import_results_admin" on public.pdf_import_results for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- ATTEMPT SESSIONS (exam attempts)
-- ============================================================

create table public.attempt_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  exam_id         uuid not null references public.exams(id),
  status          text not null default 'in_progress',  -- in_progress | submitted | expired
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  expires_at      timestamptz,
  time_spent_sec  int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.attempt_sessions(user_id, exam_id);
grant select, insert, update on public.attempt_sessions to authenticated;
grant all on public.attempt_sessions to service_role;
alter table public.attempt_sessions enable row level security;
create policy "attempts_own" on public.attempt_sessions for all to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.attempt_answers (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.attempt_sessions(id) on delete cascade,
  item_id         uuid not null references public.exam_items(id),
  answer          jsonb not null,   -- student's answer (format varies by item kind)
  saved_at        timestamptz not null default now(),
  unique (session_id, item_id)
);

create index on public.attempt_answers(session_id);
grant select, insert, update on public.attempt_answers to authenticated;
grant all on public.attempt_answers to service_role;
alter table public.attempt_answers enable row level security;
create policy "answers_own" on public.attempt_answers for all to authenticated
  using (exists (
    select 1 from public.attempt_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create table public.attempt_results (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.attempt_sessions(id) on delete cascade unique,
  user_id         uuid not null references auth.users(id) on delete cascade,
  exam_id         uuid not null references public.exams(id),
  score           numeric(5,2),       -- percentage 0-100
  points_earned   numeric(8,2),
  points_total    numeric(8,2),
  section_scores  jsonb,              -- breakdown by section
  passed          boolean,
  scored_at       timestamptz not null default now()
);

create index on public.attempt_results(user_id);
grant select on public.attempt_results to authenticated;
grant all on public.attempt_results to service_role;
alter table public.attempt_results enable row level security;
create policy "results_own" on public.attempt_results for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SUBSCRIPTION GATE FUNCTION
-- Returns true if user has an active (or trial) subscription
-- that covers the requested plan. Used in RLS where needed.
-- ============================================================

create or replace function public.has_active_subscription(_user_id uuid, _plan public.plan_code default null)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = _user_id
      and s.status in ('active', 'trial')
      and s.expires_at > now()
      and (_plan is null
           or s.plan_code = _plan
           or s.plan_code = 'komplett'
           or (_plan = 'schriftlich' and s.plan_code = 'schriftlich')
           or (_plan = 'muendlich'   and s.plan_code = 'muendlich'))
  )
$$;

-- ============================================================
-- REFERRAL CODE GENERATION
-- ============================================================

create or replace function public.generate_referral_code(_user_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  _code text;
begin
  _code := upper(substring(replace(_user_id::text, '-', ''), 1, 8));
  return _code;
end;
$$;

-- ============================================================
-- PAYMENT HISTORY (audit trail)
-- ============================================================

create table if not exists public.payment_history (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  subscription_id       uuid references public.subscriptions(id),
  amount_eur            numeric(10,2),
  stripe_payment_intent text,
  stripe_invoice_id     text,
  status                public.payment_status not null default 'pending',
  created_at            timestamptz not null default now()
);

create index on public.payment_history(user_id);
grant select on public.payment_history to authenticated;
grant all on public.payment_history to service_role;
alter table public.payment_history enable row level security;
create policy "payments_own" on public.payment_history for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
