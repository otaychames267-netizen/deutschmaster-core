
-- Enums
CREATE TYPE public.exercise_level AS ENUM ('b1','b2');
CREATE TYPE public.exercise_module AS ENUM ('lesen','sprachbausteine','hoeren','schreiben','muendlich');
CREATE TYPE public.exercise_kind AS ENUM ('multiple_choice','true_false','matching','cloze','open_text');
CREATE TYPE public.exercise_status AS ENUM ('draft','published','hidden');

-- Audio assets
CREATE TABLE public.audio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  duration_seconds integer,
  transcript text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_assets TO authenticated;
GRANT ALL ON public.audio_assets TO service_role;
ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY audio_admin_all ON public.audio_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY audio_read_all ON public.audio_assets FOR SELECT TO authenticated USING (true);
CREATE TRIGGER audio_assets_updated_at BEFORE UPDATE ON public.audio_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Exercises (question bank)
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.exercise_level NOT NULL,
  module public.exercise_module NOT NULL,
  teil smallint NOT NULL CHECK (teil BETWEEN 1 AND 5),
  position smallint NOT NULL DEFAULT 1,
  title text NOT NULL,
  prompt text NOT NULL,
  passage text,
  audio_id uuid REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  kind public.exercise_kind NOT NULL DEFAULT 'multiple_choice',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text,
  status public.exercise_status NOT NULL DEFAULT 'draft',
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exercises_lookup_idx ON public.exercises (level, module, teil, position);
CREATE INDEX exercises_status_idx ON public.exercises (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercises_admin_all ON public.exercises FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY exercises_published_read ON public.exercises FOR SELECT TO authenticated
  USING (status = 'published');
CREATE TRIGGER exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Attempts
CREATE TABLE public.user_exercise_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  answer jsonb,
  score smallint CHECK (score BETWEEN 0 AND 100),
  is_correct boolean,
  duration_seconds integer,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX uea_user_idx ON public.user_exercise_attempts (user_id, completed_at DESC);
CREATE INDEX uea_exercise_idx ON public.user_exercise_attempts (exercise_id);
GRANT SELECT, INSERT ON public.user_exercise_attempts TO authenticated;
GRANT ALL ON public.user_exercise_attempts TO service_role;
ALTER TABLE public.user_exercise_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY uea_insert_own ON public.user_exercise_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY uea_select_own_or_admin ON public.user_exercise_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Grant admin to user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE email = 'otaychames267@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
