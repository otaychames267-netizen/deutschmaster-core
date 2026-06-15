-- Exam mode tables
CREATE TYPE exam_mode AS ENUM ('schriftlich','muendlich');
CREATE TYPE exam_status AS ENUM ('in_progress','submitted','expired');

CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level exercise_level NOT NULL,
  mode exam_mode NOT NULL,
  exercise_ids uuid[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  submitted_at timestamptz,
  score_total numeric,
  score_breakdown jsonb,
  status exam_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.exam_sessions TO authenticated;
GRANT ALL ON public.exam_sessions TO service_role;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam sessions" ON public.exam_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read all exam sessions" ON public.exam_sessions
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER exam_sessions_updated_at BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- link attempts to exam session + open-text review flag
ALTER TABLE public.user_exercise_attempts
  ADD COLUMN exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
  ADD COLUMN needs_review boolean NOT NULL DEFAULT false;

-- pdf import staging
CREATE TABLE public.pdf_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_name text,
  status text NOT NULL DEFAULT 'pending',
  extracted_text text,
  extracted_candidates jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_imports TO authenticated;
GRANT ALL ON public.pdf_imports TO service_role;
ALTER TABLE public.pdf_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage pdf imports" ON public.pdf_imports
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER pdf_imports_updated_at BEFORE UPDATE ON public.pdf_imports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();