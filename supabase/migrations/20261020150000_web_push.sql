-- Web Push for the in-app notifications (migration 20261020120000).
--
-- A student opts in per device; the database claims un-pushed notifications and
-- pings the Vercel route /api/push-dispatch (pg_net), which signs and sends them
-- with the VAPID key. Delivery rules:
--   * only grouped content / broadcast notifications (kind IS NOT NULL), still unread,
--     created in the last 24 h, and only to devices subscribed BEFORE the notification
--     (enabling push never replays old notifications);
--   * quiet hours 22:00-08:00 Africa/Tunis: nothing is sent, it waits for the morning;
--   * a notification is claimed (push_sent_at) before sending => never sent twice;
--     a same-day MERGE of new items clears push_sent_at so the update pushes again.
-- The shared secret between pg_net and the route lives in Vault (push_dispatch_secret).
-- Idempotent: safe to re-run.

create extension if not exists pg_net;

------------------------------------------------------------------------------
-- 1. Devices
------------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz,
  fail_count  integer     not null default 0
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
-- No policies: devices are only reachable through the SECURITY DEFINER functions below.

alter table public.notifications add column if not exists push_sent_at timestamptz;
create index if not exists notifications_push_pending_idx
  on public.notifications (created_at) where push_sent_at is null and kind is not null;

------------------------------------------------------------------------------
-- 2. Student-facing: register / remove this device
------------------------------------------------------------------------------
create or replace function public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'bad endpoint'; end if;
  if coalesce(char_length(p_p256dh), 0) not between 60 and 120 or coalesce(char_length(p_auth), 0) not between 12 and 40 then
    raise exception 'bad keys';
  end if;

  insert into public.push_subscriptions as s (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
     set user_id = v_uid, p256dh = excluded.p256dh, auth = excluded.auth,
         user_agent = excluded.user_agent, fail_count = 0,
         -- a device handed to another account starts clean: it must not replay the old owner's backlog
         created_at = case when s.user_id <> v_uid then now() else s.created_at end;

  -- at most 10 devices per student: drop the oldest
  delete from public.push_subscriptions
   where id in (select id from public.push_subscriptions where user_id = v_uid order by created_at desc offset 10);
end;
$$;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.unregister_push_subscription(text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.unregister_push_subscription(text) to authenticated;

------------------------------------------------------------------------------
-- 3. Delivery plumbing (service role / postgres only)
------------------------------------------------------------------------------
create or replace function public.push_quiet_now() returns boolean
language sql stable as $$
  select extract(hour from (now() at time zone 'Africa/Tunis')) >= 22
      or extract(hour from (now() at time zone 'Africa/Tunis')) < 8;
$$;

-- Marks up to p_limit pending notifications as pushed and returns them with their devices.
create or replace function public.claim_push_batch(p_limit integer default 200)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_out jsonb;
begin
  if public.push_quiet_now() then return '[]'::jsonb; end if;

  with picked as (
    update public.notifications n
       set push_sent_at = now()
     where n.id in (
       select x.id from public.notifications x
        where x.push_sent_at is null and x.kind is not null and not x.read
          and x.created_at > now() - interval '24 hours'
          and exists (select 1 from public.push_subscriptions s where s.user_id = x.user_id and s.created_at <= x.created_at)
        order by x.created_at
        limit greatest(1, least(p_limit, 500))
        for update skip locked)
    returning n.id, n.user_id, n.title, n.body, n.action_url, n.kind, n.dedupe_key, n.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'title', p.title, 'body', p.body, 'url', p.action_url, 'kind', p.kind,
           'tag', coalesce(p.dedupe_key, p.id::text),
           'subs', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
                      from public.push_subscriptions s where s.user_id = p.user_id and s.created_at <= p.created_at)
         )), '[]'::jsonb)
    into v_out
    from picked p;
  return v_out;
end;
$$;

-- p_ok / p_gone / p_failed are push_subscriptions.id lists.
create or replace function public.record_push_results(p_ok uuid[], p_gone uuid[], p_failed uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.push_subscriptions set last_ok_at = now(), fail_count = 0 where id = any(coalesce(p_ok, '{}'));
  delete from public.push_subscriptions where id = any(coalesce(p_gone, '{}'));
  update public.push_subscriptions set fail_count = fail_count + 1 where id = any(coalesce(p_failed, '{}'));
  delete from public.push_subscriptions where fail_count >= 5;
end;
$$;

-- Wakes the dispatch route when (and only when) something is waiting.
create or replace function public.push_kick() returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_secret text;
begin
  if public.push_quiet_now() then return; end if;
  if not exists (
    select 1 from public.notifications n
     where n.push_sent_at is null and n.kind is not null and not n.read
       and n.created_at > now() - interval '24 hours'
       and exists (select 1 from public.push_subscriptions s where s.user_id = n.user_id and s.created_at <= n.created_at)
  ) then return; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_secret is null then return; end if;
  perform net.http_post(
    url := 'https://www.auralingoviatestdeutsch.academy/api/push-dispatch',
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000);
end;
$$;

revoke all on function public.push_quiet_now() from public, anon, authenticated;
revoke all on function public.claim_push_batch(integer) from public, anon, authenticated;
revoke all on function public.record_push_results(uuid[], uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public.push_kick() from public, anon, authenticated;
grant execute on function public.claim_push_batch(integer) to service_role;
grant execute on function public.record_push_results(uuid[], uuid[], uuid[]) to service_role;

------------------------------------------------------------------------------
-- 4. The worker re-arms push on a same-day merge, then kicks the dispatcher
------------------------------------------------------------------------------
do $$
declare v_src text;
begin
  select pg_get_functiondef('public.notify_new_content(boolean, uuid)'::regprocedure) into v_src;
  if v_src not like '%push_sent_at%' then
    v_src := replace(v_src, E'read       = false,\n             created_at = now();',
                            E'read       = false,\n             push_sent_at = null,\n             created_at = now();');
    v_src := replace(v_src, E'    delete from public.notifications where kind is not null and read and created_at < now() - interval ''60 days'';\n  end if;',
                            E'    delete from public.notifications where kind is not null and read and created_at < now() - interval ''60 days'';\n    perform public.push_kick();\n  end if;');
    if v_src not like '%push_sent_at = null%' or v_src not like '%push_kick%' then
      raise exception 'notify_new_content patch did not apply';
    end if;
    execute v_src;
  end if;
end $$;

-- Admin broadcast: new audience 'ME' (test on yourself), push kick after sending.
create or replace function public.admin_broadcast_notification(
  p_title text, p_body text, p_url text default null, p_level text default 'ALL', p_dry_run boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_key   text := 'broadcast:' || gen_random_uuid()::text;
  v_me    uuid := auth.uid();
begin
  if not public.is_admin_or_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  p_title := btrim(coalesce(p_title, ''));
  p_body  := btrim(coalesce(p_body, ''));
  if p_title = '' or char_length(p_title) > 120 then raise exception 'title must be 1-120 characters'; end if;
  if p_body  = '' or char_length(p_body)  > 400 then raise exception 'body must be 1-400 characters'; end if;
  if p_level not in ('ALL', 'TELC_B1', 'TELC_B2', 'ME') then raise exception 'bad level'; end if;
  if p_url is not null and p_url <> '' and (left(p_url, 1) <> '/' or left(p_url, 2) = '//') then
    raise exception 'link must be an in-app path starting with a single /';
  end if;

  if p_dry_run then
    select count(*)::int into v_count from public.profiles p
     where (case when p_level = 'ME' then p.id = v_me
                 else (p_level = 'ALL' or p.level::text = p_level)
                      and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false) end);
    return v_count;
  end if;

  insert into public.notifications (user_id, title, body, type, action_url, kind, dedupe_key)
  select p.id, p_title, p_body, 'announcement', nullif(p_url, ''), 'broadcast', v_key
    from public.profiles p
   where (case when p_level = 'ME' then p.id = v_me
               else (p_level = 'ALL' or p.level::text = p_level)
                    and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false) end);
  get diagnostics v_count = row_count;
  perform public.push_kick();
  return v_count;
end;
$$;
revoke all on function public.admin_broadcast_notification(text, text, text, text, boolean) from public, anon;
grant execute on function public.admin_broadcast_notification(text, text, text, text, boolean) to authenticated;

-- How many devices/students have push on (admin panel).
create or replace function public.admin_push_stats() returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_or_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select jsonb_build_object('devices', count(*), 'students', count(distinct user_id)) from public.push_subscriptions);
end;
$$;
revoke all on function public.admin_push_stats() from public, anon;
grant execute on function public.admin_push_stats() to authenticated;

------------------------------------------------------------------------------
-- 5. Schedule: look for pending pushes every 5 minutes (also delivers what
--    waited for the end of quiet hours)
------------------------------------------------------------------------------
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'push-kick';
  perform cron.schedule('push-kick', '*/5 * * * *', 'select public.push_kick()');
exception when others then
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $$;
