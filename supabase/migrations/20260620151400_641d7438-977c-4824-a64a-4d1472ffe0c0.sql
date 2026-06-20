
CREATE TABLE IF NOT EXISTS public.exercise_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level public.exercise_level,
  module public.exercise_module,
  teil smallint,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_collections_title_not_blank CHECK (length(btrim(title)) > 0)
);

GRANT SELECT ON public.exercise_collections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exercise_collections TO authenticated;
GRANT ALL ON public.exercise_collections TO service_role;

ALTER TABLE public.exercise_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_read_authenticated"
  ON public.exercise_collections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "collections_admin_write"
  ON public.exercise_collections FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE TRIGGER trg_exercise_collections_updated_at
  BEFORE UPDATE ON public.exercise_collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS collection_id uuid
  REFERENCES public.exercise_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exercises_collection_id_idx
  ON public.exercises(collection_id);
