-- Zertify-style announcement: ONE message per update, not one per theme (owner showed zertify's bell).
--
--   إضافة مواضيع جديدة
--   السلام الخوت، 👋✨
--   تزادو مواضيع جداد في الموقع 🚀
--
--   🎧 Hören Teil 2:
--   1️⃣ Matthias
--
--   📖 Lesen Teil 3:
--   1️⃣ Ausflug (معدل)
--   2️⃣ Berlin (معدل)
--
--   🌐 كل شي موجود توّا في الموقع، ادخلو شوفوهم وخدمو عليهم مزيان. 💪🔥
--   بالتوفيق للجميع! 🍀🇩🇪
--
-- Themes are grouped by module/Teil and numbered; an optional per-theme note (content_notify_notes) shows under the
-- theme's line. Same-day additions for a level MERGE into that day's message (the list grows, it is marked unread
-- again and pushed again). A very big import (> 15 themes in one message) lists counts per Teil instead of names.
-- Nothing is ever deleted. Same registry / visibility / push pipeline as before.
-- Idempotent: safe to re-run.

------------------------------------------------------------------------------
-- 1. State of each day's message (which themes it lists)
------------------------------------------------------------------------------
create table if not exists public.content_digests (
  digest_key text        primary key,          -- [test:]digest:<LEVEL>:<YYYYMMDD Tunis>
  level      text        not null,
  items      jsonb       not null,             -- [{source, teil, item_id}]
  updated_at timestamptz not null default now()
);
alter table public.content_digests enable row level security;
revoke all on public.content_digests from anon, authenticated;

------------------------------------------------------------------------------
-- 2. Text builders
------------------------------------------------------------------------------
-- Theme name as students know it: the "( Neu )" marker is a UI badge, zertify does not write it in the list.
create or replace function public.theme_title(p_source text, p_item_id uuid)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select btrim(regexp_replace(coalesce(
           case p_source
             when 'hoeren'    then (select title from public.hoeren_exercises    where id = p_item_id)
             when 'lesen'     then (select title from public.lesen_exercises     where id = p_item_id)
             when 'sb'        then (select title from public.sb_exercises        where id = p_item_id)
             when 'muendlich' then (select title from public.muendlich_materials where id = p_item_id)
           end, ''), '\s*\(\s*Neu\s*\)\s*$', ''));
$$;

create or replace function public.digest_body(p_items jsonb)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  c_num  constant text[] := array['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  v_n    integer := jsonb_array_length(p_items);
  v_list boolean := jsonb_array_length(p_items) <= 15;
  v_out  text;
  v_note text;
  v_i    integer;
  g      record;
  it     record;
begin
  v_out := 'السلام الخوت، 👋✨' || E'\n'
        || case when v_n = 1 then 'تزاد موضوع جديد في الموقع 🚀' else 'تزادو مواضيع جداد في الموقع 🚀' end;

  for g in
    select x.src, x.teil, count(*)::int as n
      from (select e->>'source' as src, (e->>'teil')::int as teil from jsonb_array_elements(p_items) e) x
     group by x.src, x.teil
     order by case x.src when 'hoeren' then 1 when 'lesen' then 2 when 'sb' then 3 else 4 end, x.teil
  loop
    v_out := v_out || E'\n\n'
          || case g.src when 'hoeren' then '🎧 Hören' when 'lesen' then '📖 Lesen' when 'sb' then '📝 Sprachbausteine' else '🗣️ Mündlich' end
          || ' Teil ' || g.teil || ':';
    if v_list then
      v_i := 0;
      for it in
        select e->>'source' as src, (e->>'item_id')::uuid as id, public.theme_title(e->>'source', (e->>'item_id')::uuid) as title
          from jsonb_array_elements(p_items) e
         where e->>'source' = g.src and (e->>'teil')::int = g.teil
         order by 3
      loop
        v_i := v_i + 1;
        v_out := v_out || E'\n' || case when v_i <= 10 then c_num[v_i] else v_i || '.' end || ' ' || it.title;
        select n.note into v_note from public.content_notify_notes n where n.source = it.src and n.item_id = it.id;
        if v_note is not null then v_out := v_out || E'\n   ↳ ' || v_note; end if;
      end loop;
    else
      v_out := v_out || E'\n' || g.n || ' ' || case when g.n = 1 then 'موضوع جديد' else 'مواضيع جداد' end;
    end if;
  end loop;

  return v_out || E'\n\n'
      || case when v_n = 1 then '🌐 الموضوع موجود توّا في الموقع، ادخلو شوفوه وخدمو عليه مزيان. 💪🔥'
              else            '🌐 كل شي موجود توّا في الموقع، ادخلو شوفوهم وخدمو عليهم مزيان. 💪🔥' end
      || E'\n' || 'بالتوفيق للجميع! 🍀🇩🇪';
end;
$$;

-- Where a tap on the message goes: the Teil page when it is about one Teil, else the matching hub.
create or replace function public.digest_url(p_items jsonb, p_level text)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_slug  text := case p_level when 'TELC_B1' then 'b1' else 'b2' end;
  v_teils integer;
  v_src   text;
  v_teil  integer;
  v_all_m boolean;
begin
  select count(distinct (e->>'source') || ':' || (e->>'teil')), min(e->>'source'), min((e->>'teil')::int),
         bool_and(e->>'source' = 'muendlich')
    into v_teils, v_src, v_teil, v_all_m
    from jsonb_array_elements(p_items) e;
  if v_teils = 1 then
    return case v_src
      when 'hoeren'    then '/' || v_slug || '/schriftlich/vorbereitung/hoeren/teil-'          || v_teil
      when 'lesen'     then '/' || v_slug || '/schriftlich/vorbereitung/lesen/teil-'           || v_teil
      when 'sb'        then '/' || v_slug || '/schriftlich/vorbereitung/sprachbausteine/teil-' || v_teil
      else                  '/' || v_slug || '/muendlich/vorbereitung/teil-'                   || v_teil
    end;
  end if;
  return '/' || v_slug || case when v_all_m then '/muendlich/vorbereitung' else '/schriftlich/vorbereitung' end;
end;
$$;

revoke all on function public.theme_title(text, uuid) from public, anon, authenticated;
revoke all on function public.digest_body(jsonb) from public, anon, authenticated;
revoke all on function public.digest_url(jsonb, text) from public, anon, authenticated;

------------------------------------------------------------------------------
-- 3. The worker: one message per level per run (merged into today's if it exists)
------------------------------------------------------------------------------
create or replace function public.notify_new_content(p_dry_run boolean default false, p_only_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_groups   jsonb := '[]'::jsonb;
  v_digests  jsonb := '[]'::jsonb;
  v_inserted integer := 0;
  v_day      text := to_char(now() at time zone 'Africa/Tunis', 'YYYYMMDD');
  v_prefix   text := case when p_only_user is null then '' else 'test:' end;
  g          record;
  l          record;
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

  -- what is new, per module/Teil/level (for the admin dry-run table)
  for g in select source, teil, level, count(*)::int as n from _cand group by 1, 2, 3 order by 1, 2, 3 loop
    v_groups := v_groups || jsonb_build_object(
      'source', g.source, 'teil', g.teil, 'level', g.level, 'new_items', g.n, 'mode', 'digest',
      'titles', (select jsonb_agg(public.theme_title(c.source, c.item_id) order by c.title) from _cand c where c.source = g.source and c.teil = g.teil and c.level = g.level),
      'without_note', (select coalesce(jsonb_agg(public.theme_title(c.source, c.item_id) order by c.title), '[]'::jsonb) from _cand c
                        where c.source = g.source and c.teil = g.teil and c.level = g.level
                          and not exists (select 1 from public.content_notify_notes n where n.source = c.source and n.item_id = c.item_id)));
  end loop;

  -- one message per level
  for l in select distinct level from _cand order by 1 loop
    v_key := v_prefix || 'digest:' || l.level || ':' || v_day;
    select d.items into v_old from public.content_digests d where d.digest_key = v_key;
    select jsonb_agg(jsonb_build_object('source', c.source, 'teil', c.teil, 'item_id', c.item_id))
      into v_new from _cand c where c.level = l.level;
    select jsonb_agg(x) into v_all from (select distinct x from jsonb_array_elements(coalesce(v_old, '[]'::jsonb) || v_new) x) s;
    v_body := public.digest_body(v_all);
    v_url  := public.digest_url(v_all, l.level);

    select count(*)::int into v_target
      from public.profiles p
     where (p_only_user is null and p.level::text = l.level
            and not coalesce(p.suspended, false) and not coalesce(p.is_banned, false))
        or (p_only_user is not null and p.id = p_only_user);

    v_digests := v_digests || jsonb_build_object(
      'level', l.level, 'themes', jsonb_array_length(v_all), 'recipients', v_target, 'url', v_url,
      'merges_into_todays', v_old is not null, 'preview', v_body);

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
  end loop;

  if not p_dry_run and p_only_user is null then
    insert into public.content_notify_seen (source, item_id)
    select source, item_id from _cand
    on conflict do nothing;
    -- Notifications are kept forever: a student can always scroll back to every theme that was added.
    perform public.push_kick();
  end if;

  return jsonb_build_object('dry_run', p_dry_run, 'test_user', p_only_user is not null,
                            'groups', v_groups, 'digests', v_digests, 'rows_written', v_inserted);
end;
$$;

revoke all on function public.notify_new_content(boolean, uuid) from public, anon, authenticated;
grant execute on function public.notify_new_content(boolean, uuid) to service_role;

------------------------------------------------------------------------------
-- 4. Editing a note also rewrites every message that lists the theme
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

------------------------------------------------------------------------------
-- 5. One-time conversion: the per-theme notifications sent on 2026-10-21 become ONE message per level
--    (only runs while 'item:%' rows exist; recipients stay exactly the same students)
------------------------------------------------------------------------------
do $$
declare
  l       record;
  v_items jsonb;
  v_key   text;
  v_day   text;
  v_body  text;
  v_url   text;
  v_users uuid[];
begin
  for l in
    select x.level, min(n.created_at) as first_at
      from public.notifications n
      join lateral (
        select v.level
          from public.v_notify_visible_content v
         where v.source = split_part(n.dedupe_key, ':', 2) and v.item_id::text = split_part(n.dedupe_key, ':', 3)
         limit 1
      ) x on true
     where n.dedupe_key like 'item:%'
     group by x.level
  loop
    v_day := to_char(l.first_at at time zone 'Africa/Tunis', 'YYYYMMDD');
    v_key := 'digest:' || l.level || ':' || v_day;

    select jsonb_agg(distinct jsonb_build_object('source', v.source, 'teil', v.teil, 'item_id', v.item_id))
      into v_items
      from (select distinct split_part(dedupe_key, ':', 2) as src, split_part(dedupe_key, ':', 3) as id
              from public.notifications where dedupe_key like 'item:%') k
      join public.v_notify_visible_content v on v.source = k.src and v.item_id::text = k.id and v.level = l.level;

    v_body := public.digest_body(v_items);
    v_url  := public.digest_url(v_items, l.level);

    with gone as (
      delete from public.notifications n
       where n.dedupe_key like 'item:%'
         and exists (select 1 from public.v_notify_visible_content v
                      where v.source = split_part(n.dedupe_key, ':', 2) and v.item_id::text = split_part(n.dedupe_key, ':', 3) and v.level = l.level)
      returning n.user_id
    )
    select array_agg(distinct user_id) into v_users from gone;

    insert into public.content_digests (digest_key, level, items) values (v_key, l.level, v_items)
    on conflict (digest_key) do update set items = excluded.items, updated_at = now();

    insert into public.notifications (user_id, title, body, type, action_url, kind, dedupe_key, item_count)
    select u, 'إضافة مواضيع جديدة', v_body, 'content', v_url, 'content', v_key, jsonb_array_length(v_items)
      from unnest(v_users) u
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end loop;
end $$;
