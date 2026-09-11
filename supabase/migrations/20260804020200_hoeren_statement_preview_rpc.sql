-- Freemium guest-preview overhaul, part 3: the real fix for "non-subscribed
-- users can read Hören sentences/questions even for locked exercises."
--
-- Turns out `hoeren_statements_student` was never actually a public,
-- RLS-free surface — it's a plain view (`SELECT id, exercise_id,
-- statement_number, statement_text FROM hoeren_statements`), and the base
-- table `hoeren_statements` carries the same "free sample OR real
-- subscription" RLS as every other content table. Its `relrowsecurity` flag
-- reads false only for the VIEW object itself (views don't have their own
-- RLS flag); the view's actual visibility is entirely governed by the base
-- table's real policies, confirmed by anon reads on a non-free exercise
-- correctly returning zero rows.
--
-- So exposing statement text for locked exercises needs the same pattern as
-- get_exercise_catalog: a SECURITY DEFINER function that deliberately
-- bypasses RLS, hand-picking only the safe columns (never correct_answer,
-- never audio_path). This is the opposite of loosening the base table's RLS
-- (which would also make `correct_answer` directly queryable by anon via
-- `hoeren_statements` — a real regression) — the function is the security
-- boundary here, not a row-level policy.
CREATE OR REPLACE FUNCTION public.get_hoeren_statement_preview(p_exercise_ids uuid[])
 RETURNS TABLE(exercise_id uuid, statement_number smallint, statement_text text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.exercise_id, s.statement_number, s.statement_text
  FROM public.hoeren_statements s
  WHERE s.exercise_id = ANY(p_exercise_ids)
  ORDER BY s.exercise_id, s.statement_number;
$function$;

GRANT EXECUTE ON FUNCTION public.get_hoeren_statement_preview(uuid[]) TO anon, authenticated;
