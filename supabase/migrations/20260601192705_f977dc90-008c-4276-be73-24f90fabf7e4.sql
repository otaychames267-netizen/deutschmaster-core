
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
