/**
 * Real speech-vs-silence detection for one candidate's mic stream — the single
 * implementation used both by the STT silence gate (muendlichVoiceSession.ts)
 * and by the room's silence logic (server.ts).
 *
 * WHY: the browser client streams EVERY mic frame (silence included) and the
 * relay used to treat "a frame arrived" as "the candidate is talking" (lastAudioAt).
 * So "finished early", "answer looks finished", the mid-speech grace, the
 * anti-silence nudges and the idle close — all designed around real silence —
 * could never trigger in a real room (found by a full-length exam test). And the
 * STT gate's fixed 0.02 RMS threshold treated a quiet speaker (median speech-frame
 * RMS 0.012 — an ordinary laptop mic at low gain) as silent most of the time, so
 * most of what they said never reached STT.
 *
 * The threshold is adaptive per candidate: 3x that mic's running noise floor,
 * clamped to [0.006, 0.02]:
 *  - the floor is learned from frames judged NOT speech outside the speech
 *    hangover (so word tails and in-speech lulls never raise it) — a quiet room
 *    keeps the threshold at 0.006, which a quiet speaker clears;
 *  - a STEADY level (the last ~5s of frames within a ~2x band, i.e. a fan or hum —
 *    speech never holds that still) is learned as noise too, so continuous
 *    background noise doesn't become permanent "speech".
 *
 * Kill switch: MUENDLICH_SPEECH_DETECT=off makes every frame count as speech
 * (the previous behaviour). MUENDLICH_SPEECH_RMS pins a fixed threshold.
 */
const FLOOR = 0.006;
const CEILING = 0.02;
const NOISE_HANGOVER_MS = 1_500;
const STEADY_FRAMES = 60;       // ~5s of 85ms browser frames
const STEADY_BAND = 2.2;        // max/min within this => steady noise, not speech
const STEADY_MIN_RMS = 0.004;   // below this it is just a quiet room (handled by FLOOR)

const DISABLED = (process.env.MUENDLICH_SPEECH_DETECT ?? "on").toLowerCase() === "off";
const FIXED = Number(process.env.MUENDLICH_SPEECH_RMS ?? 0);

export function frameRmsFromBase64(base64: string): number {
  const buf = Buffer.from(base64, "base64");
  let sum = 0, n = 0;
  for (let i = 0; i + 1 < buf.length; i += 2) { const v = buf.readInt16LE(i) / 32768; sum += v * v; n++; }
  return n > 0 ? Math.sqrt(sum / n) : 0;
}

export class SpeechDetector {
  private noiseFloor = 0.002;
  private lastSpeechAt = 0;
  private recent: number[] = [];

  threshold(): number {
    if (FIXED > 0) return FIXED;
    return Math.min(CEILING, Math.max(FLOOR, this.noiseFloor * 3));
  }

  /** true if this frame contains speech. */
  isSpeech(base64: string, now = Date.now()): boolean {
    if (DISABLED) return true;
    const rms = frameRmsFromBase64(base64);

    this.recent.push(rms);
    if (this.recent.length > STEADY_FRAMES) this.recent.shift();
    if (this.recent.length === STEADY_FRAMES) {
      let min = Infinity, max = 0, sum = 0;
      for (const r of this.recent) { if (r < min) min = r; if (r > max) max = r; sum += r; }
      if (min >= STEADY_MIN_RMS && max <= min * STEADY_BAND) this.noiseFloor = Math.max(this.noiseFloor, sum / STEADY_FRAMES);
    }

    if (rms > this.threshold()) { this.lastSpeechAt = now; return true; }
    if (now - this.lastSpeechAt >= NOISE_HANGOVER_MS) this.noiseFloor = this.noiseFloor * 0.98 + rms * 0.02;
    return false;
  }
}
