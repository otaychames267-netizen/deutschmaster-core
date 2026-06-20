ALTER TABLE public.pdf_imports ADD COLUMN IF NOT EXISTS content_hash text;
CREATE INDEX IF NOT EXISTS pdf_imports_content_hash_idx ON public.pdf_imports(content_hash);