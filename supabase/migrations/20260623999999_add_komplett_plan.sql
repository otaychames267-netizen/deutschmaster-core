-- Add 'komplett' to plan_code enum if missing (must be in its own migration/transaction)
do $$ begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'plan_code' and e.enumlabel = 'komplett'
  ) then
    alter type public.plan_code add value 'komplett';
  end if;
end $$;
