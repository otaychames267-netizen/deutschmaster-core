-- The relay writes end reasons the original CHECK constraint never allowed
-- (found by a silent-room exam test: after an idle close the session row kept
-- end_reason NULL and ended_at NULL, because the UPDATE violated the constraint
-- and the failure was swallowed). Affected the audit trail of every exam that
-- ended by idle_timeout or insufficient_credits_mid_exam. Widen the allowed set
-- to every value server.ts's endRoom() can write.
alter table public.muendlich_exam_sessions drop constraint if exists muendlich_exam_sessions_end_reason_check;
alter table public.muendlich_exam_sessions add constraint muendlich_exam_sessions_end_reason_check
  check (end_reason in (
    'completed', 'disconnect_timeout', 'expired_mid_exam', 'expelled', 'technical_issue',
    'idle_timeout', 'insufficient_credits_mid_exam', 'insufficient_credits_preflight',
    'insufficient_minutes_preflight', 'budget_exceeded_preflight', 'missing_topic_selection_preflight'
  ));
