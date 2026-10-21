-- Own words for every new theme (owner: "kalimat khassa bih likol thema", not just its name).
--
-- A short note (<= 300 chars, Tunisian Arabic) can be attached to any theme. When the theme is announced, the
-- notification reads:
--     title  "جديد · Hören Teil 2"
--     body   "تزاد تمرين جديد: Matthias ( Neu )"
--            "<the note>"
-- Without a note the second line is simply missing. Editing a note also rewrites the notifications already sent
-- for that theme (read state untouched). Same registry / visibility / push pipeline as before.
-- Idempotent: safe to re-run.

------------------------------------------------------------------------------
-- 1. Notes
------------------------------------------------------------------------------
create table if not exists public.content_notify_notes (
  source     text        not null check (source in ('hoeren', 'lesen', 'sb', 'muendlich')),
  item_id    uuid        not null,
  note       text        not null check (char_length(note) between 1 and 300),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (source, item_id)
);
alter table public.content_notify_notes enable row level security;
revoke all on public.content_notify_notes from anon, authenticated;

------------------------------------------------------------------------------
-- 2. One place that builds the body of a single-theme notification
------------------------------------------------------------------------------
create or replace function public.theme_notification_body(p_source text, p_item_id uuid)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select 'تزاد ' || case when p_source = 'muendlich' then 'موضوع' else 'تمرين' end || ' جديد: '
         || left(coalesce(
              case p_source
                when 'hoeren'    then (select title from public.hoeren_exercises   where id = p_item_id)
                when 'lesen'     then (select title from public.lesen_exercises    where id = p_item_id)
                when 'sb'        then (select title from public.sb_exercises       where id = p_item_id)
                when 'muendlich' then (select title from public.muendlich_materials where id = p_item_id)
              end, ''), 120)
         || coalesce(E'\n' || (select n.note from public.content_notify_notes n where n.source = p_source and n.item_id = p_item_id), '');
$$;
revoke all on function public.theme_notification_body(text, uuid) from public, anon, authenticated;

------------------------------------------------------------------------------
-- 3. The worker (full definition; nothing is ever deleted from notifications)
------------------------------------------------------------------------------
create or replace function public.notify_new_content(p_dry_run boolean default false, p_only_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_single_max constant integer := 6;   -- up to this many new themes per module/teil/level are announced one by one
  v_groups     jsonb := '[]'::jsonb;
  v_inserted   integer := 0;
  v_day        text := to_char(now() at time zone 'Africa/Tunis', 'YYYYMMDD');
  v_prefix     text := case when p_only_user is null then '' else 'test:' end;
  g            record;
  i            record;
  v_label      text;
  v_slug       text;
  v_path       text;
  v_target     integer;
  v_rows       integer;
  v_body       text;
begin
  if not pg_try_advisory_xact_lock(hashtext('notify_new_content')) then
    return jsonb_build_object('skipped', 'another run is in progress');
  end if;

  drop table if exists _cand;
  create temp table _cand on commit drop as
    select v.source, v.item_id, v.teil, v.level, v.title
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
      'mode', case when g.n <= c_single_max then 'single' else 'group' end,
      'titles', case when g.n <= c_single_max
                     then (select jsonb_agg(c.title order by c.title) from _cand c where c.source = g.source and c.teil = g.teil and c.level = g.level)
                     else null end,
      'without_note', case when g.n <= c_single_max
                     then (select coalesce(jsonb_agg(c.title order by c.title), '[]'::jsonb) from _cand c
                            where c.source = g.source and c.teil = g.teil and c.level = g.level
                              and not exists (select 1 from public.content_notify_notes n where n.source = c.source and n.item_id = c.item_id))
                     else null end,
      'recipients', v_target, 'url', v_path);

    if not p_dry_run then
      if g.n <= c_single_max then
        -- one notification per theme, named, with the theme's own words when a note exists
        for i in select c.source, c.item_id from _cand c where c.source = g.source and c.teil = g.teil and c.level = g.level loop
          v_body := public.theme_notification_body(i.source, i.item_id);
          insert into public.notifications (user_id, title, body, type, action_url, kind, dedupe_key, item_count)
          select p.id, 'جديد · ' || v_label, v_body, 'content', v_path, 'content',
                 v_prefix || 'item:' || i.source || ':' || i.item_id, 1
            from public.profiles p
           where (p_only_user is null and p.level::text = g.level
                  and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
              or (p_only_user is not null and p.id = p_only_user)
          on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
          get diagnostics v_rows = row_count;
          v_inserted := v_inserted + v_rows;
        end loop;
      else
        -- big import: one grouped message; same-day additions merge into it
        insert into public.notifications as nt (user_id, title, body, type, action_url, kind, dedupe_key, item_count)
        select p.id,
               'جديد · ' || v_label,
               public.notif_new_content_body(g.n, g.source, v_label),
               'content', v_path, 'content',
               v_prefix || 'content:' || g.source || ':' || g.teil || ':' || g.level || ':' || v_day,
               g.n
          from public.profiles p
         where (p_only_user is null and p.level::text = g.level
                and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
            or (p_only_user is not null and p.id = p_only_user)
        on conflict (user_id, dedupe_key) where dedupe_key is not null do update
           set item_count   = coalesce(nt.item_count, 0) + excluded.item_count,
               body         = public.notif_new_content_body(coalesce(nt.item_count, 0) + excluded.item_count, g.source, v_label),
               read         = false,
               push_sent_at = null,
               created_at   = now();
        get diagnostics v_rows = row_count;
        v_inserted := v_inserted + v_rows;
      end if;
    end if;
  end loop;

  if not p_dry_run and p_only_user is null then
    insert into public.content_notify_seen (source, item_id)
    select source, item_id from _cand
    on conflict do nothing;
    -- Notifications are kept forever: a student can always scroll back to every theme that was added.
    perform public.push_kick();
  end if;

  return jsonb_build_object('dry_run', p_dry_run, 'test_user', p_only_user is not null,
                            'groups', v_groups, 'rows_written', v_inserted);
end;
$$;

revoke all on function public.notify_new_content(boolean, uuid) from public, anon, authenticated;
grant execute on function public.notify_new_content(boolean, uuid) to service_role;

------------------------------------------------------------------------------
-- 4. Admin: write / clear a note, list the latest themes
------------------------------------------------------------------------------
-- Returns how many notifications already sent for this theme were rewritten.
create or replace function public.admin_set_theme_note(p_source text, p_item_id uuid, p_note text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_note    text := btrim(coalesce(p_note, ''));
  v_exists  boolean;
  v_updated integer := 0;
begin
  if not public.is_admin_or_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_source not in ('hoeren', 'lesen', 'sb', 'muendlich') then raise exception 'bad source'; end if;
  if char_length(v_note) > 300 then raise exception 'note must be 300 characters or fewer'; end if;

  v_exists := case p_source
    when 'hoeren'    then exists (select 1 from public.hoeren_exercises    where id = p_item_id)
    when 'lesen'     then exists (select 1 from public.lesen_exercises     where id = p_item_id)
    when 'sb'        then exists (select 1 from public.sb_exercises        where id = p_item_id)
    when 'muendlich' then exists (select 1 from public.muendlich_materials where id = p_item_id)
  end;
  if not v_exists then raise exception 'theme not found'; end if;

  if v_note = '' then
    delete from public.content_notify_notes where source = p_source and item_id = p_item_id;
  else
    insert into public.content_notify_notes (source, item_id, note, updated_by)
    values (p_source, p_item_id, v_note, auth.uid())
    on conflict (source, item_id) do update set note = excluded.note, updated_at = now(), updated_by = excluded.updated_by;
  end if;

  update public.notifications
     set body = public.theme_notification_body(p_source, p_item_id)
   where dedupe_key = 'item:' || p_source || ':' || p_item_id;
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- The latest themes (any visibility), newest first, with their note and announcement state.
create or replace function public.admin_recent_themes(p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_or_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select a.source, a.item_id, a.title, a.teil, a.level, a.created_at,
             n.note,
             exists (select 1 from public.v_notify_visible_content v where v.source = a.source and v.item_id = a.item_id) as visible,
             exists (select 1 from public.content_notify_seen s where s.source = a.source and s.item_id = a.item_id) as announced
        from (
          select 'hoeren'::text source, id item_id, title, teil::int teil, level::text level, created_at from public.hoeren_exercises
          union all select 'lesen', id, title, teil::int, level::text, created_at from public.lesen_exercises
          union all select 'sb', id, title, teil::int, level::text, created_at from public.sb_exercises
          union all select 'muendlich', id, title, teil::int, level::text, created_at from public.muendlich_materials
        ) a
        left join public.content_notify_notes n on n.source = a.source and n.item_id = a.item_id
       order by a.created_at desc
       limit greatest(1, least(p_limit, 100))
    ) t
  );
end;
$$;

revoke all on function public.admin_set_theme_note(text, uuid, text) from public, anon;
revoke all on function public.admin_recent_themes(integer) from public, anon;
grant execute on function public.admin_set_theme_note(text, uuid, text) to authenticated;
grant execute on function public.admin_recent_themes(integer) to authenticated;
