-- Reworks the Schreiben AI-grading rubric from a generic 4-criteria/25pt-each
-- scheme (100 total) to the 3 official telc macro-categories (15pt each, 45
-- total) — Bewältigung der Aufgabe, Kommunikative Gestaltung, Formale
-- Richtigkeit — so standalone Schreiben practice grading and the new
-- Prüfungssimulation's Schreiben section share ONE rubric, landing exactly
-- on the simulation's Schreiben /45 report scale with no extra conversion.
--
-- Existing rows lose their fine-grained per-criterion breakdown (the four old
-- score columns are dropped) but keep essay_text/overall_score/feedback/
-- passed intact as a historical record — a one-time, acceptable cost of
-- moving to a stricter, TELC-aligned rubric rather than maintaining two
-- rubrics in parallel forever.
ALTER TABLE public.essay_gradings
  DROP COLUMN IF EXISTS task_fulfillment_score,
  DROP COLUMN IF EXISTS grammar_score,
  DROP COLUMN IF EXISTS structure_score,
  DROP COLUMN IF EXISTS vocabulary_score;

ALTER TABLE public.essay_gradings
  ADD COLUMN IF NOT EXISTS task_achievement_score      int CHECK (task_achievement_score BETWEEN 0 AND 15),
  ADD COLUMN IF NOT EXISTS communicative_design_score  int CHECK (communicative_design_score BETWEEN 0 AND 15),
  ADD COLUMN IF NOT EXISTS formal_accuracy_score       int CHECK (formal_accuracy_score BETWEEN 0 AND 15);

-- overall_score is now out of 45 (15+15+15), not 100. Rescale existing rows
-- proportionally (old / 100 * 45) so the column keeps one consistent meaning
-- across old and new rows rather than leaving stale 0-100 values under a
-- tighter constraint. `passed` needs no recompute: 60/100 and 27/45 are both
-- exactly the same 60% threshold, so rescaling never flips pass/fail.
UPDATE public.essay_gradings SET overall_score = ROUND(overall_score * 45.0 / 100) WHERE overall_score > 45;
ALTER TABLE public.essay_gradings DROP CONSTRAINT IF EXISTS essay_gradings_overall_score_check;
ALTER TABLE public.essay_gradings ADD CONSTRAINT essay_gradings_overall_score_check CHECK (overall_score BETWEEN 0 AND 45);
