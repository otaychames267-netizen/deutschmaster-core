-- Pre-launch DB audit found that the exercises_publish_guard trigger (which
-- enforces "only super_admin/service_role can publish" + "must have a
-- passing PDF fidelity report") was defined in migrations but does NOT
-- exist on the live table — the guard_exercise_publish() function itself is
-- intact and correct, it was simply never (re-)wired after the `exercises`
-- table was dropped/recreated during the 20260623-20260626 foundation
-- rewrite. Without this trigger, any write path touching exercises.status
-- bypasses fidelity validation entirely. Idempotent: safe to re-run.

DROP TRIGGER IF EXISTS exercises_publish_guard ON public.exercises;

CREATE TRIGGER exercises_publish_guard
BEFORE INSERT OR UPDATE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.guard_exercise_publish();

-- Same audit also found pdf_imports.updated_at has no trigger keeping it
-- current (the table was redefined in the foundation rewrite without
-- re-adding the standard handle_updated_at() trigger every other
-- *_updated_at column in this schema uses). Cosmetic/observability only —
-- the pdf-pipeline code writes to this row repeatedly during import without
-- ever touching updated_at itself, so it silently goes stale.
DROP TRIGGER IF EXISTS pdf_imports_updated_at ON public.pdf_imports;

CREATE TRIGGER pdf_imports_updated_at
BEFORE UPDATE ON public.pdf_imports
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
