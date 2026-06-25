-- ============================================================
-- FILE: 20260601192705_f977dc90-008c-4276-be73-24f90fabf7e4.sql
-- ============================================================

-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'student');
create type public.user_level as enum ('TELC_B1', 'TELC_B2');
create type public.plan_code as enum ('schriftlich', 'muendlich', 'premium');
create type public.subscription_status as enum ('trial', 'active', 'expired', 'cancelled', 'suspended');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  country text,
  preferred_language text not null default 'en',
  level public.user_level,
  target_level public.user_level,
  exam_date date,
  study_goal text,
  suspended boolean not null default false,
  two_fa_enabled boolean not null default false,
  two_fa_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ============ POLICIES profiles ============
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- ============ POLICIES user_roles ============
create policy "user_roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============ PLANS ============
create table public.plans (
  code public.plan_code primary key,
  name text not null,
  description text,
  price_eur numeric(10,2) not null,
  price_tnd numeric(10,2) not null,
  price_usd numeric(10,2) not null,
  stripe_price_id text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "plans_public_read" on public.plans for select to anon, authenticated using (active = true or public.has_role(auth.uid(),'admin'));
create policy "plans_admin_write" on public.plans for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.plans (code, name, description, price_eur, price_tnd, price_usd) values
  ('schriftlich','Schriftlich','Written exam preparation',6.00,20.00,6.50),
  ('muendlich','Mündlich','Oral exam preparation',6.00,20.00,6.50),
  ('premium','Premium Complete','Full written + oral preparation',12.00,40.00,13.00);

-- ============ SUBSCRIPTIONS ============
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code public.plan_code not null references public.plans(code),
  status public.subscription_status not null default 'trial',
  is_trial boolean not null default false,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  cancelled_at timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "subs_select_own_or_admin" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "subs_admin_write" on public.subscriptions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index on public.subscriptions(user_id);
create index on public.subscriptions(status);

-- ============ TRIAL CLAIMS (anti-abuse) ============
create table public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  device_fingerprint text,
  ip_address text,
  claimed_at timestamptz not null default now()
);
create index on public.trial_claims(email);
create index on public.trial_claims(device_fingerprint);
grant select, insert on public.trial_claims to authenticated;
grant all on public.trial_claims to service_role;
alter table public.trial_claims enable row level security;
create policy "trial_claims_select_own_or_admin" on public.trial_claims for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "trial_claims_insert_self" on public.trial_claims for insert to authenticated
  with check (user_id = auth.uid());

-- ============ PAYMENTS ============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  status public.payment_status not null default 'pending',
  provider text not null default 'stripe',
  provider_payment_id text,
  description text,
  created_at timestamptz not null default now()
);
grant select, insert on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments_select_own_or_admin" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create index on public.payments(user_id);

-- ============ INVOICES ============
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  invoice_number text not null unique,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  pdf_url text,
  issued_at timestamptz not null default now()
);
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "invoices_select_own_or_admin" on public.invoices for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif_select_own" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "notif_update_own" on public.notifications for update to authenticated
  using (user_id = auth.uid());
create index on public.notifications(user_id, read);

-- ============ LOGIN HISTORY + DEVICES ============
create table public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  success boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert on public.login_history to authenticated;
grant all on public.login_history to service_role;
alter table public.login_history enable row level security;
create policy "login_hist_own" on public.login_history for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "login_hist_insert_own" on public.login_history for insert to authenticated
  with check (user_id = auth.uid());

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_fingerprint text not null,
  device_name text,
  last_seen timestamptz not null default now(),
  trusted boolean not null default false,
  unique(user_id, device_fingerprint)
);
grant select, insert, update, delete on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;
create policy "devices_own" on public.devices for all to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid());

-- ============ PLACEHOLDER TABLES FOR FUTURE PHASES ============
create table public.reading_models (
  id uuid primary key default gen_random_uuid(),
  level public.user_level not null,
  title text not null,
  content jsonb,
  created_at timestamptz not null default now()
);
create table public.listening_models (
  id uuid primary key default gen_random_uuid(),
  level public.user_level not null,
  title text not null,
  audio_url text,
  content jsonb,
  created_at timestamptz not null default now()
);
create table public.writing_topics (
  id uuid primary key default gen_random_uuid(),
  level public.user_level not null,
  title text not null,
  prompt text,
  created_at timestamptz not null default now()
);
create table public.speaking_topics (
  id uuid primary key default gen_random_uuid(),
  level public.user_level not null,
  title text not null,
  prompt text,
  created_at timestamptz not null default now()
);
create table public.pdf_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  level public.user_level,
  created_at timestamptz not null default now()
);
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level public.user_level not null,
  issued_at timestamptz not null default now(),
  pdf_url text
);
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level public.user_level,
  created_at timestamptz not null default now()
);
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  awarded_at timestamptz not null default now()
);

-- Grants + RLS for placeholders (locked: admin-only writes, owner reads where applicable)
do $$ declare t text;
begin
  for t in select unnest(array[
    'reading_models','listening_models','writing_topics','speaking_topics','pdf_files',
    'certificates','referrals','support_tickets','ratings','challenges','badges'
  ]) loop
    execute format('grant select on public.%I to authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "%s_admin_all" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''));', t, t);
  end loop;
end $$;

-- Owner read for personal placeholder tables
create policy "certs_owner_read" on public.certificates for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "referrals_owner_read" on public.referrals for select to authenticated using (referrer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "tickets_owner_all" on public.support_tickets for all to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid());
create policy "ratings_owner_all" on public.ratings for all to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid());
create policy "badges_owner_read" on public.badges for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "content_read_authenticated" on public.reading_models for select to authenticated using (true);
create policy "listening_read_authenticated" on public.listening_models for select to authenticated using (true);
create policy "writing_read_authenticated" on public.writing_topics for select to authenticated using (true);
create policy "speaking_read_authenticated" on public.speaking_topics for select to authenticated using (true);
create policy "pdfs_read_authenticated" on public.pdf_files for select to authenticated using (true);
create policy "challenges_read_authenticated" on public.challenges for select to authenticated using (true);

-- ============ TRIGGERS ============
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger subs_updated_at before update on public.subscriptions for each row execute function public.handle_updated_at();
create trigger plans_updated_at before update on public.plans for each row execute function public.handle_updated_at();

-- Auto-create profile + student role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, preferred_language)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'preferred_language','en'));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  insert into public.notifications (user_id, title, body, type)
  values (new.id, 'Welcome to DeutschMaster', 'Start your free 3-day trial and prepare for your TELC exam.', 'welcome');
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- ============================================================
-- FILE: 20260601192721_3919f957-b36c-40c5-8670-46eab451b987.sql
-- ============================================================

alter function public.handle_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;

revoke execute on function public.handle_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
-- has_role must stay executable by authenticated for RLS policies that call it
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- ============================================================
-- FILE: 20260602041848_bfbc63ed-1d94-47be-b045-4b9ee1c3ade2.sql
-- ============================================================

-- 1) Anti-abuse: one trial per email
CREATE UNIQUE INDEX IF NOT EXISTS trial_claims_email_unique ON public.trial_claims (lower(email));

-- 2) Extend handle_new_user to auto-create 3-day trial + trial_claim
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_already_used boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, preferred_language)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'preferred_language','en'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student')
  ON CONFLICT DO NOTHING;

  -- Check if this email already claimed a trial before
  SELECT EXISTS(SELECT 1 FROM public.trial_claims WHERE lower(email) = lower(new.email)) INTO trial_already_used;

  IF NOT trial_already_used THEN
    INSERT INTO public.trial_claims (user_id, email)
    VALUES (new.id, new.email);

    INSERT INTO public.subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
    VALUES (new.id, 'premium', 'trial', true, now(), now() + interval '3 days');

    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Welcome to DeutschMaster', 'Your 3-day free trial is now active. Explore all features!', 'welcome');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Welcome back to DeutschMaster', 'Your free trial has already been used. Subscribe to continue learning.', 'info');
  END IF;

  RETURN new;
END $$;

-- 3) Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Function to mark expired trials/subscriptions as expired (safe to call from any authenticated user; only updates own rows via RLS-bypassing definer)
CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status IN ('active', 'trial') AND expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO authenticated;

-- 5) Allow users to insert their own device rows (policy "devices_own" is ALL but with_check only allows own — already fine; add explicit INSERT just in case some clients send PUT)
-- Already covered by devices_own ALL policy.

-- 6) Helpful index for notifications listing
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

-- 7) Helpful index for login_history listing
CREATE INDEX IF NOT EXISTS login_history_user_created_idx ON public.login_history (user_id, created_at DESC);

-- 8) Allow service_role / admin to insert notifications (for admin broadcast)
DROP POLICY IF EXISTS notif_admin_insert ON public.notifications;
CREATE POLICY notif_admin_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================
-- FILE: 20260602041903_0b91abc4-424f-41a1-b44a-6ac4ca5788c1.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

-- ============================================================
-- FILE: 20260603044412_7bba72a7-8c56-47e0-9ea0-369e088ecc5d.sql
-- ============================================================

-- Contact messages from public landing page
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_messages_insert_public ON public.contact_messages
  FOR INSERT TO anon, authenticated WITH CHECK (
    length(name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 320
    AND length(message) BETWEEN 1 AND 5000
  );

CREATE POLICY contact_messages_admin_select ON public.contact_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY contact_messages_admin_update ON public.contact_messages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Onboarding flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- ============================================================
-- FILE: 20260605055859_f33c27a2-7f89-4563-bbc0-a10b23d89ea3.sql
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT, INSERT ON public.trial_claims TO authenticated;
GRANT ALL ON public.trial_claims TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;

GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

GRANT SELECT ON public.reading_models TO authenticated;
GRANT ALL ON public.reading_models TO service_role;

GRANT SELECT ON public.listening_models TO authenticated;
GRANT ALL ON public.listening_models TO service_role;

GRANT SELECT ON public.writing_topics TO authenticated;
GRANT ALL ON public.writing_topics TO service_role;

GRANT SELECT ON public.speaking_topics TO authenticated;
GRANT ALL ON public.speaking_topics TO service_role;

GRANT SELECT ON public.pdf_files TO authenticated;
GRANT ALL ON public.pdf_files TO service_role;

GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;

GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO authenticated, service_role;
-- ============================================================
-- FILE: 20260605055939_46d73e27-72be-4f19-a898-14b7deeaff20.sql
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO service_role;
-- ============================================================
-- FILE: 20260605060138_866ee667-e188-4638-9d98-cac982e14c9f.sql
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
-- ============================================================
-- FILE: 20260605060217_05620b55-7fa7-441a-ae8c-b48aaa65c190.sql
-- ============================================================
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
-- ============================================================
-- FILE: 20260605060318_de04c1ef-925f-47f6-9774-162eb627a7ce.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DO $$
DECLARE
  policy_record record;
  new_qual text;
  new_check text;
  statement text;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ILIKE '%has_role%' OR with_check ILIKE '%has_role%')
  LOOP
    new_qual := CASE WHEN policy_record.qual IS NULL THEN NULL ELSE replace(policy_record.qual, 'has_role(', 'private.has_role(') END;
    new_check := CASE WHEN policy_record.with_check IS NULL THEN NULL ELSE replace(policy_record.with_check, 'has_role(', 'private.has_role(') END;

    statement := format('ALTER POLICY %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);

    IF new_qual IS NOT NULL THEN
      statement := statement || format(' USING (%s)', new_qual);
    END IF;

    IF new_check IS NOT NULL THEN
      statement := statement || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE statement;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
-- ============================================================
-- FILE: 20260615131617_5eb1a5c1-d925-4c00-beb7-c00cfad94ffb.sql
-- ============================================================

-- Enums
CREATE TYPE public.exercise_level AS ENUM ('b1','b2');
CREATE TYPE public.exercise_module AS ENUM ('lesen','sprachbausteine','hoeren','schreiben','muendlich');
CREATE TYPE public.exercise_kind AS ENUM ('multiple_choice','true_false','matching','cloze','open_text');
CREATE TYPE public.exercise_status AS ENUM ('draft','published','hidden');

-- Audio assets
CREATE TABLE public.audio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  duration_seconds integer,
  transcript text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_assets TO authenticated;
GRANT ALL ON public.audio_assets TO service_role;
ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY audio_admin_all ON public.audio_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY audio_read_all ON public.audio_assets FOR SELECT TO authenticated USING (true);
CREATE TRIGGER audio_assets_updated_at BEFORE UPDATE ON public.audio_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Exercises (question bank)
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.exercise_level NOT NULL,
  module public.exercise_module NOT NULL,
  teil smallint NOT NULL CHECK (teil BETWEEN 1 AND 5),
  position smallint NOT NULL DEFAULT 1,
  title text NOT NULL,
  prompt text NOT NULL,
  passage text,
  audio_id uuid REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  kind public.exercise_kind NOT NULL DEFAULT 'multiple_choice',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text,
  status public.exercise_status NOT NULL DEFAULT 'draft',
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exercises_lookup_idx ON public.exercises (level, module, teil, position);
CREATE INDEX exercises_status_idx ON public.exercises (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercises_admin_all ON public.exercises FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY exercises_published_read ON public.exercises FOR SELECT TO authenticated
  USING (status = 'published');
CREATE TRIGGER exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Attempts
CREATE TABLE public.user_exercise_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  answer jsonb,
  score smallint CHECK (score BETWEEN 0 AND 100),
  is_correct boolean,
  duration_seconds integer,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX uea_user_idx ON public.user_exercise_attempts (user_id, completed_at DESC);
CREATE INDEX uea_exercise_idx ON public.user_exercise_attempts (exercise_id);
GRANT SELECT, INSERT ON public.user_exercise_attempts TO authenticated;
GRANT ALL ON public.user_exercise_attempts TO service_role;
ALTER TABLE public.user_exercise_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY uea_insert_own ON public.user_exercise_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY uea_select_own_or_admin ON public.user_exercise_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Grant admin to user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE email = 'otaychames267@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- FILE: 20260615131637_7ecef461-2d6c-47f2-82e9-30c203b629f4.sql
-- ============================================================

CREATE POLICY "audio_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio');
CREATE POLICY "audio_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "audio_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "audio_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio' AND public.has_role(auth.uid(),'admin'));

-- ============================================================
-- FILE: 20260615135117_1399aeba-d8be-432c-831d-ba4bac2b8c73.sql
-- ============================================================
-- Exam mode tables
CREATE TYPE exam_mode AS ENUM ('schriftlich','muendlich');
CREATE TYPE exam_status AS ENUM ('in_progress','submitted','expired');

CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level exercise_level NOT NULL,
  mode exam_mode NOT NULL,
  exercise_ids uuid[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  submitted_at timestamptz,
  score_total numeric,
  score_breakdown jsonb,
  status exam_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.exam_sessions TO authenticated;
GRANT ALL ON public.exam_sessions TO service_role;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam sessions" ON public.exam_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read all exam sessions" ON public.exam_sessions
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER exam_sessions_updated_at BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- link attempts to exam session + open-text review flag
ALTER TABLE public.user_exercise_attempts
  ADD COLUMN exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
  ADD COLUMN needs_review boolean NOT NULL DEFAULT false;

-- pdf import staging
CREATE TABLE public.pdf_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_name text,
  status text NOT NULL DEFAULT 'pending',
  extracted_text text,
  extracted_candidates jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_imports TO authenticated;
GRANT ALL ON public.pdf_imports TO service_role;
ALTER TABLE public.pdf_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage pdf imports" ON public.pdf_imports
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER pdf_imports_updated_at BEFORE UPDATE ON public.pdf_imports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- ============================================================
-- FILE: 20260615140144_765228be-9ad4-4b7f-8906-bc7aa1f38f1a.sql
-- ============================================================
CREATE POLICY "admin pdf-imports rw" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'pdf-imports' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'pdf-imports' AND public.has_role(auth.uid(), 'admin'));
-- ============================================================
-- FILE: 20260615142459_e1775936-6ffe-431b-adaf-d14d52512cc8.sql
-- ============================================================

-- Ensure has_role is callable by app roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- Update handle_new_user notification text to Lingovia
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trial_already_used boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, preferred_language)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'preferred_language','en'))
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    preferred_language = coalesce(public.profiles.preferred_language, excluded.preferred_language);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student')
  ON CONFLICT DO NOTHING;

  SELECT EXISTS(
    SELECT 1 FROM public.trial_claims
    WHERE lower(email) = lower(new.email) AND user_id <> new.id
  ) INTO trial_already_used;

  IF NOT trial_already_used THEN
    INSERT INTO public.trial_claims (user_id, email)
    VALUES (new.id, new.email)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
    SELECT new.id, 'premium', 'trial', true, now(), now() + interval '3 days'
    WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = new.id);

    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Free trial active', 'Your 3-day free trial is now active. Start with Schriftlich or Mündlich from your dashboard.', 'trial');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Welcome back to Lingovia', 'Your free trial has already been used. Subscribe to continue learning.', 'info');
  END IF;

  RETURN new;
END
$function$;

-- Rewrite any legacy DeutschMaster notifications already in the DB
UPDATE public.notifications
SET title = REPLACE(REPLACE(title, 'DeutschMaster Core', 'Lingovia'), 'DeutschMaster', 'Lingovia'),
    body  = REPLACE(REPLACE(body,  'DeutschMaster Core', 'Lingovia'), 'DeutschMaster', 'Lingovia')
WHERE title ILIKE '%deutschmaster%' OR body ILIKE '%deutschmaster%';

-- ============================================================
-- FILE: 20260616074049_11a6ab1b-bcab-493e-af03-02ef3b7fd139.sql
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
-- ============================================================
-- FILE: 20260616074146_e0d095fe-8457-48ec-b10b-31a848845685.sql
-- ============================================================

-- Seed super admin
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'otaychames267@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Extend pdf_imports
ALTER TABLE public.pdf_imports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'exam',
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS linked_import_id uuid REFERENCES public.pdf_imports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ocr_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.pdf_imports DROP CONSTRAINT IF EXISTS pdf_imports_kind_check;
ALTER TABLE public.pdf_imports ADD CONSTRAINT pdf_imports_kind_check CHECK (kind IN ('exam','answer_key'));

-- Extend exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS source_pdf_import_id uuid REFERENCES public.pdf_imports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_numbering text;

-- Extend attempts
ALTER TABLE public.user_exercise_attempts
  ADD COLUMN IF NOT EXISTS regraded_at timestamptz,
  ADD COLUMN IF NOT EXISTS key_version int;

-- pdf_extractions
CREATE TABLE IF NOT EXISTS public.pdf_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.pdf_imports(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_text text,
  page_count int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pdf_extractions_import_idx ON public.pdf_extractions(import_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_extractions TO authenticated;
GRANT ALL ON public.pdf_extractions TO service_role;
ALTER TABLE public.pdf_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_extractions admin read" ON public.pdf_extractions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "pdf_extractions super admin write" ON public.pdf_extractions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP TRIGGER IF EXISTS pdf_extractions_updated_at ON public.pdf_extractions;
CREATE TRIGGER pdf_extractions_updated_at BEFORE UPDATE ON public.pdf_extractions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- exercise_answer_keys — never visible to students
CREATE TABLE IF NOT EXISTS public.exercise_answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  item_number text NOT NULL,
  correct_answer jsonb NOT NULL,
  reference_answer text,
  source text NOT NULL DEFAULT 'pdf',
  key_version int NOT NULL DEFAULT 1,
  pdf_import_id uuid REFERENCES public.pdf_imports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, item_number, key_version)
);
CREATE INDEX IF NOT EXISTS exercise_answer_keys_exercise_idx ON public.exercise_answer_keys(exercise_id);
GRANT ALL ON public.exercise_answer_keys TO service_role;
GRANT SELECT ON public.exercise_answer_keys TO authenticated;
ALTER TABLE public.exercise_answer_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answer_keys admin read" ON public.exercise_answer_keys
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "answer_keys super admin write" ON public.exercise_answer_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP TRIGGER IF EXISTS exercise_answer_keys_updated_at ON public.exercise_answer_keys;
CREATE TRIGGER exercise_answer_keys_updated_at BEFORE UPDATE ON public.exercise_answer_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- regrade_audits
CREATE TABLE IF NOT EXISTS public.regrade_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  key_version int NOT NULL,
  items_changed int NOT NULL DEFAULT 0,
  attempts_affected int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS regrade_audits_exercise_idx ON public.regrade_audits(exercise_id);
GRANT ALL ON public.regrade_audits TO service_role;
GRANT SELECT ON public.regrade_audits TO authenticated;
ALTER TABLE public.regrade_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regrade_audits admin read" ON public.regrade_audits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Publish guard: only super_admin can flip status to published
CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS exercises_publish_guard ON public.exercises;
CREATE TRIGGER exercises_publish_guard
  BEFORE INSERT OR UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.guard_exercise_publish();

-- ============================================================
-- FILE: 20260616082441_c9384ac4-21c9-4f2a-b56b-22d5f7e7577a.sql
-- ============================================================

CREATE TABLE public.pdf_fidelity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_import_id UUID NOT NULL REFERENCES public.pdf_imports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pass','fail')),
  added_count INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  modified_count INTEGER NOT NULL DEFAULT 0,
  numbering_diff_count INTEGER NOT NULL DEFAULT 0,
  section_diff_count INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_fidelity_reports TO authenticated;
GRANT ALL ON public.pdf_fidelity_reports TO service_role;

ALTER TABLE public.pdf_fidelity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read fidelity reports" ON public.pdf_fidelity_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admin writes fidelity reports" ON public.pdf_fidelity_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE INDEX idx_pdf_fidelity_reports_import ON public.pdf_fidelity_reports(exam_import_id, created_at DESC);

-- Block publishing unless a passing fidelity report exists for the source import
CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_pass boolean;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;
    IF NEW.source_pdf_import_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.pdf_fidelity_reports
        WHERE exam_import_id = NEW.source_pdf_import_id AND status = 'pass'
      ) INTO has_pass;
      IF NOT has_pass THEN
        RAISE EXCEPTION 'Cannot publish: a passing fidelity report is required for this PDF import';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_exercise_publish ON public.exercises;
CREATE TRIGGER trg_guard_exercise_publish
BEFORE INSERT OR UPDATE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.guard_exercise_publish();

-- ============================================================
-- FILE: 20260616084932_f210c39f-2d30-4905-80df-cce4e3bfbb5d.sql
-- ============================================================
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS writing_category text,
  ADD COLUMN IF NOT EXISTS muendlich_part smallint,
  ADD COLUMN IF NOT EXISTS content_type text CHECK (content_type IN ('vorbereitung','pruefungssimulation'));
CREATE INDEX IF NOT EXISTS idx_exercises_classification ON public.exercises (level, module, teil, content_type);
-- ============================================================
-- FILE: 20260616120538_59ec422f-640b-4bb3-a3c3-0de9902705cf.sql
-- ============================================================

ALTER TABLE public.pdf_imports DROP CONSTRAINT IF EXISTS pdf_imports_kind_check;
ALTER TABLE public.pdf_imports ADD CONSTRAINT pdf_imports_kind_check
  CHECK (kind = ANY (ARRAY['exam'::text, 'answer_key'::text, 'combined'::text]));

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS model_variant text;
CREATE INDEX IF NOT EXISTS exercises_model_variant_idx
  ON public.exercises (source_pdf_import_id, model_variant);

-- ============================================================
-- FILE: 20260616132755_f58eddf6-821e-40ca-ba04-bfb4e8929674.sql
-- ============================================================
ALTER TABLE public.pdf_imports ADD COLUMN IF NOT EXISTS error_message text;
-- ============================================================
-- FILE: 20260617093709_fd88a54d-48a7-4514-b9a3-9742c2ea0d76.sql
-- ============================================================
ALTER TABLE public.pdf_imports ADD COLUMN IF NOT EXISTS extraction_started_at timestamptz;
-- ============================================================
-- FILE: 20260618205840_34a8badf-463f-42b1-868c-fe42418c9b2b.sql
-- ============================================================
DROP TRIGGER IF EXISTS exercises_publish_guard ON public.exercises;
DROP TRIGGER IF EXISTS trg_guard_exercise_publish ON public.exercises;
CREATE TRIGGER exercises_publish_guard
BEFORE INSERT OR UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.guard_exercise_publish();
-- ============================================================
-- FILE: 20260618205903_829a131f-8c66-4300-b5a3-9bfb2ccd7c6c.sql
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.guard_exercise_publish() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
-- ============================================================
-- FILE: 20260618205950_81c36f82-d534-4c8e-b8b1-70e13c5d4551.sql
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_pass boolean;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT private.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;
    IF NEW.source_pdf_import_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.pdf_fidelity_reports
        WHERE exam_import_id = NEW.source_pdf_import_id AND status = 'pass'
      ) INTO has_pass;
      IF NOT has_pass THEN
        RAISE EXCEPTION 'Cannot publish: a passing fidelity report is required for this PDF import';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));
-- ============================================================
-- FILE: 20260618210056_7c368a23-a0f8-432a-aaa2-944b6140362b.sql
-- ============================================================
DROP POLICY IF EXISTS "admin manage pdf imports" ON public.pdf_imports;
CREATE POLICY "admin manage pdf imports"
ON public.pdf_imports
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "pdf_extractions admin read" ON public.pdf_extractions;
CREATE POLICY "pdf_extractions admin read"
ON public.pdf_extractions
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "pdf_extractions super admin write" ON public.pdf_extractions;
CREATE POLICY "pdf_extractions super admin write"
ON public.pdf_extractions
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read fidelity reports" ON public.pdf_fidelity_reports;
CREATE POLICY "Admins read fidelity reports"
ON public.pdf_fidelity_reports
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin writes fidelity reports" ON public.pdf_fidelity_reports;
CREATE POLICY "Super admin writes fidelity reports"
ON public.pdf_fidelity_reports
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS exercises_admin_all ON public.exercises;
CREATE POLICY exercises_admin_all
ON public.exercises
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "answer_keys admin read" ON public.exercise_answer_keys;
CREATE POLICY "answer_keys admin read"
ON public.exercise_answer_keys
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "answer_keys super admin write" ON public.exercise_answer_keys;
CREATE POLICY "answer_keys super admin write"
ON public.exercise_answer_keys
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'::public.app_role));
-- ============================================================
-- FILE: 20260619105045_24583fac-7d7d-4fc5-9f38-3d0550dee841.sql
-- ============================================================
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
-- ============================================================
-- FILE: 20260619105117_b4fe5650-aeb5-402c-9376-eabb4a2c4489.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
-- ============================================================
-- FILE: 20260619161042_8ea1574a-6607-4c1e-aa04-28ae676aa363.sql
-- ============================================================
ALTER TYPE public.exercise_kind ADD VALUE IF NOT EXISTS 'passage_mcq';
-- ============================================================
-- FILE: 20260620055750_09e0eb16-15de-424b-b20b-898121f63b45.sql
-- ============================================================
ALTER TABLE public.pdf_imports ADD COLUMN IF NOT EXISTS content_hash text;
CREATE INDEX IF NOT EXISTS pdf_imports_content_hash_idx ON public.pdf_imports(content_hash);
-- ============================================================
-- FILE: 20260620111543_9725d602-1cf1-48ef-9378-45328a8179c5.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_pass boolean;
  jwt_role text;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    jwt_role := coalesce(auth.role(), '');
    IF jwt_role <> 'service_role' AND NOT private.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;
    IF NEW.source_pdf_import_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.pdf_fidelity_reports
        WHERE exam_import_id = NEW.source_pdf_import_id AND status = 'pass'
      ) INTO has_pass;
      IF NOT has_pass THEN
        RAISE EXCEPTION 'Cannot publish: a passing fidelity report is required for this PDF import';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
-- ============================================================
-- FILE: 20260620151400_641d7438-977c-4824-a64a-4d1472ffe0c0.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exercise_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level public.exercise_level,
  module public.exercise_module,
  teil smallint,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_collections_title_not_blank CHECK (length(btrim(title)) > 0)
);

GRANT SELECT ON public.exercise_collections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exercise_collections TO authenticated;
GRANT ALL ON public.exercise_collections TO service_role;

ALTER TABLE public.exercise_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_read_authenticated"
  ON public.exercise_collections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "collections_admin_write"
  ON public.exercise_collections FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE TRIGGER trg_exercise_collections_updated_at
  BEFORE UPDATE ON public.exercise_collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS collection_id uuid
  REFERENCES public.exercise_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exercises_collection_id_idx
  ON public.exercises(collection_id);

-- ============================================================
-- FILE: 20260621062923_c2241d28-0f0b-4a63-9c32-53cd496f848c.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_pass boolean;
  has_exercise_clearance boolean;
  jwt_role text;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    jwt_role := coalesce(auth.role(), '');
    IF jwt_role <> 'service_role' AND NOT private.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;

    IF NEW.source_pdf_import_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1
        FROM public.pdf_fidelity_reports
        WHERE exam_import_id = NEW.source_pdf_import_id
          AND status = 'pass'
      ) INTO has_pass;

      IF NOT has_pass THEN
        SELECT EXISTS(
          SELECT 1
          FROM public.pdf_fidelity_reports r
          WHERE r.exam_import_id = NEW.source_pdf_import_id
            AND (r.details->'publishableExerciseIds') ? NEW.id::text
        ) INTO has_exercise_clearance;

        IF NOT has_exercise_clearance THEN
          RAISE EXCEPTION 'Cannot publish: this exercise has not passed fidelity validation yet';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END
$function$;
-- ============================================================
-- FILE: 20260624000000_auralingovia_foundation.sql
-- ============================================================
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

-- ============================================================
-- FILE: 20260624000001_owner_role.sql
-- ============================================================
-- Add owner role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- Owner cannot be set by any normal admin — only by the service_role directly.
-- The has_role function works for all roles including owner.

-- Protect owner promotion: revoke INSERT on user_roles from authenticated
-- Admins use service_role for all role changes.
-- (Authenticated users already have only SELECT on user_roles per initial migration)

-- Function: check if calling user is owner
create or replace function public.is_owner(_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'owner'
  )
$$;

-- Function: check if admin (owner OR admin role)
create or replace function public.is_admin_or_owner(_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin', 'owner')
  )
$$;

-- ============================================================
-- FILE: 20260625000000_gamification.sql
-- ============================================================
-- ============================================================
-- AuraLingovia Gamification & Extended Features
-- XP/Level, Achievements, Streaks, Notes, Goals, Favorites
-- ============================================================

-- ============================================================
-- USER PROGRESS (XP, Level, Streak)
-- ============================================================

create table if not exists public.user_progress (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  total_xp             int not null default 0,
  level                int not null default 1,
  streak_current       int not null default 0,
  streak_longest       int not null default 0,
  streak_last_active   date,          -- date of last study activity
  exercises_completed  int not null default 0,
  simulations_completed int not null default 0,
  total_study_sec      bigint not null default 0,
  updated_at           timestamptz not null default now()
);

grant select, insert, update on public.user_progress to authenticated;
grant all on public.user_progress to service_role;
alter table public.user_progress enable row level security;
create policy "progress_own" on public.user_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress_admin_read" on public.user_progress for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Auto-create progress row when user is created
create or replace function public.handle_new_user_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_progress (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_progress on auth.users;
create trigger on_auth_user_created_progress
  after insert on auth.users
  for each row execute function public.handle_new_user_progress();

-- ============================================================
-- ACHIEVEMENTS (master catalog)
-- ============================================================

create table if not exists public.achievements (
  id          text primary key,             -- slug: 'first_login', 'streak_7'
  title       text not null,
  description text not null,
  icon        text not null default 'trophy', -- lucide icon name
  category    text not null default 'general', -- general | streak | exercise | simulation
  xp_reward   int not null default 0,
  hidden      boolean not null default false,
  sort_order  int not null default 0
);

grant select on public.achievements to authenticated;
grant all on public.achievements to service_role;
alter table public.achievements enable row level security;
create policy "achievements_read" on public.achievements for select to authenticated using (true);

-- Seed achievement catalog
insert into public.achievements (id, title, description, icon, category, xp_reward, sort_order) values
  ('first_login',      'First Step',           'Log in to AuraLingovia for the first time',            'log-in',         'general',    10,  1),
  ('profile_complete', 'Ready to Learn',       'Complete your profile with name and exam date',         'user-check',     'general',    20,  2),
  ('first_exercise',   'Getting Started',      'Complete your first exercise',                          'book-open',      'exercise',   25,  3),
  ('first_perfect',    'Perfectionist',        'Score 100% on any exercise',                            'star',           'exercise',   50,  4),
  ('exercise_5',       'Warming Up',           'Complete 5 exercises',                                  'zap',            'exercise',   30,  5),
  ('exercise_10',      'On a Roll',            'Complete 10 exercises',                                 'trending-up',    'exercise',   50,  6),
  ('exercise_25',      'Dedicated Learner',    'Complete 25 exercises',                                 'award',          'exercise',   75,  7),
  ('exercise_50',      'Half Century',         'Complete 50 exercises',                                 'medal',          'exercise',   100, 8),
  ('exercise_100',     'Century Club',         'Complete 100 exercises',                                'trophy',         'exercise',   200, 9),
  ('exercise_500',     'Elite Practitioner',   'Complete 500 exercises',                                'crown',          'exercise',   500, 10),
  ('first_simulation', 'Exam Ready',           'Complete your first full exam simulation',              'clipboard-check','simulation', 75,  11),
  ('simulation_5',     'Simulation Master',    'Complete 5 full exam simulations',                      'graduation-cap', 'simulation', 150, 12),
  ('streak_3',         'Habit Forming',        'Study for 3 consecutive days',                          'flame',          'streak',     30,  13),
  ('streak_7',         'Week Warrior',         'Study for 7 consecutive days',                          'flame',          'streak',     75,  14),
  ('streak_14',        'Two Week Titan',       'Study for 14 consecutive days',                         'flame',          'streak',     150, 15),
  ('streak_30',        'Monthly Champion',     'Study for 30 consecutive days',                         'flame',          'streak',     300, 16),
  ('streak_60',        'Unstoppable',          'Study for 60 consecutive days',                         'flame',          'streak',     500, 17),
  ('streak_100',       'Legendary',            'Study for 100 consecutive days',                        'flame',          'streak',     1000,18),
  ('level_5',          'Level 5',              'Reach Level 5',                                         'chevrons-up',    'general',    50,  19),
  ('level_10',         'Level 10',             'Reach Level 10',                                        'chevrons-up',    'general',    100, 20),
  ('level_25',         'Level 25',             'Reach Level 25',                                        'chevrons-up',    'general',    250, 21)
on conflict (id) do update set
  title       = excluded.title,
  description = excluded.description,
  icon        = excluded.icon,
  category    = excluded.category,
  xp_reward   = excluded.xp_reward,
  sort_order  = excluded.sort_order;

-- ============================================================
-- USER ACHIEVEMENTS (unlocked)
-- ============================================================

create table if not exists public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at    timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index on public.user_achievements(user_id);
grant select, insert on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;
alter table public.user_achievements enable row level security;
create policy "user_achievements_own" on public.user_achievements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_achievements_admin" on public.user_achievements for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STUDY NOTES
-- ============================================================

create table if not exists public.study_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled Note',
  content     text not null default '',
  color       text not null default 'default',  -- default | yellow | blue | green | red
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on public.study_notes(user_id, pinned, updated_at);
grant select, insert, update, delete on public.study_notes to authenticated;
grant all on public.study_notes to service_role;
alter table public.study_notes enable row level security;
create policy "notes_own" on public.study_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- WEEKLY GOALS
-- ============================================================

create table if not exists public.weekly_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  week_start      date not null,          -- Monday of the week (ISO week)
  exercises_goal  int not null default 20,
  exercises_done  int not null default 0,
  simulations_goal int not null default 2,
  simulations_done int not null default 0,
  study_min_goal  int not null default 60,  -- minutes
  study_min_done  int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, week_start)
);

create index on public.weekly_goals(user_id, week_start);
grant select, insert, update on public.weekly_goals to authenticated;
grant all on public.weekly_goals to service_role;
alter table public.weekly_goals enable row level security;
create policy "goals_own" on public.weekly_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- FAVORITES
-- ============================================================

create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,    -- 'exercise' | 'note' | 'redemittel'
  reference_id text,            -- exam id or custom id
  title       text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, type, reference_id)
);

create index on public.favorites(user_id, type);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "favorites_own" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- CERTIFICATES
-- ============================================================

create table if not exists public.certificates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  milestone     text not null,   -- 'level_10' | 'simulation_5' | etc.
  issued_at     timestamptz not null default now()
);

create index on public.certificates(user_id);
grant select on public.certificates to authenticated;
grant all on public.certificates to service_role;
alter table public.certificates enable row level security;
create policy "certificates_own" on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STUDY TIMER SESSIONS
-- ============================================================

create table if not exists public.study_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  duration_sec int,             -- filled on end
  mode        text not null default 'free',  -- 'free' | 'pomodoro'
  created_at  timestamptz not null default now()
);

create index on public.study_sessions(user_id, started_at);
grant select, insert, update on public.study_sessions to authenticated;
grant all on public.study_sessions to service_role;
alter table public.study_sessions enable row level security;
create policy "study_sessions_own" on public.study_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- XP AWARD FUNCTION (called after exercise completion)
-- ============================================================

create or replace function public.award_xp(
  _user_id    uuid,
  _xp         int,
  _source     text default 'exercise'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  _new_xp    int;
  _new_level int;
begin
  insert into public.user_progress (user_id, total_xp)
  values (_user_id, _xp)
  on conflict (user_id) do update
    set total_xp   = user_progress.total_xp + _xp,
        updated_at = now()
  returning total_xp into _new_xp;

  -- Level formula: sum of 1..n * 150 = level n needs n*(n+1)/2 * 150 total XP
  -- Simpler: level = floor(sqrt(total_xp / 100)) + 1
  _new_level := greatest(1, floor(sqrt(_new_xp::float / 100))::int + 1);

  update public.user_progress
  set level = _new_level
  where user_id = _user_id and level <> _new_level;
end;
$$;

-- ============================================================
-- STREAK UPDATE FUNCTION
-- ============================================================

create or replace function public.update_streak(_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  _last_active date;
  _today       date := current_date;
begin
  insert into public.user_progress (user_id, streak_current, streak_longest, streak_last_active)
  values (_user_id, 1, 1, _today)
  on conflict (user_id) do nothing;

  select streak_last_active into _last_active
  from public.user_progress where user_id = _user_id;

  if _last_active = _today then
    -- already updated today, no-op
    return;
  elsif _last_active = _today - 1 then
    -- consecutive day
    update public.user_progress set
      streak_current     = streak_current + 1,
      streak_longest     = greatest(streak_longest, streak_current + 1),
      streak_last_active = _today,
      updated_at         = now()
    where user_id = _user_id;
  else
    -- streak broken
    update public.user_progress set
      streak_current     = 1,
      streak_last_active = _today,
      updated_at         = now()
    where user_id = _user_id;
  end if;
end;
$$;

-- ============================================================
-- EXERCISE COMPLETION FUNCTION
-- Awards XP, updates streak, increments counters
-- ============================================================

create or replace function public.record_exercise_completion(
  _user_id    uuid,
  _is_perfect boolean default false,
  _is_simulation boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  _xp int := case when _is_simulation then 50 else 10 end;
begin
  if _is_perfect then _xp := _xp + 25; end if;

  -- Update counters
  insert into public.user_progress (user_id, exercises_completed, simulations_completed, total_xp)
  values (_user_id,
          case when not _is_simulation then 1 else 0 end,
          case when _is_simulation     then 1 else 0 end,
          _xp)
  on conflict (user_id) do update set
    exercises_completed   = user_progress.exercises_completed   + (case when not _is_simulation then 1 else 0 end),
    simulations_completed = user_progress.simulations_completed + (case when _is_simulation     then 1 else 0 end),
    total_xp              = user_progress.total_xp + _xp,
    updated_at            = now();

  -- Update level
  perform public.award_xp(_user_id, 0); -- recalculate level

  -- Update streak
  perform public.update_streak(_user_id);
end;
$$;

grant execute on function public.award_xp to authenticated;
grant execute on function public.update_streak to authenticated;
grant execute on function public.record_exercise_completion to authenticated;

-- ============================================================
-- FILE: 20260625100000_rebrand_auralingovia.sql
-- ============================================================
-- AuraLingovia — Rebranding: replace all Lingovia references in database data

-- Fix notification titles and bodies
UPDATE notifications
SET
  title = REPLACE(REPLACE(title, 'Lingovia', 'AuraLingovia'), 'DeutschMaster', 'AuraLingovia'),
  body  = REPLACE(REPLACE(body,  'Lingovia', 'AuraLingovia'), 'DeutschMaster', 'AuraLingovia')
WHERE title ILIKE '%Lingovia%'
   OR title ILIKE '%DeutschMaster%'
   OR body  ILIKE '%Lingovia%'
   OR body  ILIKE '%DeutschMaster%';

-- Fix handle_new_user function that creates welcome notifications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  trial_used BOOLEAN;
BEGIN
  -- Check if this email has used a trial before
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = NEW.email AND id != NEW.id
  ) INTO trial_used;

  -- Create profile row
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Send appropriate notification
  IF trial_used THEN
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (NEW.id, 'Welcome back to AuraLingovia', 'Your free trial has already been used. Subscribe to continue learning.', 'info');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (NEW.id, 'Welcome to AuraLingovia 🎉', 'Your 3-day free trial has started. Start practising for your TELC exam!', 'success');
  END IF;

  RETURN NEW;
END;
$$;

