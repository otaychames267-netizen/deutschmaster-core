-- Schreiben Vorlagen — premium TELC B2 writing-template PDF library
-- ("Beschwerden — Produkt" approved/frozen 2026-07-21; "Beschwerden —
-- Dienstleistung" in progress). Each row is one category PDF. Gated behind
-- the 'schriftlich' plan, same check already used for lesen_exercises /
-- hoeren_exercises (20260716020000_plan_scoped_content_gating.sql), since
-- Vorlagen is part of the Schreiben skill within that plan.
--
-- Deliberately mirrors muendlich_materials' simple admin-upload / fully
-- plan-gated-row pattern rather than the titles-only catalog-RPC pattern
-- (get_exercise_catalog / get_schreiben_catalog) used for large per-item
-- exercise banks: the Vorlagen catalog is a handful of category PDFs, not
-- hundreds of exercises, so a dedicated preview RPC would be over-engineering
-- for now. The "visible but locked" marketing card for non-subscribers is
-- static copy in the route component instead of a DB-driven catalog.

CREATE TABLE IF NOT EXISTS schreiben_vorlagen (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category         TEXT        NOT NULL CHECK (category IN ('produkt','dienstleistung')),
  level            TEXT        NOT NULL CHECK (level IN ('TELC_B1','TELC_B2')) DEFAULT 'TELC_B2',
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  situation_count  INT         NOT NULL DEFAULT 10,
  template_count   INT         NOT NULL DEFAULT 60,
  storage_path     TEXT        NOT NULL,           -- path in the 'schreiben-vorlagen' bucket
  sort_order       INT         NOT NULL DEFAULT 0,
  created_by       UUID        REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, level)
);
CREATE INDEX IF NOT EXISTS schreiben_vorlagen_idx ON schreiben_vorlagen(level, sort_order);

ALTER TABLE schreiben_vorlagen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan-gated read vorlagen" ON schreiben_vorlagen;
DROP POLICY IF EXISTS "admin write vorlagen" ON schreiben_vorlagen;

CREATE POLICY "plan-gated read vorlagen" ON schreiben_vorlagen FOR SELECT TO authenticated
  USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

CREATE POLICY "admin write vorlagen" ON schreiben_vorlagen FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ── storage bucket ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('schreiben-vorlagen', 'schreiben-vorlagen', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "plan-gated read schreiben-vorlagen" ON storage.objects;
DROP POLICY IF EXISTS "admin write schreiben-vorlagen"     ON storage.objects;
DROP POLICY IF EXISTS "admin del schreiben-vorlagen"       ON storage.objects;

CREATE POLICY "plan-gated read schreiben-vorlagen" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'schreiben-vorlagen' AND (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())));
CREATE POLICY "admin write schreiben-vorlagen" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'schreiben-vorlagen' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
CREATE POLICY "admin del schreiben-vorlagen" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'schreiben-vorlagen' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
