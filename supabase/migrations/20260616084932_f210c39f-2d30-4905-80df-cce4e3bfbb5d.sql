ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS writing_category text,
  ADD COLUMN IF NOT EXISTS muendlich_part smallint,
  ADD COLUMN IF NOT EXISTS content_type text CHECK (content_type IN ('vorbereitung','pruefungssimulation'));
CREATE INDEX IF NOT EXISTS idx_exercises_classification ON public.exercises (level, module, teil, content_type);