
ALTER TABLE public.pdf_imports DROP CONSTRAINT IF EXISTS pdf_imports_kind_check;
ALTER TABLE public.pdf_imports ADD CONSTRAINT pdf_imports_kind_check
  CHECK (kind = ANY (ARRAY['exam'::text, 'answer_key'::text, 'combined'::text]));

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS model_variant text;
CREATE INDEX IF NOT EXISTS exercises_model_variant_idx
  ON public.exercises (source_pdf_import_id, model_variant);
