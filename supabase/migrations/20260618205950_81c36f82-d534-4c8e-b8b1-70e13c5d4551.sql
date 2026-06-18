REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_pass boolean;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT private.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;
    IF NEW.source_pdf_import_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.pdf_fidelity_reports
        WHERE exam_import_id = NEW.source_pdf_import_id AND status = 'pass'
      ) INTO has_pass;
      IF NOT has_pass THEN
        RAISE EXCEPTION 'Cannot publish: a passing fidelity report is required for this PDF import';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));