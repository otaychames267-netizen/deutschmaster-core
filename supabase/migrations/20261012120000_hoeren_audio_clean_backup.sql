-- Hören audio clean-up (owner 2026-10-12: "everyone complains about the audio — remove the hiss and improve it").
-- Every in-use file was re-processed (rumble filter, noise reduction, loudness normalised to -18 LUFS / -2 dBTP; the originals were -7.5 LUFS with peaks up to +3 dBFS = clipping on
-- playback) and uploaded to hoeren-audio under clean/<old path without extension>.m4a. The originals stay in the bucket untouched.
-- This table remembers, for every exercise that was switched, the path it had before — so the switch is reversible with ONE statement:
--   UPDATE public.hoeren_exercises h SET audio_path = b.old_audio_path FROM public.hoeren_audio_backup b WHERE b.exercise_id = h.id AND b.reverted_at IS NULL;
--   UPDATE public.hoeren_audio_backup SET reverted_at = now() WHERE reverted_at IS NULL;
-- RLS is on with no policy: only the service role / SQL editor can read it.
CREATE TABLE IF NOT EXISTS public.hoeren_audio_backup (
  exercise_id    uuid PRIMARY KEY REFERENCES public.hoeren_exercises(id) ON DELETE CASCADE,
  old_audio_path text NOT NULL,
  new_audio_path text NOT NULL,
  switched_at    timestamptz NOT NULL DEFAULT now(),
  reverted_at    timestamptz
);
ALTER TABLE public.hoeren_audio_backup ENABLE ROW LEVEL SECURITY;
