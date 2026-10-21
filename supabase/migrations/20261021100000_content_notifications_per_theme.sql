-- Content notifications: one notification PER THEME (owner: "kolon 3le 7idaa", each on its own).
--
-- Until now every (module, teil, level) got ONE grouped message ("3 new exercises in Hören Teil 2").
-- Now a handful of new themes is announced by NAME, one notification each:
--     title  "جديد · Hören Teil 2"     body  "تزاد تمرين جديد: Matthias ( Neu )"
-- A big import (more than 6 new themes in the same module/teil/level, e.g. 40 Mündlich topics at once) is
-- still grouped into a single message so nobody gets flooded.
--
-- Same registry, same visibility rules, same push pipeline as 20261020120000 / 20261020150000.
-- Idempotent: safe to re-run.

-- 1. the view also exposes the theme's title (new column goes last: CREATE OR REPLACE VIEW allows that)
create or replace view public.v_notify_visible_content as
  select 'hoeren'::text as source, h.id as item_id, h.teil::int as teil, h.level::text as level, h.title as title
    from public.hoeren_exercises h
   where not h.is_hidden
     and (h.teil::int = 1 or h.import_notes is null
          or h.import_notes not like '%هذه التمارين لم تدرج في تونس بعد%')
  union all
  select 'lesen', l.id, l.teil::int, l.level::text, l.title
    from public.lesen_exercises l
   where not l.is_hidden
     and (l.import_notes is null or l.import_notes not like '%هذه التمارين لم تدرج في تونس بعد%')
  union all
  select 'sb', s.id, s.teil::int, s.level::text, s.title
    from public.sb_exercises s
   where not s.is_hidden
     and (s.import_notes is null or s.import_notes not like '%هذه التمارين لم تدرج في تونس بعد%')
  union all
  select 'muendlich', m.id, m.teil::int, m.level::text, m.title
    from public.muendlich_materials m
   where not coalesce(m.is_unassigned_center, false);

revoke all on public.v_notify_visible_content from public, anon, authenticated;

-- 2. the worker
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
  v_label      text;
  v_noun       text;
  v_slug       text;
  v_path       text;
  v_target     integer;
  v_rows       integer;
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
    v_noun := case when g.source = 'muendlich' then 'موضوع' else 'تمرين' end;
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
      'recipients', v_target, 'url', v_path);

    if not p_dry_run then
      if g.n <= c_single_max then
        -- one notification per theme, named
        insert into public.notifications (user_id, title, body, type, action_url, kind, dedupe_key, item_count)
        select p.id,
               'جديد · ' || v_label,
               'تزاد ' || v_noun || ' جديد: ' || left(c.title, 120),
               'content', v_path, 'content',
               v_prefix || 'item:' || c.source || ':' || c.item_id,
               1
          from _cand c
          join public.profiles p
            on (p_only_user is null and p.level::text = c.level
                and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
            or (p_only_user is not null and p.id = p_only_user)
         where c.source = g.source and c.teil = g.teil and c.level = g.level
        on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
        get diagnostics v_rows = row_count;
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
      end if;
      v_inserted := v_inserted + v_rows;
    end if;
  end loop;

  if not p_dry_run and p_only_user is null then
    insert into public.content_notify_seen (source, item_id)
    select source, item_id from _cand
    on conflict do nothing;

    -- Retention: grouped / broadcast rows only (welcome rows have kind NULL).
    delete from public.notifications where kind is not null and read and created_at < now() - interval '60 days';
    perform public.push_kick();
  end if;

  return jsonb_build_object('dry_run', p_dry_run, 'test_user', p_only_user is not null,
                            'groups', v_groups, 'rows_written', v_inserted);
end;
$$;

revoke all on function public.notify_new_content(boolean, uuid) from public, anon, authenticated;
grant execute on function public.notify_new_content(boolean, uuid) to service_role;
