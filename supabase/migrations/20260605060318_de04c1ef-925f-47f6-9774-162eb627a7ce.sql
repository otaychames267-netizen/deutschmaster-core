CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DO $$
DECLARE
  policy_record record;
  new_qual text;
  new_check text;
  statement text;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ILIKE '%has_role%' OR with_check ILIKE '%has_role%')
  LOOP
    new_qual := CASE WHEN policy_record.qual IS NULL THEN NULL ELSE replace(policy_record.qual, 'has_role(', 'private.has_role(') END;
    new_check := CASE WHEN policy_record.with_check IS NULL THEN NULL ELSE replace(policy_record.with_check, 'has_role(', 'private.has_role(') END;

    statement := format('ALTER POLICY %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);

    IF new_qual IS NOT NULL THEN
      statement := statement || format(' USING (%s)', new_qual);
    END IF;

    IF new_check IS NOT NULL THEN
      statement := statement || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE statement;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;