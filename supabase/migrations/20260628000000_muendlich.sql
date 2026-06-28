-- ─────────────────────────────────────────────────────────────────────────────
-- Mündlich module — Phase 1 architecture (no AI).
--   Part 1: Vorbereitung PDF content management (admin uploads, students read).
--   Part 2: Prüfungssimulation room system (2 participants, lifecycle state machine).
-- Schema is designed so Phase 2 (AI examiner) connects without redesign.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Part 1: study materials (PDF viewing only — never exercises) ─────────────
CREATE TABLE IF NOT EXISTS muendlich_materials (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teil        SMALLINT    NOT NULL CHECK (teil IN (1, 2, 3)),
  category    TEXT        NOT NULL CHECK (category IN ('themen','tipps','redemittel','repeated_questions')),
  title       TEXT        NOT NULL,
  storage_path TEXT       NOT NULL,            -- path in the 'muendlich-pdfs' bucket
  sort_order  INT         NOT NULL DEFAULT 0,
  created_by  UUID        REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS muendlich_materials_idx ON muendlich_materials(teil, category, sort_order);

-- ── Part 2: exam-simulation rooms ────────────────────────────────────────────
-- Room lifecycle states (must follow the workflow, never skip):
--   waiting_for_partner → both_connected → ready_check → preparation
--   → preparation_locked → exam_room_ready → (future: exam_in_progress → finished)
CREATE TABLE IF NOT EXISTS muendlich_rooms (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        NOT NULL UNIQUE,        -- short joinable Room ID
  state           TEXT        NOT NULL DEFAULT 'waiting_for_partner'
                              CHECK (state IN ('waiting_for_partner','both_connected','ready_check','preparation','preparation_locked','exam_room_ready','exam_in_progress','finished','abandoned')),
  prep_started_at TIMESTAMPTZ,                        -- server timestamp → synchronized countdown
  prep_seconds    INT         NOT NULL DEFAULT 900,   -- 15 minutes
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS muendlich_rooms_state_idx ON muendlich_rooms(state);

-- Participants — max 2 enforced in app + the unique (room, slot).
CREATE TABLE IF NOT EXISTS muendlich_participants (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID        NOT NULL REFERENCES muendlich_rooms(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES profiles(id),
  slot          TEXT        NOT NULL CHECK (slot IN ('A','B')),     -- auto-assigned Person A / B
  connected     BOOLEAN     NOT NULL DEFAULT TRUE,
  ready         BOOLEAN     NOT NULL DEFAULT FALSE,
  mic_ok        BOOLEAN     NOT NULL DEFAULT FALSE,
  voice_ok      BOOLEAN     NOT NULL DEFAULT FALSE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, slot),
  UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS muendlich_participants_room_idx ON muendlich_participants(room_id);

-- Preparation selections (Teil 1 per-person theme; Teil 2/3 shared topic).
CREATE TABLE IF NOT EXISTS muendlich_selections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES muendlich_rooms(id) ON DELETE CASCADE,
  teil        SMALLINT    NOT NULL CHECK (teil IN (1, 2, 3)),
  slot        TEXT        CHECK (slot IN ('A','B')),   -- set for Teil 1 (per-person); NULL for shared Teil 2/3
  value       TEXT        NOT NULL,                     -- chosen theme/topic id or label
  locked      BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, teil, slot)
);

-- Text chat during preparation/exam.
CREATE TABLE IF NOT EXISTS muendlich_chat (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES muendlich_rooms(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id),
  slot        TEXT,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS muendlich_chat_room_idx ON muendlich_chat(room_id, created_at);

-- updated_at triggers
DROP TRIGGER IF EXISTS muendlich_rooms_upd ON muendlich_rooms;
CREATE TRIGGER muendlich_rooms_upd BEFORE UPDATE ON muendlich_rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS muendlich_participants_upd ON muendlich_participants;
CREATE TRIGGER muendlich_participants_upd BEFORE UPDATE ON muendlich_participants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE muendlich_materials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_selections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_chat          ENABLE ROW LEVEL SECURITY;

-- Materials: any authenticated user reads; admins write.
CREATE POLICY "auth read materials" ON muendlich_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write materials" ON muendlich_materials FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- Rooms & related: authenticated users may participate (room membership checks kept
-- simple for Phase 1; tightened with membership predicates in Phase 2).
CREATE POLICY "auth rooms"        ON muendlich_rooms        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth participants" ON muendlich_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth selections"   ON muendlich_selections   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth chat"         ON muendlich_chat         FOR ALL TO authenticated USING (true) WITH CHECK (true);
