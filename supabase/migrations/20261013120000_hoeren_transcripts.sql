-- Whisper transcripts of the Hören audio (the file each exercise serves), used to write and verify the audio-grounded "Warum?" explanations.
-- Admin-only: a transcript gives away the answers, so students never read this table — they only ever see the short evidence quote that is
-- copied into hoeren_exercises.learning_aids (returned by reveal_hoeren / score_and_save_hoeren after the exercise is graded).
-- Timestamps belong to `audio_path`; if an exercise's audio file is replaced, regenerate its transcript and aids.
CREATE TABLE IF NOT EXISTS public.hoeren_transcripts (
  exercise_id uuid PRIMARY KEY REFERENCES public.hoeren_exercises(id) ON DELETE CASCADE,
  audio_path  text NOT NULL,
  model       text NOT NULL,
  duration_s  numeric,
  text        text NOT NULL,
  segments    jsonb NOT NULL,            -- [{start, end, text}] seconds
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hoeren_transcripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hoeren_transcripts admin read" ON public.hoeren_transcripts;
CREATE POLICY "hoeren_transcripts admin read" ON public.hoeren_transcripts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
REVOKE ALL ON public.hoeren_transcripts FROM anon, authenticated;
GRANT SELECT ON public.hoeren_transcripts TO authenticated;  -- still filtered by the admin-only policy above
