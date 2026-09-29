-- AI Voice Tutor: align the existing (already-deployed) foundation schema
-- with the owner's explicit Teil-structure design (2026-09-29), superseding
-- the standalone `voice_tutor_scenarios` approach from the original plan.
--
-- Design: Teil 1 is an individual presentation+Q&A with the AI acting as
-- examiner only, exactly mirroring the real exam (no partner needed there).
-- Teil 2 and Teil 3 are where the real exam expects a second candidate, so
-- for those two the SAME AI switches into a distinct "study partner"
-- persona/voice and carries the shared-topic conversation through to the
-- end. Topic selection reuses `muendlich_materials` as-is (teil, category=
-- 'themen', level) — the same content and the same TopicSelector component
-- the 2-candidate exam already uses — instead of a separate scenario bank.
--
-- `voice_tutor_daily_usage`, `deduct_voice_tutor_seconds()` and
-- `get_my_voice_tutor_cap_status()` from the original pass are unaffected by
-- this — the 45-minute/day cap design didn't change, only how a session
-- picks its topics.
--
-- voice_tutor_scenarios currently holds 7 seed rows and nothing else
-- references it outside voice_tutor_sessions.scenario_id — safe to drop
-- outright (voice_tutor_sessions itself has zero rows: feature is unlaunched,
-- VOICE_TUTOR_ENABLED=false).

ALTER TABLE voice_tutor_sessions DROP CONSTRAINT IF EXISTS voice_tutor_sessions_scenario_id_fkey;
ALTER TABLE voice_tutor_sessions DROP COLUMN IF EXISTS scenario_id;
DROP TABLE IF EXISTS voice_tutor_scenarios;

ALTER TABLE voice_tutor_sessions
  ADD COLUMN IF NOT EXISTS teil1_material_id UUID REFERENCES muendlich_materials(id),
  ADD COLUMN IF NOT EXISTS teil2_material_id UUID REFERENCES muendlich_materials(id),
  ADD COLUMN IF NOT EXISTS teil3_material_id UUID REFERENCES muendlich_materials(id);

-- The original pass gave sessions a SELECT policy but no INSERT policy —
-- meaning nothing could actually create one. The student locks in their own
-- topic choices and creates their own session row directly (same division
-- of responsibility as joinOrCreateRoom() for the 2-candidate exam: the
-- CLIENT creates the row, the relay only ever updates it afterwards via
-- service role).
DROP POLICY IF EXISTS "voice tutor sessions insert own" ON voice_tutor_sessions;
CREATE POLICY "voice tutor sessions insert own" ON voice_tutor_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Transcript nodes: the original pass had no Teil distinction and only
-- 'tutor'/'student' speakers — both need to change now that Teil 2/3 has a
-- separate AI persona from Teil 1's examiner. Table has zero rows (feature
-- unlaunched), so both changes are safe to apply directly, no backfill.
ALTER TABLE voice_tutor_transcript_nodes DROP CONSTRAINT IF EXISTS voice_tutor_transcript_nodes_speaker_check;
ALTER TABLE voice_tutor_transcript_nodes
  ADD CONSTRAINT voice_tutor_transcript_nodes_speaker_check CHECK (speaker IN ('student','examiner','partner'));

ALTER TABLE voice_tutor_transcript_nodes
  ADD COLUMN IF NOT EXISTS teil SMALLINT NOT NULL CHECK (teil IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS voice_tutor_transcript_nodes_session_idx ON voice_tutor_transcript_nodes(session_id, started_at);
