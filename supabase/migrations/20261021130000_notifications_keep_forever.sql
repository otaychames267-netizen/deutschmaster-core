-- New-theme notifications stay in the bell for good (owner: "yab9a da2iman fyh wle yonza3", like zertify).
-- Reading one only greys it out; nothing is ever deleted any more. (20261020120000 removed read rows after 60 days.)
-- Idempotent: safe to re-run.
do $$
declare v_src text;
begin
  select pg_get_functiondef('public.notify_new_content(boolean, uuid)'::regprocedure) into v_src;
  if v_src like '%interval ''60 days''%' then
    v_src := replace(v_src,
      E'    delete from public.notifications where kind is not null and read and created_at < now() - interval ''60 days'';\n',
      E'    -- Notifications are kept forever: a student can always scroll back to every theme that was added.\n');
    if v_src like '%interval ''60 days''%' then raise exception 'retention patch did not apply'; end if;
    execute v_src;
  end if;
end $$;
