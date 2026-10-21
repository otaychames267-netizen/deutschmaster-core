-- One message PER THEME again, now with the owner's full text (owner: "odhkor kol mawdhou3 wa7doh ... kolon 3le 7idah
-- text m3e salam ..."):
--
--   إضافة موضوع جديد
--   السلام عليكم ورحمة الله وبركاته 🌹
--
--   🎧 تزاد موضوع جديد في Hören Teil 2:
--   1️⃣ Matthias
--      ↳ <optional note>
--
--   🌐 الموضوع موجود توّا في الموقع، ادخلو شوفوه وخدمو عليه مزيان. 💪🔥
--
--   ⚠️ تنبيه: ما تحفظوش الـ Codes ⚠️
--   🤲 توكلوا على الله دائماً.
--   🧠 افهموا ولا تحفظوا: الفهم هو اللي ينجّحكم.
--
--   نتمنى النجاح والتوفيق للجميع 🍀🇩🇪
--
-- Up to 6 new themes per level and run are sent like this, each as its own message. A bigger import (> 6) still becomes
-- one zertify-style digest (20261021190000) so nobody is flooded. announce_theme() re-announces any existing theme on
-- demand (also from the admin page). Nothing is ever deleted. Same registry / visibility / push pipeline as before.
-- Idempotent: safe to re-run.

------------------------------------------------------------------------------
-- 1. Lookups
------------------------------------------------------------------------------
create or replace function public.theme_info(p_source text, p_item_id uuid)
returns table (title text, teil integer, level text)
language sql
stable
set search_path = public, pg_temp
as $$
  select h.title, h.teil::int, h.level::text from public.hoeren_exercises h     where p_source = 'hoeren'    and h.id = p_item_id
  union all
  select l.title, l.teil::int, l.level::text from public.lesen_exercises l       where p_source = 'lesen'     and l.id = p_item_id
  union all
  select s.title, s.teil::int, s.level::text from public.sb_exercises s           where p_source = 'sb'        and s.id = p_item_id
  union all
  select m.title, m.teil::int, m.level::text from public.muendlich_materials m    where p_source = 'muendlich' and m.id = p_item_id;
$$;

create or replace function public.theme_url(p_source text, p_teil integer, p_level text)
returns text
language sql
immutable
as $$
  select '/' || case p_level when 'TELC_B1' then 'b1' else 'b2' end ||
         case p_source
           when 'hoeren'    then '/schriftlich/vorbereitung/hoeren/teil-'          || p_teil
           when 'lesen'     then '/schriftlich/vorbereitung/lesen/teil-'           || p_teil
           when 'sb'        then '/schriftlich/vorbereitung/sprachbausteine/teil-' || p_teil
           else                  '/muendlich/vorbereitung/teil-'                   || p_teil
         end;
$$;

revoke all on function public.theme_info(text, uuid) from public, anon, authenticated;
revoke all on function public.theme_url(text, integer, text) from public, anon, authenticated;

------------------------------------------------------------------------------
-- 2. The message text for ONE theme
------------------------------------------------------------------------------
create or replace function public.theme_message_body(p_source text, p_item_id uuid)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_teil integer;
  v_note text;
  v_out  text;
begin
  select i.teil into v_teil from public.theme_info(p_source, p_item_id) i limit 1;
  select n.note into v_note from public.content_notify_notes n where n.source = p_source and n.item_id = p_item_id;

  v_out := 'السلام عليكم ورحمة الله وبركاته 🌹' || E'\n\n'
        || case p_source when 'hoeren' then '🎧 تزاد موضوع جديد في Hören' when 'lesen' then '📖 تزاد موضوع جديد في Lesen'
                         when 'sb' then '📝 تزاد موضوع جديد في Sprachbausteine' else '🗣️ تزاد موضوع جديد في Mündlich' end
        || ' Teil ' || coalesce(v_teil::text, '') || ':' || E'\n'
        || '1️⃣ ' || public.theme_title(p_source, p_item_id)
        || coalesce(E'\n   ↳ ' || v_note, '')
        || E'\n\n🌐 الموضوع موجود توّا في الموقع، ادخلو شوفوه وخدمو عليه مزيان. 💪🔥'
        || E'\n\n'
        || case when p_source = 'muendlich'
                then '⚠️ تنبيه: ما تحفظوش الأجوبة جاهزة ⚠️'
                else '⚠️ تنبيه: ما تحفظوش الـ Codes ⚠️' end
        || E'\n🤲 توكلوا على الله دائماً.'
        || E'\n🧠 افهموا ولا تحفظوا: الفهم هو اللي ينجّحكم.'
        || E'\n\nنتمنى النجاح والتوفيق للجميع 🍀🇩🇪';
  return v_out;
end;
$$;
revoke all on function public.theme_message_body(text, uuid) from public, anon, authenticated;

------------------------------------------------------------------------------
-- 3. Announce one theme to every student of its level (also re-announces)
------------------------------------------------------------------------------
create or replace function public.announce_theme(p_source text, p_item_id uuid, p_only_user uuid default null, p_at timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text; v_teil integer; v_level text;
  v_body  text;
  v_rows  integer;
begin
  select i.title, i.teil, i.level into v_title, v_teil, v_level from public.theme_info(p_source, p_item_id) i limit 1;
  if v_title is null then raise exception 'theme not found'; end if;
  v_body := public.theme_message_body(p_source, p_item_id);

  insert into public.notifications (user_id, title, body, type, action_url, kind, dedupe_key, item_count, created_at)
  select p.id, 'إضافة موضوع جديد', v_body, 'content', public.theme_url(p_source, v_teil, v_level), 'content',
         case when p_only_user is null then '' else 'test:' end || 'item:' || p_source || ':' || p_item_id, 1,
         coalesce(p_at, clock_timestamp())
    from public.profiles p
   where (p_only_user is null and p.level::text = v_level
          and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
      or (p_only_user is not null and p.id = p_only_user)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do update
     set title = excluded.title, body = excluded.body, action_url = excluded.action_url,
         read = false, push_sent_at = null, created_at = excluded.created_at;
  get diagnostics v_rows = row_count;

  if p_only_user is null then
    insert into public.content_notify_seen (source, item_id) values (p_source, p_item_id) on conflict do nothing;
  end if;
  return v_rows;
end;
$$;
revoke all on function public.announce_theme(text, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.announce_theme(text, uuid, uuid, timestamptz) to service_role;

create or replace function public.admin_announce_theme(p_source text, p_item_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_or_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_source not in ('hoeren', 'lesen', 'sb', 'muendlich') then raise exception 'bad source'; end if;
  return public.announce_theme(p_source, p_item_id, null, null);
end;
$$;
revoke all on function public.admin_announce_theme(text, uuid) from public, anon;
grant execute on function public.admin_announce_theme(text, uuid) to authenticated;

------------------------------------------------------------------------------
-- 4. The worker: per-theme messages (<= 6 new themes per level), digest beyond that
------------------------------------------------------------------------------
create or replace function public.notify_new_content(p_dry_run boolean default false, p_only_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_single_max constant integer := 6;
  v_groups   jsonb := '[]'::jsonb;
  v_previews jsonb := '[]'::jsonb;
  v_inserted integer := 0;
  v_day      text := to_char(now() at time zone 'Africa/Tunis', 'YYYYMMDD');
  v_prefix   text := case when p_only_user is null then '' else 'test:' end;
  g          record;
  l          record;
  i          record;
  v_key      text;
  v_old      jsonb;
  v_new      jsonb;
  v_all      jsonb;
  v_body     text;
  v_url      text;
  v_target   integer;
  v_rows     integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('notify_new_content')) then
    return jsonb_build_object('skipped', 'another run is in progress');
  end if;

  drop table if exists _cand;
  create temp table _cand on commit drop as
    select v.source, v.item_id, v.teil, v.level, v.title
      from public.v_notify_visible_content v
     where not exists (select 1 from public.content_notify_seen s where s.source = v.source and s.item_id = v.item_id);

  for g in select source, teil, level, count(*)::int as n from _cand group by 1, 2, 3 order by 1, 2, 3 loop
    v_groups := v_groups || jsonb_build_object(
      'source', g.source, 'teil', g.teil, 'level', g.level, 'new_items', g.n,
      'titles', (select jsonb_agg(public.theme_title(c.source, c.item_id) order by c.title) from _cand c where c.source = g.source and c.teil = g.teil and c.level = g.level),
      'without_note', (select coalesce(jsonb_agg(public.theme_title(c.source, c.item_id) order by c.title), '[]'::jsonb) from _cand c
                        where c.source = g.source and c.teil = g.teil and c.level = g.level
                          and not exists (select 1 from public.content_notify_notes n where n.source = c.source and n.item_id = c.item_id)));
  end loop;

  for l in select level, count(*)::int as n from _cand group by 1 order by 1 loop
    select count(*)::int into v_target
      from public.profiles p
     where (p_only_user is null and p.level::text = l.level
            and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
        or (p_only_user is not null and p.id = p_only_user);

    if l.n <= c_single_max then
      -- every theme as its own message
      for i in select c.source, c.item_id, c.teil, c.title from _cand c where c.level = l.level order by c.source, c.teil, c.title loop
        v_body := public.theme_message_body(i.source, i.item_id);
        v_url  := public.theme_url(i.source, i.teil, l.level);
        v_previews := v_previews || jsonb_build_object('level', l.level, 'label', public.theme_title(i.source, i.item_id),
                                                       'recipients', v_target, 'url', v_url, 'merges_into_todays', false, 'preview', v_body);
        if not p_dry_run then
          insert into public.notifications (user_id, title, body, type, action_url, kind, dedupe_key, item_count, created_at)
          select p.id, 'إضافة موضوع جديد', v_body, 'content', v_url, 'content',
                 v_prefix || 'item:' || i.source || ':' || i.item_id, 1, clock_timestamp()
            from public.profiles p
           where (p_only_user is null and p.level::text = l.level
                  and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
              or (p_only_user is not null and p.id = p_only_user)
          on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
          get diagnostics v_rows = row_count;
          v_inserted := v_inserted + v_rows;
        end if;
      end loop;
    else
      -- big import: one digest, same-day additions merge into it
      v_key := v_prefix || 'digest:' || l.level || ':' || v_day;
      select d.items into v_old from public.content_digests d where d.digest_key = v_key;
      select jsonb_agg(jsonb_build_object('source', c.source, 'teil', c.teil, 'item_id', c.item_id)) into v_new from _cand c where c.level = l.level;
      select jsonb_agg(x) into v_all from (select distinct x from jsonb_array_elements(coalesce(v_old, '[]'::jsonb) || v_new) x) s;
      v_body := public.digest_body(v_all);
      v_url  := public.digest_url(v_all, l.level);
      v_previews := v_previews || jsonb_build_object('level', l.level, 'label', jsonb_array_length(v_all) || ' Themen (Sammel-Mitteilung)',
                                                     'recipients', v_target, 'url', v_url, 'merges_into_todays', v_old is not null, 'preview', v_body);
      if not p_dry_run then
        insert into public.content_digests (digest_key, level, items) values (v_key, l.level, v_all)
        on conflict (digest_key) do update set items = excluded.items, updated_at = now();
        insert into public.notifications as nt (user_id, title, body, type, action_url, kind, dedupe_key, item_count)
        select p.id, 'إضافة مواضيع جديدة', v_body, 'content', v_url, 'content', v_key, jsonb_array_length(v_all)
          from public.profiles p
         where (p_only_user is null and p.level::text = l.level
                and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
            or (p_only_user is not null and p.id = p_only_user)
        on conflict (user_id, dedupe_key) where dedupe_key is not null do update
           set body = excluded.body, action_url = excluded.action_url, item_count = excluded.item_count,
               read = false, push_sent_at = null, created_at = now();
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
                            'groups', v_groups, 'digests', v_previews, 'rows_written', v_inserted);
end;
$$;

revoke all on function public.notify_new_content(boolean, uuid) from public, anon, authenticated;
grant execute on function public.notify_new_content(boolean, uuid) to service_role;

------------------------------------------------------------------------------
-- 5. Editing a note rewrites the theme's own message and every digest that lists it
------------------------------------------------------------------------------
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
  v_rows    integer;
  d         record;
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

  update public.notifications set body = public.theme_message_body(p_source, p_item_id)
   where dedupe_key = 'item:' || p_source || ':' || p_item_id;
  get diagnostics v_updated = row_count;

  for d in
    select digest_key, items from public.content_digests
     where items @> jsonb_build_array(jsonb_build_object('source', p_source, 'item_id', p_item_id::text))
  loop
    update public.notifications set body = public.digest_body(d.items) where dedupe_key = d.digest_key;
    get diagnostics v_rows = row_count;
    v_updated := v_updated + v_rows;
  end loop;
  return v_updated;
end;
$$;
revoke all on function public.admin_set_theme_note(text, uuid, text) from public, anon;
grant execute on function public.admin_set_theme_note(text, uuid, text) to authenticated;
