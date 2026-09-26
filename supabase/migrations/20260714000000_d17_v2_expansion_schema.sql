-- D17 v2 expansion: order lifecycle hardening (session tokens, one-active-
-- order enforcement, lazy 24h expiry, level/destination audit snapshot),
-- two-screenshot verification columns, distinct Transaction ID /
-- Authorization Number duplicate tracking, fraud-context columns
-- (ip/device/browser fingerprint, reputation/velocity audit), and a new
-- escalating anti-fraud suspension table. Purely additive against
-- 20260713000000_d17_verification_foundation.sql — no renames, no drops.

-- ============================================================
-- D17_ORDERS — lifecycle hardening
-- ============================================================
alter table public.d17_orders
  add column if not exists session_token text,
  add column if not exists session_token_expires_at timestamptz,
  add column if not exists level public.user_level,               -- audit snapshot of profiles.level at creation time only — does NOT gate unlocking
  add column if not exists expires_at timestamptz,                 -- created_at + 24h; enforced lazily, no cron
  add column if not exists destination_number text,                -- official D17 number shown to the student at order-creation time
  add column if not exists destination_iban text,
  add column if not exists locked_for_admin_only boolean not null default false;

create unique index if not exists d17_orders_session_token_uidx
  on public.d17_orders(session_token) where session_token is not null;

create index if not exists d17_orders_expires_idx
  on public.d17_orders(status, expires_at) where status = 'awaiting_payment';

-- Enforce ONE active order per user at the DB layer (defense in depth beyond
-- the app-level check in orders.functions.ts).
create unique index if not exists d17_orders_one_active_per_user_uidx
  on public.d17_orders(user_id)
  where status in ('awaiting_payment', 'under_review', 'manual_review');

-- ============================================================
-- D17_VERIFICATION_ATTEMPTS — second screenshot, distinct reference fields,
-- cross-check, fraud-context columns
-- ============================================================
alter table public.d17_verification_attempts
  -- Screenshot 2 (D17 Transaction History / Journal)
  add column if not exists storage_path_2 text,
  add column if not exists ocr_amount_2 numeric(10,2),
  add column if not exists ocr_currency_2 text,
  add column if not exists ocr_payment_datetime_2 timestamptz,
  add column if not exists ocr_destination_2 text,
  add column if not exists image_hash_sha256_2 text,
  add column if not exists image_dhash_2 text,                     -- text, not bigint — see the overflow lesson from the original build
  add column if not exists ocr_text_hash_sha256_2 text,

  -- Distinct from the existing ocr_reference/user_entered_reference
  add column if not exists ocr_destination_number text,            -- from screenshot 1
  add column if not exists ocr_destination_iban text,
  add column if not exists ocr_transaction_id text,
  add column if not exists ocr_authorization_number text,

  -- Cross-screenshot consistency
  add column if not exists cross_check_consistent boolean,
  add column if not exists cross_check_summary jsonb,

  -- Fraud context
  add column if not exists ip_address text,
  add column if not exists device_fingerprint text,
  add column if not exists browser_fingerprint text,

  -- Audit of capped-influence signals actually applied
  add column if not exists reputation_signal_delta int,
  add column if not exists velocity_signal_points int,
  add column if not exists upload_to_creation_delta_ms bigint;

create index if not exists d17_attempts_txn_id_idx
  on public.d17_verification_attempts(ocr_transaction_id) where ocr_transaction_id is not null;
create index if not exists d17_attempts_auth_number_idx
  on public.d17_verification_attempts(ocr_authorization_number) where ocr_authorization_number is not null;
create index if not exists d17_attempts_device_fp_idx
  on public.d17_verification_attempts(device_fingerprint) where device_fingerprint is not null;
create index if not exists d17_attempts_ip_idx
  on public.d17_verification_attempts(ip_address, created_at desc) where ip_address is not null;

-- ============================================================
-- D17_FRAUD_SUSPENSIONS — escalating anti-fraud suspension ladder.
-- One row per user, upserted on each confirmed-duplicate decision.
-- Stateful (running count + active suspension timestamp), so this needs
-- its own small table rather than being derived from windowed counts on
-- every request — mirrors d17_alerts as a durable derived log.
-- ============================================================
create table if not exists public.d17_fraud_suspensions (
  id                                    uuid primary key default gen_random_uuid(),
  user_id                                uuid not null references auth.users(id) on delete cascade,
  confirmed_duplicate_count              int not null default 0,
  suspended_until                        timestamptz,
  account_locked                         boolean not null default false,
  last_confirmed_duplicate_attempt_id    uuid references public.d17_verification_attempts(id),
  updated_at                             timestamptz not null default now(),
  created_at                             timestamptz not null default now()
);

create unique index if not exists d17_fraud_suspensions_user_uidx
  on public.d17_fraud_suspensions(user_id);

grant select on public.d17_fraud_suspensions to authenticated;
grant all on public.d17_fraud_suspensions to service_role;
alter table public.d17_fraud_suspensions enable row level security;

drop policy if exists "d17_fraud_suspensions_select_own_or_admin" on public.d17_fraud_suspensions;
create policy "d17_fraud_suspensions_select_own_or_admin" on public.d17_fraud_suspensions
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
-- Writes: service-role only, via the pipeline's fraud-suspension helper and
-- the admin clear-suspension action — no client write policy.
