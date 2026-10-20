-- In-app "new content" notifications (zertify-style).
--
-- Whenever new exercises / topics become VISIBLE to students (Hören, Lesen,
-- Sprachbausteine, Mündlich), every student of that level gets ONE grouped
-- notification per (module, teil) — never one per exercise. Runs every 30 min
-- via pg_cron; an admin can also trigger it or broadcast a free-text message.
--
-- "New" is decided by a registry (content_notify_seen), not by created_at:
-- items are often imported hidden and unhidden days later, and an item whose
-- Tunisia notice is removed later must also count as new the moment it
-- becomes visible. Visible == exactly what the student pages show:
--   not is_hidden  AND  (no Tunisia notice  OR  Hören Teil 1, which reveals them)
-- Mündlich: not is_unassigned_center.
--
-- Same-day additions to the same group are merged into the existing
-- notification (count accumulates, it is marked unread again), so a long
-- import session does not spam anyone.
--
-- Idempotent: safe to re-run.

------------------------------------------------------------------------------
-- 1. notifications: grouping columns
------------------------------------------------------------------------------
alter table public.notifications add column if not exists kind text;
alter table public.notifications add column if not exists dedupe_key text;
alter table public.notifications add column if not exists item_count integer;

create unique index if not exists notifications_user_dedupe_uidx
  on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

------------------------------------------------------------------------------
-- 2. Registry of items students have already been told about
------------------------------------------------------------------------------
create table if not exists public.content_notify_seen (
  source  text        not null,
  item_id uuid        not null,
  seen_at timestamptz not null default now(),
  primary key (source, item_id)
);
alter table public.content_notify_seen enable row level security;
-- No policies: only SECURITY DEFINER functions / service role touch it.

------------------------------------------------------------------------------
-- 3. Message text (Tunisian Arabic, German module names stay as students know them)
------------------------------------------------------------------------------
create or replace function public.notif_new_content_body(p_n integer, p_source text, p_label text)
returns text
language sql
immutable
as $$
  select case
    when p_n = 1 then 'تزاد ' || (case when p_source = 'muendlich' then 'موضوع' else 'تمرين' end) || ' جديد في ' || p_label || '. ادخل جرّبو توّا.'
    when p_n = 2 then 'تزادو ' || (case when p_source = 'muendlich' then 'موضوعين' else 'تمرينين' end) || ' جداد في ' || p_label || '. ادخل جرّبهم توّا.'
    when p_n <= 10 then 'تزادو ' || p_n || ' ' || (case when p_source = 'muendlich' then 'مواضيع' else 'تمارين' end) || ' جداد في ' || p_label || '. ادخل جرّبهم توّا.'
    else 'تزادو ' || p_n || ' ' || (case when p_source = 'muendlich' then 'موضوع' else 'تمرين' end) || ' جداد في ' || p_label || '. ادخل جرّبهم توّا.'
  end;
$$;

------------------------------------------------------------------------------
-- 4. The visible-content view the notifier reads
------------------------------------------------------------------------------
create or replace view public.v_notify_visible_content as
  select 'hoeren'::text as source, h.id as item_id, h.teil::int as teil, h.level::text as level
    from public.hoeren_exercises h
   where not h.is_hidden
     and (h.teil::int = 1 or h.import_notes is null
          or h.import_notes not like '%هذه التمارين لم تدرج في تونس بعد%')
  union all
  select 'lesen', l.id, l.teil::int, l.level::text
    from public.lesen_exercises l
   where not l.is_hidden
     and (l.import_notes is null or l.import_notes not like '%هذه التمارين لم تدرج في تونس بعد%')
  union all
  select 'sb', s.id, s.teil::int, s.level::text
    from public.sb_exercises s
   where not s.is_hidden
     and (s.import_notes is null or s.import_notes not like '%هذه التمارين لم تدرج في تونس بعد%')
  union all
  select 'muendlich', m.id, m.teil::int, m.level::text
    from public.muendlich_materials m
   where not coalesce(m.is_unassigned_center, false);

revoke all on public.v_notify_visible_content from public, anon, authenticated;

------------------------------------------------------------------------------
-- 5. First run: everything visible today counts as already seen (no flood)
------------------------------------------------------------------------------
insert into public.content_notify_seen (source, item_id)
select source, item_id from public.v_notify_visible_content
 where not exists (select 1 from public.content_notify_seen)
on conflict do nothing;

------------------------------------------------------------------------------
-- 6. notify_new_content — the worker
--    p_dry_run   : report only, change nothing
--    p_only_user : test mode — write for that user only (any level), prefix the
--                  dedupe key with 'test:' and do NOT mark items as seen
------------------------------------------------------------------------------
create or replace function public.notify_new_content(p_dry_run boolean default false, p_only_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_groups     jsonb := '[]'::jsonb;
  v_inserted   integer := 0;
  v_day        text := to_char(now() at time zone 'Africa/Tunis', 'YYYYMMDD');
  g            record;
  v_label      text;
  v_slug       text;
  v_path       text;
  v_target     integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('notify_new_content')) then
    return jsonb_build_object('skipped', 'another run is in progress');
  end if;

  drop table if exists _cand;
  create temp table _cand on commit drop as
    select v.source, v.item_id, v.teil, v.level
      from public.v_notify_visible_content v
     where not exists (select 1 from public.content_notify_seen s where s.source = v.source and s.item_id = v.item_id);

  for g in
    select source, teil, level, count(*)::int as n from _cand group by 1, 2, 3 order by 1, 2, 3
  loop
    v_label := case g.source
      when 'hoeren'    then 'Hören Teil '
      when 'lesen'     then 'Lesen Teil '
      when 'sb'        then 'Sprachbausteine Teil '
      else                  'Mündlich Teil '
    end || g.teil;
    v_slug := case g.level when 'TELC_B1' then 'b1' else 'b2' end;
    v_path := case g.source
      when 'hoeren'    then '/' || v_slug || '/schriftlich/vorbereitung/hoeren/teil-'          || g.teil
      when 'lesen'     then '/' || v_slug || '/schriftlich/vorbereitung/lesen/teil-'           || g.teil
      when 'sb'        then '/' || v_slug || '/schriftlich/vorbereitung/sprachbausteine/teil-' || g.teil
      else                  '/' || v_slug || '/muendlich/vorbereitung/teil-'                   || g.teil
    end;

    select count(*)::int into v_target
      from public.profiles p
     where (p_only_user is null and p.level::text = g.level
            and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
        or (p_only_user is not null and p.id = p_only_user);

    v_groups := v_groups || jsonb_build_object(
      'source', g.source, 'teil', g.teil, 'level', g.level, 'new_items', g.n,
      'recipients', v_target, 'url', v_path);

    if not p_dry_run then
      insert into public.notifications as nt (user_id, title, body, type, action_url, kind, dedupe_key, item_count)
      select p.id,
             'جديد · ' || v_label,
             public.notif_new_content_body(g.n, g.source, v_label),
             'content', v_path, 'content',
             (case when p_only_user is null then '' else 'test:' end)
               || 'content:' || g.source || ':' || g.teil || ':' || g.level || ':' || v_day,
             g.n
        from public.profiles p
       where (p_only_user is null and p.level::text = g.level
              and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
          or (p_only_user is not null and p.id = p_only_user)
      on conflict (user_id, dedupe_key) where dedupe_key is not null do update
         set item_count = coalesce(nt.item_count, 0) + excluded.item_count,
             body       = public.notif_new_content_body(coalesce(nt.item_count, 0) + excluded.item_count, g.source, v_label),
             read       = false,
             created_at = now();
      get diagnostics v_target = row_count;
      v_inserted := v_inserted + v_target;
    end if;
  end loop;

  if not p_dry_run and p_only_user is null then
    insert into public.content_notify_seen (source, item_id)
    select source, item_id from _cand
    on conflict do nothing;

    -- Retention: grouped / broadcast rows only (welcome rows have kind NULL).
    delete from public.notifications where kind is not null and read and created_at < now() - interval '60 days';
  end if;

  return jsonb_build_object('dry_run', p_dry_run, 'test_user', p_only_user is not null,
                            'groups', v_groups, 'rows_written', v_inserted);
end;
$$;

revoke all on function public.notify_new_content(boolean, uuid) from public, anon, authenticated;
grant execute on function public.notify_new_content(boolean, uuid) to service_role;

------------------------------------------------------------------------------
-- 7. Admin entry points (the SECURITY DEFINER worker is not callable by users)
------------------------------------------------------------------------------
create or replace function public.admin_notify_run(p_dry_run boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_or_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.notify_new_content(p_dry_run, null);
end;
$$;

-- p_level: 'ALL' | 'TELC_B1' | 'TELC_B2'. action_url must be an in-app path.
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
begin
  if not public.is_admin_or_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  p_title := btrim(coalesce(p_title, ''));
  p_body  := btrim(coalesce(p_body, ''));
  if p_title = '' or char_length(p_title) > 120 then raise exception 'title must be 1-120 characters'; end if;
  if p_body  = '' or char_length(p_body)  > 400 then raise exception 'body must be 1-400 characters'; end if;
  if p_level not in ('ALL', 'TELC_B1', 'TELC_B2') then raise exception 'bad level'; end if;
  if p_url is not null and p_url <> '' and (left(p_url, 1) <> '/' or left(p_url, 2) = '//') then
    raise exception 'link must be an in-app path starting with a single /';
  end if;

  if p_dry_run then
    select count(*)::int into v_count from public.profiles p
     where (p_level = 'ALL' or p.level::text = p_level)
       and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false);
    return v_count;
  end if;

  insert into public.notifications (user_id, title, body, type, action_url, kind, dedupe_key)
  select p.id, p_title, p_body, 'announcement', nullif(p_url, ''), 'broadcast', v_key
    from public.profiles p
   where (p_level = 'ALL' or p.level::text = p_level)
     and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_notify_run(boolean) from public, anon;
revoke all on function public.admin_broadcast_notification(text, text, text, text, boolean) from public, anon;
grant execute on function public.admin_notify_run(boolean) to authenticated;
grant execute on function public.admin_broadcast_notification(text, text, text, text, boolean) to authenticated;

------------------------------------------------------------------------------
-- 8. Schedule: every 30 minutes (pg_cron). Skipped silently where pg_cron is
--    not available; an admin can still run it from the admin page.
------------------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'notify-new-content';
  perform cron.schedule('notify-new-content', '*/30 * * * *', 'select public.notify_new_content()');
exception when others then
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $$;

-- Belt and braces: the registry is internal (RLS already hides every row).
revoke all on public.content_notify_seen from anon, authenticated;
