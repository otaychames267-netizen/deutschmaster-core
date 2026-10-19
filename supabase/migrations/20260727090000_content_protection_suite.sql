-- Content-protection / anti-scraping suite: incident log + escalating
-- suspension ladder, sibling to d17_fraud_suspensions but deliberately a
-- separate table (different domain — scraping/DOM-abuse signals, not
-- payment-fraud signals; reusing d17_fraud_suspensions' schema would have
-- meant bolting a reason column onto live payment-fraud logic).

create table if not exists public.content_protection_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'contextmenu_blocked', 'copy_blocked', 'keyboard_shortcut_blocked',
    'print_attempt', 'devtools_heuristic', 'high_speed_access'
  )),
  route text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_protection_incidents_user_time
  on public.content_protection_incidents (user_id, created_at desc);

alter table public.content_protection_incidents enable row level security;
-- No policies: service-role (server functions) only, same pattern as
-- api_rate_limits — never queried directly by the browser client.

create table if not exists public.content_protection_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  incident_count integer not null default 0,
  tier smallint not null default 0,
  suspended_until timestamptz,
  account_locked boolean not null default false,
  -- Set when the automated ladder reaches its top tier. This does NOT lock
  -- the account permanently by itself — it only queues the account for an
  -- admin's explicit permanent-ban decision (see
  -- src/lib/content-protection/admin-actions.functions.ts). A temporary
  -- account_locked=true DOES apply immediately at this tier (see
  -- suspension.server.ts), but "permanent, zero-refund" is never automatic.
  pending_permanent_review boolean not null default false,
  locked_reason text,
  last_incident_id uuid references public.content_protection_incidents(id),
  updated_at timestamptz not null default now()
);

alter table public.content_protection_suspensions enable row level security;
-- No policies: service-role only.
