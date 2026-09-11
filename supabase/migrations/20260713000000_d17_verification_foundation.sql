-- D17/bank-transfer AI payment verification system: a second, temporary,
-- PARALLEL payment path to Lemon Squeezy for local Tunisian students who pay
-- externally and upload a screenshot as proof. Self-contained subsystem
-- (own enums/tables/RPCs) so it can be retired wholesale once a real D17
-- API/webhook exists — see docs/D17_VERIFICATION_RUNBOOK.md (Phase 7) for
-- the migration story. Follows the same atomic-RPC / RLS / idempotency
-- conventions as 20260711000000_lemonsqueezy_billing.sql.

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type public.d17_order_status as enum (
    'awaiting_payment',   -- order created, user hasn't uploaded yet
    'under_review',       -- reserved for a future async/multi-attempt-in-flight state
    'auto_approved',      -- rule engine auto-approved, provisioning done
    'manual_review',      -- confidence <90%, inside the 8h admin SLA window
    'admin_approved',     -- admin manually approved after manual_review
    'rejected',           -- confirmed duplicate/fraud, or admin manual reject
    'expired'             -- awaiting_payment for too long, never uploaded
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.d17_attempt_decision as enum (
    'auto_approved', 'manual_review', 'auto_rejected_duplicate', 'auto_rejected_fraud'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.d17_notification_source as enum (
    'd17_app', 'bank_sms', 'bank_app', 'screenshot_other', 'unclear'
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- D17_ORDERS — the Order. Status transitions exclusively via service-role
-- server functions (no client UPDATE policy), mirroring the Lemon Squeezy
-- webhook's exclusive-RPC-write discipline.
-- ============================================================
create table if not exists public.d17_orders (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  plan_code               public.plan_code not null references public.plans(code),
  amount_tnd              numeric(10,2) not null,
  currency                text not null default 'TND',
  status                  public.d17_order_status not null default 'awaiting_payment',
  attempts_used           int not null default 0,
  manual_review_deadline  timestamptz,
  resolved_at             timestamptz,
  resolved_by             uuid references auth.users(id),
  subscription_id         uuid references public.subscriptions(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists d17_orders_user_status_idx on public.d17_orders(user_id, status);
create index if not exists d17_orders_manual_review_sla_idx on public.d17_orders(status, manual_review_deadline) where status = 'manual_review';

grant select, insert on public.d17_orders to authenticated;
grant all on public.d17_orders to service_role;
alter table public.d17_orders enable row level security;

drop policy if exists "d17_orders_select_own_or_admin" on public.d17_orders;
create policy "d17_orders_select_own_or_admin" on public.d17_orders for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "d17_orders_insert_own" on public.d17_orders;
create policy "d17_orders_insert_own" on public.d17_orders for insert to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- D17_VERIFICATION_ATTEMPTS — one row per screenshot upload (max 3/order).
-- This table IS the per-attempt immutable audit trail: original image via
-- storage_path, full OCR text, decision reason, versions, timings all live
-- here. All writes via service role — the row can only be correctly built
-- after the full OCR+fraud+rule-engine pipeline runs server-side.
-- ============================================================
create table if not exists public.d17_verification_attempts (
  id                        uuid primary key default gen_random_uuid(),
  order_id                  uuid not null references public.d17_orders(id) on delete cascade,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  attempt_number            int not null,
  storage_path              text not null,
  user_entered_reference    text not null,

  ocr_raw_text              text,
  ocr_confidence            numeric(5,2),
  ocr_amount                numeric(10,2),
  ocr_currency              text,
  ocr_payment_datetime      timestamptz,
  ocr_reference             text,
  ocr_notification_source   public.d17_notification_source,
  ocr_language_detected     text,

  fraud_score               numeric(5,2),
  fraud_flags               jsonb not null default '[]',
  screenshot_integrity_ok   boolean,

  image_hash_sha256         text not null,
  image_dhash                bigint not null,
  ocr_text_hash_sha256       text,

  risk_score                 int not null check (risk_score between 0 and 100),
  ai_confidence               numeric(5,2) not null,
  rule_engine_result          jsonb not null,
  decision                    public.d17_attempt_decision not null,
  decision_reason              text not null,

  ai_version                   text not null,
  ocr_version                   text not null default 'v1',
  verification_duration_ms      int,
  gemini_token_count             int,
  created_at                     timestamptz not null default now()
);

create unique index if not exists d17_attempts_order_attempt_uidx on public.d17_verification_attempts(order_id, attempt_number);
create index if not exists d17_attempts_image_hash_idx on public.d17_verification_attempts(image_hash_sha256);
create index if not exists d17_attempts_dhash_idx on public.d17_verification_attempts(image_dhash);
create index if not exists d17_attempts_ocr_text_hash_idx on public.d17_verification_attempts(ocr_text_hash_sha256) where ocr_text_hash_sha256 is not null;
create index if not exists d17_attempts_reference_idx on public.d17_verification_attempts(ocr_reference) where ocr_reference is not null;
create index if not exists d17_attempts_user_idx on public.d17_verification_attempts(user_id, created_at desc);

grant select on public.d17_verification_attempts to authenticated;
grant all on public.d17_verification_attempts to service_role;
alter table public.d17_verification_attempts enable row level security;

drop policy if exists "d17_attempts_select_own_or_admin" on public.d17_verification_attempts;
create policy "d17_attempts_select_own_or_admin" on public.d17_verification_attempts for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Attempts-counter: keeps d17_orders.attempts_used in sync so the "max 3
-- uploads" check is a cheap column read, not a count(*) on every submission.
create or replace function public.d17_increment_attempts()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.d17_orders set attempts_used = attempts_used + 1, updated_at = now() where id = new.order_id;
  return new;
end;
$$;

drop trigger if exists trg_d17_increment_attempts on public.d17_verification_attempts;
create trigger trg_d17_increment_attempts
  after insert on public.d17_verification_attempts
  for each row execute function public.d17_increment_attempts();

-- ============================================================
-- D17_ADMIN_ACTIONS — append-only log of human decisions, distinct from AI
-- data because an order can accumulate multiple admin actions over time.
-- ============================================================
create table if not exists public.d17_admin_actions (
  id                          uuid primary key default gen_random_uuid(),
  order_id                    uuid not null references public.d17_orders(id) on delete cascade,
  admin_id                    uuid not null references auth.users(id),
  action                      text not null, -- 'approve' | 'reject' | 'adjust_grant' | 'note' | 'kill_switch_bypass_review'
  note                        text,
  granted_minutes_override    int,
  granted_credits_override    int,
  created_at                  timestamptz not null default now()
);

create index if not exists d17_admin_actions_order_idx on public.d17_admin_actions(order_id, created_at desc);
grant select on public.d17_admin_actions to authenticated;
grant all on public.d17_admin_actions to service_role;
alter table public.d17_admin_actions enable row level security;

drop policy if exists "d17_admin_actions_select_admin" on public.d17_admin_actions;
create policy "d17_admin_actions_select_admin" on public.d17_admin_actions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- PLATFORM_SETTINGS — generic key/value flags (kill switch first). Writes
-- exclusively via set_platform_setting so every toggle flip is attributable.
-- ============================================================
create table if not exists public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);

grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_read_admin" on public.platform_settings;
create policy "platform_settings_read_admin" on public.platform_settings for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

insert into public.platform_settings (key, value) values
  ('payment_verification_kill_switch', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.set_platform_setting(p_key text, p_value jsonb, p_admin_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(p_admin_id, 'admin') then
    raise exception 'Forbidden: admin only';
  end if;
  insert into public.platform_settings (key, value, updated_by, updated_at)
  values (p_key, p_value, p_admin_id, now())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
end;
$$;
revoke all on function public.set_platform_setting(text, jsonb, uuid) from public, authenticated, anon;
grant execute on function public.set_platform_setting(text, jsonb, uuid) to service_role;

create or replace function public.get_platform_setting(p_key text)
returns jsonb
language sql stable security definer set search_path = public
as $$ select value from public.platform_settings where key = p_key; $$;
grant execute on function public.get_platform_setting(text) to authenticated, service_role;

-- ============================================================
-- D17_ALERTS — durable Telegram/email alert log (admin-visible fallback
-- regardless of whether the live push succeeded).
-- ============================================================
create table if not exists public.d17_alerts (
  id             uuid primary key default gen_random_uuid(),
  severity       text not null, -- 'info' | 'warning' | 'critical'
  category       text not null, -- 'gemini_failure' | 'high_risk_cluster' | 'budget_80pct' | 'kill_switch_toggled'
  message        text not null,
  metadata       jsonb not null default '{}',
  telegram_sent  boolean not null default false,
  email_sent     boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists d17_alerts_created_idx on public.d17_alerts(created_at desc);
grant select on public.d17_alerts to authenticated;
grant all on public.d17_alerts to service_role;
alter table public.d17_alerts enable row level security;

drop policy if exists "d17_alerts_select_admin" on public.d17_alerts;
create policy "d17_alerts_select_admin" on public.d17_alerts for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE — payment-screenshots bucket, same policy shape as muendlich-pdfs
-- but scoped per-user (each student's own folder), plus admin read-all.
-- ============================================================
insert into storage.buckets (id, name, public) values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "d17 user upload own" on storage.objects;
drop policy if exists "d17 user read own" on storage.objects;
drop policy if exists "d17 admin read all" on storage.objects;

create policy "d17 user upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "d17 user read own" on storage.objects for select to authenticated
  using (bucket_id = 'payment-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "d17 admin read all" on storage.objects for select to authenticated
  using (bucket_id = 'payment-screenshots' and exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','super_admin','owner')));
