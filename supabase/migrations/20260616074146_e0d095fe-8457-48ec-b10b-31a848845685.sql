
-- Seed super admin
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'otaychames267@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Extend pdf_imports
ALTER TABLE public.pdf_imports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'exam',
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS linked_import_id uuid REFERENCES public.pdf_imports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ocr_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.pdf_imports DROP CONSTRAINT IF EXISTS pdf_imports_kind_check;
ALTER TABLE public.pdf_imports ADD CONSTRAINT pdf_imports_kind_check CHECK (kind IN ('exam','answer_key'));

-- Extend exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS source_pdf_import_id uuid REFERENCES public.pdf_imports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_numbering text;

-- Extend attempts
ALTER TABLE public.user_exercise_attempts
  ADD COLUMN IF NOT EXISTS regraded_at timestamptz,
  ADD COLUMN IF NOT EXISTS key_version int;

-- pdf_extractions
CREATE TABLE IF NOT EXISTS public.pdf_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.pdf_imports(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_text text,
  page_count int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pdf_extractions_import_idx ON public.pdf_extractions(import_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_extractions TO authenticated;
GRANT ALL ON public.pdf_extractions TO service_role;
ALTER TABLE public.pdf_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_extractions admin read" ON public.pdf_extractions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "pdf_extractions super admin write" ON public.pdf_extractions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP TRIGGER IF EXISTS pdf_extractions_updated_at ON public.pdf_extractions;
CREATE TRIGGER pdf_extractions_updated_at BEFORE UPDATE ON public.pdf_extractions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- exercise_answer_keys — never visible to students
CREATE TABLE IF NOT EXISTS public.exercise_answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  item_number text NOT NULL,
  correct_answer jsonb NOT NULL,
  reference_answer text,
  source text NOT NULL DEFAULT 'pdf',
  key_version int NOT NULL DEFAULT 1,
  pdf_import_id uuid REFERENCES public.pdf_imports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, item_number, key_version)
);
CREATE INDEX IF NOT EXISTS exercise_answer_keys_exercise_idx ON public.exercise_answer_keys(exercise_id);
GRANT ALL ON public.exercise_answer_keys TO service_role;
GRANT SELECT ON public.exercise_answer_keys TO authenticated;
ALTER TABLE public.exercise_answer_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answer_keys admin read" ON public.exercise_answer_keys
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "answer_keys super admin write" ON public.exercise_answer_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP TRIGGER IF EXISTS exercise_answer_keys_updated_at ON public.exercise_answer_keys;
CREATE TRIGGER exercise_answer_keys_updated_at BEFORE UPDATE ON public.exercise_answer_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- regrade_audits
CREATE TABLE IF NOT EXISTS public.regrade_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  key_version int NOT NULL,
  items_changed int NOT NULL DEFAULT 0,
  attempts_affected int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS regrade_audits_exercise_idx ON public.regrade_audits(exercise_id);
GRANT ALL ON public.regrade_audits TO service_role;
GRANT SELECT ON public.regrade_audits TO authenticated;
ALTER TABLE public.regrade_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regrade_audits admin read" ON public.regrade_audits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Publish guard: only super_admin can flip status to published
CREATE OR REPLACE FUNCTION public.guard_exercise_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super_admin can publish exercises';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS exercises_publish_guard ON public.exercises;
CREATE TRIGGER exercises_publish_guard
  BEFORE INSERT OR UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.guard_exercise_publish();
