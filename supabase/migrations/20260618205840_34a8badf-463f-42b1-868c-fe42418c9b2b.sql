DROP TRIGGER IF EXISTS exercises_publish_guard ON public.exercises;
DROP TRIGGER IF EXISTS trg_guard_exercise_publish ON public.exercises;
CREATE TRIGGER exercises_publish_guard
BEFORE INSERT OR UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.guard_exercise_publish();