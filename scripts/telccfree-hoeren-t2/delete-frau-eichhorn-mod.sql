-- Permanent delete of the duplicate "Frau Eichhorn (معدل)" (B2 Hören Teil 2) — to be run by the owner in the Supabase SQL editor.
-- The row is currently hidden (is_hidden = true) and was added on 2026-10-07 as an exact copy of "Frau Eichhorn" (same audio object, same statements, same key).
-- It shares the audio file teil2/frau-eichhorn.m4a with the original: this script deletes ONLY database rows and does NOT touch the storage object.
-- hoeren_attempts that reference the variant are removed too (nobody can have practised a hidden copy, so this is normally 0 rows).
BEGIN;
  DELETE FROM hoeren_attempts   WHERE exercise_id IN (SELECT id FROM hoeren_exercises WHERE title = 'Frau Eichhorn (معدل)' AND level = 'TELC_B2' AND teil = 2 AND is_hidden = true);
  DELETE FROM hoeren_statements WHERE exercise_id IN (SELECT id FROM hoeren_exercises WHERE title = 'Frau Eichhorn (معدل)' AND level = 'TELC_B2' AND teil = 2 AND is_hidden = true);
  DELETE FROM hoeren_exercises  WHERE title = 'Frau Eichhorn (معدل)' AND level = 'TELC_B2' AND teil = 2 AND is_hidden = true;
  -- close the gap in position so the list stays contiguous
  UPDATE hoeren_exercises SET position = position - 1
   WHERE level = 'TELC_B2' AND teil = 2 AND position > (SELECT position FROM hoeren_exercises WHERE id = '9d65952e-f768-446b-8719-94f3506d498f');
COMMIT;
