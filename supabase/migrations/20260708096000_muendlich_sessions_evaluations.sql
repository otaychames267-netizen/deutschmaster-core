-- Mündlich Phase 2, step 3: exam session transcript/recording storage + private
-- per-participant AI evaluation reports.
--
-- Transcript is write-ahead (appended live, node by node, as each speaker turn
-- finalizes) rather than written once at the end — survives a client crash
-- mid-exam. `muendlich_transcript_nodes` is the append-only log; `transcript`
-- jsonb on the session row is a denormalized snapshot refreshed on finalize
-- (cheap single read for the report screen, without re-aggregating nodes).

CREATE TABLE IF NOT EXISTS muendlich_exam_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            UUID        NOT NULL REFERENCES muendlich_rooms(id) ON DELETE CASCADE,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at           TIMESTAMPTZ,
  end_reason         TEXT        CHECK (end_reason IN ('completed','disconnect_timeout','expired_mid_exam','expelled','technical_issue')),
  transcript         JSONB       NOT NULL DEFAULT '[]',   -- denormalized snapshot; see muendlich_transcript_nodes for the live log
  recording_a_path   TEXT,                                 -- muendlich-recordings bucket, Person A's local capture
  recording_b_path   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS muendlich_sessions_room_idx ON muendlich_exam_sessions(room_id);

-- Append-only write-ahead transcript log — one row per finalized speaker turn,
-- committed the instant the active-speaker state toggles (not batched).
CREATE TABLE IF NOT EXISTS muendlich_transcript_nodes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES muendlich_exam_sessions(id) ON DELETE CASCADE,
  speaker      TEXT        NOT NULL,   -- 'A' | 'B' | 'examiner'
  teil         SMALLINT    NOT NULL CHECK (teil IN (1, 2, 3)),
  text         TEXT        NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL,
  ended_at     TIMESTAMPTZ,
  filler_count INT         NOT NULL DEFAULT 0,   -- "uhm/äh" etc., logged for the Fluency metric, not treated as a pause
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS muendlich_transcript_nodes_session_idx ON muendlich_transcript_nodes(session_id, started_at);

-- One private report per participant per session (never shared with the partner).
-- Criteria match the product owner's own spec verbatim (Pronunciation, Grammar,
-- Vocabulary, Fluency) rather than a separately-invented "official" rubric —
-- same principle as the Schreiben grading criteria.
CREATE TABLE IF NOT EXISTS muendlich_evaluations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         UUID        NOT NULL REFERENCES muendlich_exam_sessions(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pronunciation_score INT        NOT NULL CHECK (pronunciation_score BETWEEN 0 AND 25),
  grammar_score      INT         NOT NULL CHECK (grammar_score BETWEEN 0 AND 25),
  vocabulary_score   INT         NOT NULL CHECK (vocabulary_score BETWEEN 0 AND 25),
  fluency_score      INT         NOT NULL CHECK (fluency_score BETWEEN 0 AND 25),
  overall_score      INT         NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  cefr_level         TEXT        NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1')),
  passed             BOOLEAN     NOT NULL,
  feedback           JSONB       NOT NULL,   -- { pronunciation, grammar, vocabulary, fluency, summary, quoted_examples: [{text, issue}] }
  model              TEXT        NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- Panic-button reports (point 8) — logs room state for admin review, refund decisions.
CREATE TABLE IF NOT EXISTS muendlich_incident_reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES muendlich_rooms(id) ON DELETE CASCADE,
  reported_by UUID        NOT NULL REFERENCES auth.users(id),
  room_state_snapshot JSONB NOT NULL,   -- full room+participants+session state at report time
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','refunded','dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE muendlich_exam_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_transcript_nodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_evaluations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_incident_reports  ENABLE ROW LEVEL SECURITY;

-- Sessions/transcript: visible to the two room participants + admins (the raw
-- transcript is shared exam content, not private feedback — unlike evaluations).
CREATE POLICY "sessions select participant or admin" ON muendlich_exam_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM muendlich_participants p WHERE p.room_id = muendlich_exam_sessions.room_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner'))
  );
CREATE POLICY "transcript select participant or admin" ON muendlich_transcript_nodes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muendlich_exam_sessions s
      JOIN muendlich_participants p ON p.room_id = s.room_id
      WHERE s.id = muendlich_transcript_nodes.session_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner'))
  );

-- Evaluations: STRICTLY own-eyes-only (never the exam partner), + admin.
CREATE POLICY "evaluations select own or admin" ON muendlich_evaluations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- Incident reports: reporter + admin only.
CREATE POLICY "incidents select own or admin" ON muendlich_incident_reports FOR SELECT TO authenticated
  USING (reported_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
CREATE POLICY "incidents insert own" ON muendlich_incident_reports FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

-- All writes to sessions/transcript/evaluations happen server-side (service role,
-- from the exam-room server route that talks to Gemini) — no direct authenticated
-- INSERT/UPDATE grants, same reasoning as essay_gradings: the server, not the
-- client, is the source of truth for anything that touches grading or billing.

-- Storage bucket for local recordings, RLS-equivalent access via signed URLs
-- generated server-side per the owning participant (point 10: "only the
-- respective user account has access tokens to review their own data").
INSERT INTO storage.buckets (id, name, public)
VALUES ('muendlich-recordings', 'muendlich-recordings', false)
ON CONFLICT (id) DO NOTHING;
