/**
 * Turn guard for the 1:1 tutor (owner 2026-10-10: "the candidate's turn must be respected").
 *
 * The tutor starts GENERATING its next question as soon as the student has been silent for a short while (speculative start — hides the ~3 s of
 * Claude + TTS behind the pause), but it must not SPEAK until the student has been silent for the longer hold time. If the student starts talking
 * again in between (a thinking pause in the middle of an answer — 4 of 14 long answers in the 2026-10-10 production run), the half-prepared turn is
 * thrown away and the student keeps the floor. Pure decision logic so it can be unit-tested without audio or network.
 */
export interface TurnGuardOptions {
  /** Silence (since the student's last speech frame) that must have elapsed before the tutor may speak. */
  holdSilenceMs: number;
  /** Speech after the guard started that counts as "the student is still answering". */
  resumeSpeechMs: number;
  /** Never hold longer than this (a stuck speech detector must not freeze the exam). */
  maxHoldMs: number;
}

export interface StudentSpeechState {
  /** Wall-clock time of the last frame classified as speech (0 = never). */
  lastSpeechAt: number;
  /** Total milliseconds of speech frames seen in this session so far. */
  speechMs: number;
}

export type TurnGuardVerdict = "wait" | "open" | "yield";

export class TurnGuard {
  private readonly startedAt: number;
  private readonly speechMsAtStart: number;

  constructor(private readonly opts: TurnGuardOptions, start: StudentSpeechState, now: number = Date.now()) {
    this.startedAt = now;
    this.speechMsAtStart = start.speechMs;
  }

  check(current: StudentSpeechState, now: number = Date.now()): TurnGuardVerdict {
    if (current.speechMs - this.speechMsAtStart >= this.opts.resumeSpeechMs) return "yield";
    if (now - this.startedAt >= this.opts.maxHoldMs) return "open";
    if (now - current.lastSpeechAt >= this.opts.holdSilenceMs) return "open";
    return "wait";
  }
}
