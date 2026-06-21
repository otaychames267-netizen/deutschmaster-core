CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_pass boolean;
  has_exercise_clearance boolean;
  jwt_role text;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    jwt_role := coalesce(auth.role(), '');
    IF jwt_role <> 'service_role' AND NOT private.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;

    IF NEW.source_pdf_import_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1
        FROM public.pdf_fidelity_reports
        WHERE exam_import_id = NEW.source_pdf_import_id
          AND status = 'pass'
      ) INTO has_pass;

      IF NOT has_pass THEN
        SELECT EXISTS(
          SELECT 1
          FROM public.pdf_fidelity_reports r
          WHERE r.exam_import_id = NEW.source_pdf_import_id
            AND (r.details->'publishableExerciseIds') ? NEW.id::text
        ) INTO has_exercise_clearance;

        IF NOT has_exercise_clearance THEN
          RAISE EXCEPTION 'Cannot publish: this exercise has not passed fidelity validation yet';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END
$function$;