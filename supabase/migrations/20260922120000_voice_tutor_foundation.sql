-- AI Voice Tutor, Phase 1: foundation schema for a 1:1 (single-user) real-time
-- speaking-practice feature, distinct from the existing 2-candidate Mündlich
-- exam room. Extends the same production Gemini Live pipeline (muendlich-relay)
-- rather than a new vendor stack — see reports/تكلفة معلم صوتي بالذكاء الاصطناعي.md
-- for the cost/architecture analysis behind that choice.
--
-- Daily cap (not the exam's 30-day/300-minute TOTAL window): 45 minutes/day,
-- resets every UTC calendar day. Deliberately keyed (user_id, usage_date, level)
-- rather than reusing muendlich_credits' shape, since that table is a decaying
-- total budget with no daily reset concept at all. No pg_cron anywhere in this
-- repo — every "daily" boundary here is enforced lazily (compare against
-- current_date on read/write), same philosophy as api_usage_ledger and
-- expire_muendlich_window().

CREATE TABLE IF NOT EXISTS voice_tutor_daily_usage (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date   DATE        NOT NULL DEFAULT current_date,
  level        TEXT        NOT NULL DEFAULT 'TELC_B2' CHECK (level IN ('TELC_B1','TELC_B2')),
  seconds_used INT         NOT NULL DEFAULT 0 CHECK (seconds_used >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date, level)
);
COMMENT ON TABLE voice_tutor_daily_usage IS 'Per-user, per-day, per-level Voice Tutor usage. Hard cap 2700s (45min)/day, enforced by deduct_voice_tutor_seconds(). Resets lazily at UTC midnight — no cron.';

ALTER TABLE voice_tutor_daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice tutor usage select own or admin" ON voice_tutor_daily_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
-- Writes happen only via deduct_voice_tutor_seconds() (SECURITY DEFINER) — no direct INSERT/UPDATE grant to authenticated.

-- ============================================================
-- Atomic per-user deduction. One statement, conditional on staying under the
-- cap, so there is no read-then-write race window — same idiom as
-- deduct_muendlich_minutes_dual's per-participant UPDATE ... RETURNING, just
-- single-user instead of dual.
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_voice_tutor_seconds(p_seconds INT, p_level TEXT DEFAULT 'TELC_B2')
RETURNS INT  -- seconds remaining today, after this deduction
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INT;
BEGIN
  -- REVOKE EXECUTE FROM anon (below) does not actually stop anon from calling
  -- this function on this project — Postgres grants EXECUTE to PUBLIC by
  -- default on function creation, and anon inherits PUBLIC's privileges
  -- (confirmed live: pg_proc.proacl shows a bare `=X` PUBLIC entry on both
  -- this function and the existing deduct_muendlich_minutes_dual). That
  -- existing function is only actually safe because of its own explicit
  -- `auth.uid() IS DISTINCT FROM ...` check, not because of its REVOKE
  -- statement — this guard is the same real defense, made explicit here.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_seconds <= 0 THEN RAISE EXCEPTION 'p_seconds must be positive'; END IF;
  IF p_level NOT IN ('TELC_B1','TELC_B2') THEN RAISE EXCEPTION 'Invalid level'; END IF;

  INSERT INTO voice_tutor_daily_usage (user_id, usage_date, level, seconds_used)
  VALUES (auth.uid(), current_date, p_level, 0)
  ON CONFLICT (user_id, usage_date, level) DO NOTHING;

  UPDATE voice_tutor_daily_usage
  SET seconds_used = seconds_used + p_seconds, updated_at = now()
  WHERE user_id = auth.uid() AND usage_date = current_date AND level = p_level
    AND seconds_used + p_seconds <= 2700
  RETURNING seconds_used INTO v_used;

  IF v_used IS NULL THEN RAISE EXCEPTION 'DAILY_CAP_EXCEEDED'; END IF;
  RETURN 2700 - v_used;
END;
$$;
GRANT EXECUTE ON FUNCTION deduct_voice_tutor_seconds(INT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION deduct_voice_tutor_seconds(INT, TEXT) FROM anon;

-- ============================================================
-- Read-only status check. LEFT JOIN against a synthetic one-row source so a
-- user who has never touched the feature today still gets a defaulted
-- (0, 2700) row instead of zero rows — same trick as get_my_muendlich_credits.
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_voice_tutor_cap_status(p_level TEXT DEFAULT 'TELC_B2')
RETURNS TABLE(seconds_used INT, seconds_remaining INT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(u.seconds_used, 0), 2700 - COALESCE(u.seconds_used, 0)
  FROM (SELECT 1) AS one_row
  LEFT JOIN voice_tutor_daily_usage u
    ON u.user_id = auth.uid() AND u.usage_date = current_date AND u.level = p_level;
$$;
GRANT EXECUTE ON FUNCTION get_my_voice_tutor_cap_status(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_my_voice_tutor_cap_status(TEXT) FROM anon;

-- ============================================================
-- Scenario/topic content. A dedicated table rather than extending
-- muendlich_materials — that table's `category` CHECK constraint
-- ('themen'|'tipps'|'redemittel'|'repeated_questions') mirrors the real
-- 3-Teil exam structure and doesn't conceptually fit free-conversation
-- starters + live-model prompt guidance. None of the 7 required scenarios
-- exist anywhere in this repo today.
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_tutor_scenarios (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level                  TEXT        NOT NULL DEFAULT 'TELC_B2' CHECK (level IN ('TELC_B1','TELC_B2')),
  slug                   TEXT        NOT NULL,
  title                  TEXT        NOT NULL,
  description            TEXT,             -- shown to the student on the scenario-picker card
  system_prompt_fragment TEXT        NOT NULL,  -- appended into buildTutorInstruction()
  sort_order             INT         NOT NULL DEFAULT 0,
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (level, slug)
);
ALTER TABLE voice_tutor_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice tutor scenarios readable by authenticated" ON voice_tutor_scenarios FOR SELECT TO authenticated
  USING (is_active);
-- Content authored/edited only via admin tooling (service role) — no direct authenticated write grant.

INSERT INTO voice_tutor_scenarios (level, slug, title, description, system_prompt_fragment, sort_order) VALUES
  ('TELC_B2', 'vorstellungsgespraech', 'Vorstellungsgespräch', 'Übe ein Bewerbungsgespräch auf Deutsch — typische Fragen zu Erfahrung, Stärken und Motivation.',
    'Du führst mit dem Studenten ein Vorstellungsgespräch für eine Stelle (z. B. im Pflegebereich oder einem anderen Berufsfeld nach Wahl des Studenten). Stelle typische Interviewfragen (Werdegang, Stärken/Schwächen, Motivation, Umgang mit schwierigen Situationen), höre aktiv zu und reagiere auf das tatsächlich Gesagte.', 10),
  ('TELC_B2', 'pflege_ausbildung', 'Pflege-Ausbildung', 'Gespräch über Themen rund um die Pflegeausbildung und den Berufsalltag in der Pflege.',
    'Führe ein Gespräch mit dem Studenten über Themen aus der Pflegeausbildung: Ausbildungsinhalte, Berufsalltag, Umgang mit Patienten, Herausforderungen im Pflegeberuf. Stelle offene Fragen und gehe auf konkrete Antworten ein.', 20),
  ('TELC_B2', 'alltag', 'Alltag', 'Lockeres Gespräch über Alltagsthemen — Wohnen, Freizeit, Familie, Einkaufen.',
    'Führe ein entspanntes Alltagsgespräch mit dem Studenten über Themen wie Wohnen, Freizeit, Familie, Einkaufen oder Hobbys. Halte den Ton locker und natürlich.', 30),
  ('TELC_B2', 'diskussion', 'Diskussion', 'Diskutiere ein aktuelles oder kontroverses Thema und vertrete unterschiedliche Standpunkte.',
    'Diskutiere mit dem Studenten ein gesellschaftlich relevantes Thema (z. B. Homeoffice, Umweltschutz, Digitalisierung). Vertrete gelegentlich eine Gegenposition, um den Studenten zum Argumentieren zu bringen, bleibe aber immer respektvoll.', 40),
  ('TELC_B2', 'bildbeschreibung', 'Bildbeschreibung', 'Beschreibe ein Bild oder eine Situation und beantworte Rückfragen dazu.',
    'Bitte den Studenten, eine Situation oder ein Bild seiner Wahl zu beschreiben (z. B. "Beschreiben Sie eine typische Szene an Ihrem Arbeitsplatz"). Stelle danach gezielte Rückfragen zu Details, die der Student genannt hat.', 50),
  ('TELC_B2', 'meinung_aeussern', 'Meinung äußern', 'Übe, eine eigene Meinung klar zu formulieren und zu begründen.',
    'Stelle dem Studenten Fragen, zu denen er seine persönliche Meinung äußern und begründen soll (z. B. zu Arbeit, Bildung, Technologie). Frage bei kurzen Antworten gezielt nach einer Begründung oder einem Beispiel.', 60),
  ('TELC_B2', 'fragen_beantworten', 'Fragen beantworten', 'Beantworte spontane Fragen zu verschiedenen Themen — Training für schnelles, klares Antworten.',
    'Stelle dem Studenten eine Reihe spontaner, abwechslungsreicher Fragen zu unterschiedlichen Alltags- und Berufsthemen. Wechsle das Thema nach jeder Antwort, um spontanes Reagieren zu trainieren.', 70)
ON CONFLICT (level, slug) DO NOTHING;

-- ============================================================
-- Session/transcript/correction storage — single-user mirrors of
-- muendlich_exam_sessions/muendlich_transcript_nodes/muendlich_evaluations,
-- own-row-only RLS. All writes are server-side (relay + correction API route,
-- both via service role) — same "server is the source of truth for anything
-- touching billing" reasoning as the exam tables.
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_tutor_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id UUID        REFERENCES voice_tutor_scenarios(id),
  level       TEXT        NOT NULL DEFAULT 'TELC_B2',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  end_reason  TEXT        CHECK (end_reason IN ('completed_by_user','daily_cap_exceeded','budget_exceeded','idle_timeout','technical_issue')),
  transcript  JSONB       NOT NULL DEFAULT '[]',  -- denormalized snapshot; see voice_tutor_transcript_nodes for the live log
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_tutor_transcript_nodes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL REFERENCES voice_tutor_sessions(id) ON DELETE CASCADE,
  speaker    TEXT        NOT NULL CHECK (speaker IN ('tutor','student')),
  text       TEXT        NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS voice_tutor_transcript_nodes_session_idx ON voice_tutor_transcript_nodes(session_id, started_at);

CREATE TABLE IF NOT EXISTS voice_tutor_corrections (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL REFERENCES voice_tutor_sessions(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback   JSONB       NOT NULL,  -- { error_correction_matrix[], better_formulations[], vocabulary_enrichment[], summary }
  model      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

ALTER TABLE voice_tutor_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_tutor_transcript_nodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_tutor_corrections       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice tutor sessions select own or admin" ON voice_tutor_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
CREATE POLICY "voice tutor transcript select own or admin" ON voice_tutor_transcript_nodes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM voice_tutor_sessions s WHERE s.id = voice_tutor_transcript_nodes.session_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner'))
  );
CREATE POLICY "voice tutor corrections select own or admin" ON voice_tutor_corrections FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
-- No direct authenticated INSERT/UPDATE grant on any of the three — server-side (service role) writes only.
