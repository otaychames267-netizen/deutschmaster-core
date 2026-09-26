-- ============================================================
-- Real bug found during hands-on QA: the Profile page's "Bio" textarea is
-- fully interactive (part of the "Save changes" form, no error on submit)
-- but profiles has no bio column at all — the client even hardcoded
-- `bio: null` on every load (see _authenticated.profile.tsx). Anything a
-- student typed there was silently discarded while looking like it saved.
-- Fixed at the source: add the column so the field is real.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
