/**
 * When does the 1:1 tutor start preparing its next turn, and when may it speak? (owner 2026-10-10, second round)
 *
 * Round 1 used ONE trailing-silence threshold (2.0 s) after which the tutor both decided and started generating. A production run with a real
 * 13-minute exam showed 4 of 14 long answers were interrupted by a ~3 s thinking pause in the MIDDLE of the answer, and the median response time
 * was 6.8 s. Two thresholds fix both:
 *   - SPECULATE (default 1.5 s of silence): the tutor starts generating its next question (Claude + TTS take ~3 s). Nothing is played yet, and if
 *     the student starts talking again the half-prepared turn is thrown away (voice/turnGuard.ts) — the student keeps the floor.
 *   - HOLD (default 3.5 s of silence): the earliest moment the tutor may actually speak. A cached acknowledgement ("Vielen Dank.") fills the
 *     remaining gap while the question finishes preparing, so the student hears a reaction after ~3.5 s instead of ~5-7 s.
 * A short / hesitant answer (under TUTOR_LONG_ANSWER_MS of speech: a stammered start, a one-word reply) waits TUTOR_SHORT_ANSWER_EXTRA_MS longer on
 * both thresholds, so a normal thinking pause at the beginning is not mistaken for the end of the answer.
 * Turns that start from a cached clip with no generation delay (the Teil changes and the closing line) cannot speculate: they use the HOLD threshold
 * directly.
 * Env (all optional, read at call time so tests can change them): MUENDLICH_TUTOR_SPECULATE_SILENCE_MS, MUENDLICH_TUTOR_HOLD_SILENCE_MS,
 * MUENDLICH_TUTOR_LONG_ANSWER_MS, MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS.
 */
const num = (name: string, dflt: number) => { const v = Number(process.env[name]); return Number.isFinite(v) && v >= 0 && process.env[name] !== undefined && process.env[name] !== "" ? v : dflt; };

function shortExtra(spokenMs: number): number {
  return spokenMs >= num("MUENDLICH_TUTOR_LONG_ANSWER_MS", 6_000) ? 0 : num("MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS", 1_000);
}

/** @param spokenMs how long the student has been speaking in this answer window (first speech -> last speech); 0 if nothing yet */
export function tutorSpeculateSilenceMs(spokenMs: number): number {
  return num("MUENDLICH_TUTOR_SPECULATE_SILENCE_MS", 1_500) + shortExtra(spokenMs);
}

/** Silence the student must have had before the tutor may speak (also the decision threshold for the cached-clip turns that cannot speculate). */
export function tutorHoldSilenceMs(spokenMs: number): number {
  return num("MUENDLICH_TUTOR_HOLD_SILENCE_MS", 3_500) + shortExtra(spokenMs);
}
