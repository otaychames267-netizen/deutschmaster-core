-- auth_email_log — permanent, queryable record of every confirmation-email
-- delivery attempt this app makes on its own (Resend HTTP API), independent
-- of Supabase Auth's own SMTP-triggered mailer.
--
-- Root cause of the recurring "confirmation email stopped working" reports:
-- this app had ZERO visibility into Supabase Auth's own email pipeline —
-- Supabase's signup endpoint returns 200 even when its internal SMTP send
-- fails, so a broken/rotated smtp_pass (confirmed broken again as of
-- 2026-07-29 — Resend rejected it with "API key is invalid") produced no
-- error anywhere in this app's logs. The permanent fix (see
-- src/lib/auth/confirmation-email.server.ts) stops relying on that mailer
-- entirely: this app now generates the confirmation link itself
-- (supabaseAdmin.auth.admin.generateLink, which never sends anything) and
-- delivers it via the same Resend HTTP API already used for D17
-- notifications — a path we can log, retry, and monitor. This table is
-- that log.
create table if not exists public.auth_email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  email_type text not null check (email_type in ('signup_confirmation', 'resend_confirmation')),
  status text not null check (status in ('retrying', 'sent', 'failed')) default 'retrying',
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  attempt_count int not null default 0,
  created_at timestamptz not null default now(),
  last_attempted_at timestamptz,
  sent_at timestamptz
);

create index if not exists auth_email_log_user_id_idx on public.auth_email_log(user_id);
create index if not exists auth_email_log_status_idx on public.auth_email_log(status);
create index if not exists auth_email_log_created_at_idx on public.auth_email_log(created_at desc);
create index if not exists auth_email_log_email_idx on public.auth_email_log(email);

alter table public.auth_email_log enable row level security;

-- Written and read exclusively via supabaseAdmin (service_role) from server
-- functions — same pattern as d17_alerts. Admin dashboard reads go through
-- a server function too (not a direct client query), so no "authenticated"
-- SELECT policy is needed; service_role bypasses RLS entirely, this policy
-- just makes the intent explicit and blocks any other role by default.
create policy "auth_email_log_service_role_all" on public.auth_email_log
  for all to service_role using (true) with check (true);
