/**
 * When does a 1:1 tutor answer count as finished? (owner 2026-10-10)
 *
 * Measured on a full real-candidate run (tutorRealCandidate.live-test.mjs): median 8.1 s from the end of the student's speech to the first audio of the
 * tutor, 4 s of which was the fixed trailing-silence wait (MUENDLICH_HANDOFF_ACTIVE_SPEECH_MS, shared with the 2:1 room's hand-off logic). Every second of
 * it is felt as dead air, so the tutor has its own, shorter, ADAPTIVE threshold:
 *   - an answer the student has been speaking for at least TUTOR_LONG_ANSWER_MS (6 s) is finished after TUTOR_FINISH_SILENCE_MS (default 2.5 s) of silence;
 *   - a short / hesitant answer (a stammered start, a one-word reply) waits TUTOR_SHORT_ANSWER_EXTRA_MS (1.5 s) longer — i.e. the previous 4 s — so a normal
 *     thinking pause at the beginning is not mistaken for the end of the answer.
 * Env (all optional): MUENDLICH_TUTOR_FINISH_SILENCE_MS, MUENDLICH_TUTOR_LONG_ANSWER_MS, MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS. Read at call time (tests).
 */
const num = (name: string, dflt: number) => { const v = Number(process.env[name]); return Number.isFinite(v) && v >= 0 && process.env[name] !== undefined && process.env[name] !== "" ? v : dflt; };

/** @param spokenMs how long the student has been speaking in this answer window (first speech -> last speech); 0 if nothing yet */
export function tutorFinishSilenceMs(spokenMs: number): number {
  const base = num("MUENDLICH_TUTOR_FINISH_SILENCE_MS", 2_500);
  return spokenMs >= num("MUENDLICH_TUTOR_LONG_ANSWER_MS", 6_000) ? base : base + num("MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS", 1_500);
}
