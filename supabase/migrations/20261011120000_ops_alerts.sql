-- Operational alerts raised by the relay's watchdog (muendlich-relay/src/opsWatch.ts) through POST /api/ops-alert:
-- provider balances (DeepInfra, ElevenLabs, Anthropic, Groq), TTS failover engaged, daily digest. Durable log regardless of whether Telegram/email delivery worked.
create table if not exists public.ops_alerts (
  id             uuid primary key default gen_random_uuid(),
  severity       text not null check (severity in ('info', 'warning', 'critical')),
  key            text not null,            -- 'deepinfra' | 'elevenlabs' | 'anthropic' | 'groq' | 'supabase' | 'relay_tts' | 'tts_failover' | 'daily_digest'
  title          text not null,
  message        text not null,
  details        jsonb not null default '{}',
  telegram_sent  boolean not null default false,
  email_sent     boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists ops_alerts_created_idx on public.ops_alerts (created_at desc);
create index if not exists ops_alerts_key_idx on public.ops_alerts (key, created_at desc);
grant select on public.ops_alerts to authenticated;
grant all on public.ops_alerts to service_role;
alter table public.ops_alerts enable row level security;

drop policy if exists "ops_alerts_select_admin" on public.ops_alerts;
create policy "ops_alerts_select_admin" on public.ops_alerts for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
