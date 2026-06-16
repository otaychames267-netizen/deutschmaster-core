
CREATE TABLE public.pdf_fidelity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_import_id UUID NOT NULL REFERENCES public.pdf_imports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pass','fail')),
  added_count INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  modified_count INTEGER NOT NULL DEFAULT 0,
  numbering_diff_count INTEGER NOT NULL DEFAULT 0,
  section_diff_count INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_fidelity_reports TO authenticated;
GRANT ALL ON public.pdf_fidelity_reports TO service_role;

ALTER TABLE public.pdf_fidelity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read fidelity reports" ON public.pdf_fidelity_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admin writes fidelity reports" ON public.pdf_fidelity_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE INDEX idx_pdf_fidelity_reports_import ON public.pdf_fidelity_reports(exam_import_id, created_at DESC);

-- Block publishing unless a passing fidelity report exists for the source import
CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_pass boolean;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
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
END $$;

DROP TRIGGER IF EXISTS trg_guard_exercise_publish ON public.exercises;
CREATE TRIGGER trg_guard_exercise_publish
BEFORE INSERT OR UPDATE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.guard_exercise_publish();
