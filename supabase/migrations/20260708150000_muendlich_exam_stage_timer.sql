-- Room 2 exam-stage timer — mirrors the already-proven Room 1 prep timer
-- pattern (prep_started_at + prep_seconds, server timestamp + client clock-
-- offset sync via server_now()) rather than inventing a new mechanism.
-- exam_stage: 1 (Präsentation, placeholder duration/content per explicit
-- request to skip Teil 1 content for now), 2 (Gespräch, 5 min), 3 (Planen,
-- 5 min). NULL until the relay actually starts running the exam.

ALTER TABLE muendlich_rooms
  ADD COLUMN IF NOT EXISTS exam_stage SMALLINT CHECK (exam_stage IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS exam_stage_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exam_stage_seconds INT;

COMMENT ON COLUMN muendlich_rooms.exam_stage IS 'Current Room 2 exam part (1/2/3). NULL before the relay starts the exam.';
COMMENT ON COLUMN muendlich_rooms.exam_stage_started_at IS 'Server timestamp the current stage began — same clock-offset-sync pattern as prep_started_at.';
COMMENT ON COLUMN muendlich_rooms.exam_stage_seconds IS 'Duration of the CURRENT stage in seconds (Teil 1 placeholder=120, Teil 2=300, Teil 3=300).';
