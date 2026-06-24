-- Add owner role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- Owner cannot be set by any normal admin — only by the service_role directly.
-- The has_role function works for all roles including owner.

-- Protect owner promotion: revoke INSERT on user_roles from authenticated
-- Admins use service_role for all role changes.
-- (Authenticated users already have only SELECT on user_roles per initial migration)

-- Function: check if calling user is owner
create or replace function public.is_owner(_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'owner'
  )
$$;

-- Function: check if admin (owner OR admin role)
create or replace function public.is_admin_or_owner(_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin', 'owner')
  )
$$;
