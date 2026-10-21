-- Urgent notices ("alert"): a notification type that gets its own striking look in the app (ruby/amber card, red bell badge)
-- and goes out as a high-urgency push that stays on screen until dismissed.
--   * admin_broadcast_notification(..., p_alert) writes type 'alert' instead of 'announcement'
--   * claim_push_batch also returns the notification type, so /api/push-dispatch can style the push
-- Idempotent: safe to re-run.

------------------------------------------------------------------------------
-- 1. claim_push_batch: same rules as 20261020150000, plus "type" in the result
------------------------------------------------------------------------------
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
    returning n.id, n.user_id, n.title, n.body, n.type, n.action_url, n.kind, n.dedupe_key, n.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'title', p.title, 'body', p.body, 'type', p.type, 'url', p.action_url, 'kind', p.kind,
           'tag', coalesce(p.dedupe_key, p.id::text),
           'subs', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
                      from public.push_subscriptions s where s.user_id = p.user_id and s.created_at <= p.created_at)
         )), '[]'::jsonb)
    into v_out
    from picked p;
  return v_out;
end;
$$;
revoke all on function public.claim_push_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_push_batch(integer) to service_role;

------------------------------------------------------------------------------
-- 2. admin broadcast with an "urgent" switch (replaces the 5-argument version)
------------------------------------------------------------------------------
drop function if exists public.admin_broadcast_notification(text, text, text, text, boolean);

create or replace function public.admin_broadcast_notification(
  p_title text, p_body text, p_url text default null, p_level text default 'ALL', p_dry_run boolean default false,
  p_alert boolean default false)
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
  if p_body  = '' or char_length(p_body)  > 1200 then raise exception 'body must be 1-1200 characters'; end if;
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
  select p.id, p_title, p_body, case when p_alert then 'alert' else 'announcement' end, nullif(p_url, ''), 'broadcast', v_key
    from public.profiles p
   where (case when p_level = 'ME' then p.id = v_me
               else (p_level = 'ALL' or p.level::text = p_level)
                    and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false) end);
  get diagnostics v_count = row_count;
  perform public.push_kick();
  return v_count;
end;
$$;
revoke all on function public.admin_broadcast_notification(text, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.admin_broadcast_notification(text, text, text, text, boolean, boolean) to authenticated;
