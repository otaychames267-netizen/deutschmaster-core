-- Add owner role to enum (ADD VALUE must be in this migration; functions use plpgsql to avoid same-tx validation)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- Owner cannot be set by any normal admin — only by the service_role directly.
-- The has_role function works for all roles including owner.

-- Function: check if calling user is owner
create or replace function public.is_owner(_user_id uuid default auth.uid())
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'owner'
  );
end;
$$;

-- Function: check if admin (owner OR admin role)
create or replace function public.is_admin_or_owner(_user_id uuid default auth.uid())
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin', 'owner')
  );
end;
$$;
