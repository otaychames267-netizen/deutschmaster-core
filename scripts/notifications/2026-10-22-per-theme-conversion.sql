-- One-off (2026-10-22): the owner wants every theme announced on its own with the full text, in the order he listed them,
-- instead of the single zertify-style message that held 8 themes.
--   his list : Matthias (Hören T2), Carina version 3, In Raum C23 version 2 (Hören T3), Sport ist gesund (معدل) (Lesen T1),
--              Jugend forscht version 3  [Inseln (معدل) does not exist in our DB yet -> not announced]
--   the rest : Ausflug, Berlin, Musik, Stadtführer (Lesen T3 معدل), Buchmesse, Sonderausstellung (Mündlich T3)
-- Replaces the digest rows (B2, 1,380 students) by one message per theme. created_at is staggered by a minute so the bell
-- shows them in this order, first = newest.
do $$
declare
  c_items constant jsonb := jsonb_build_array(
    jsonb_build_object('source', 'hoeren',    'level', 'TELC_B2', 'title', 'Matthias ( Neu )'),
    jsonb_build_object('source', 'hoeren',    'level', 'TELC_B2', 'title', 'Carina (معدل) (Neu session Mai)'),
    jsonb_build_object('source', 'hoeren',    'level', 'TELC_B2', 'title', 'In Raum C23 (المعدل) ( Neu )'),
    jsonb_build_object('source', 'lesen',     'level', 'TELC_B2', 'title', 'Sport ist gesund (معدل) ( Neu )', 'id_prefix', 'eff34ac3'),
    jsonb_build_object('source', 'lesen',     'level', 'TELC_B2', 'title', 'Jugend forscht (معدل 1) ( Neu )'),
    jsonb_build_object('source', 'lesen',     'level', 'TELC_B2', 'title', 'Ausflug (معدل) ( Neu )'),
    jsonb_build_object('source', 'lesen',     'level', 'TELC_B2', 'title', 'Berlin (معدل) ( Neu )'),
    jsonb_build_object('source', 'lesen',     'level', 'TELC_B2', 'title', 'Musik (معدل) ( Neu )'),
    jsonb_build_object('source', 'lesen',     'level', 'TELC_B2', 'title', 'Stadtführer (معدل) ( Neu )'),
    jsonb_build_object('source', 'muendlich', 'level', 'TELC_B2', 'title', 'Buchmesse im Kulturzentrum mitplanen'),
    jsonb_build_object('source', 'muendlich', 'level', 'TELC_B2', 'title', 'Eröffnungsveranstaltung für eine Sonderausstellung im Museum planen'));
  e       jsonb;
  idx     integer := 0;
  v_id    uuid;
  v_n     integer;
  v_rows  integer;
  v_base  timestamptz := clock_timestamp();
begin
  -- grounded notes for the two new ones (the owner's "version 3"; our import notes call both the third variant)
  insert into public.content_notify_notes (source, item_id, note)
  select 'hoeren', id, 'النسخة الثالثة من تمرين Carina (معدلة، session Mai).' from public.hoeren_exercises
   where title = 'Carina (معدل) (Neu session Mai)' and level = 'TELC_B2'
  on conflict (source, item_id) do update set note = excluded.note, updated_at = now();
  insert into public.content_notify_notes (source, item_id, note)
  select 'lesen', id, 'النسخة الثالثة من تمرين Jugend forscht (معدل 1).' from public.lesen_exercises
   where title = 'Jugend forscht (معدل 1) ( Neu )' and level = 'TELC_B2'
  on conflict (source, item_id) do update set note = excluded.note, updated_at = now();

  delete from public.notifications where dedupe_key like 'digest:%';
  delete from public.content_digests;

  for e in select x from jsonb_array_elements(c_items) x loop
    select count(*), min(v.item_id::text)::uuid into v_n, v_id
      from public.v_notify_visible_content v
     where v.source = e->>'source' and v.level = e->>'level' and v.title = e->>'title'
       and (e->>'id_prefix' is null or v.item_id::text like (e->>'id_prefix') || '%');
    if v_n <> 1 then raise exception 'expected exactly 1 theme for %, found %', e->>'title', v_n; end if;
    v_rows := public.announce_theme(e->>'source', v_id, null, v_base - (idx * interval '1 minute'));
    if v_rows < 1300 then raise exception 'too few recipients (%) for %', v_rows, e->>'title'; end if;
    idx := idx + 1;
  end loop;
end $$;
