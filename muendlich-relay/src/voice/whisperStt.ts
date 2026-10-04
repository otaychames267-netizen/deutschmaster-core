/**
 * Utterance-buffering STT client shared by every non-streaming speech-to-text
 * backend — drop-in-compatible with elevenLabsStt.ts's SttCallbacks/SttSession.
 * Two transcribe functions plug into it: a self-hosted faster-whisper
 * `/transcribe` endpoint (openWhisperStt below, WHISPER_STT_URL) and Groq's
 * hosted Whisper API (groqStt.ts, GROQ_API_KEY).
 *
 * WHY non-ElevenLabs STT exists: ElevenLabs' realtime STT costs ~$0.10 per
 * exam room (15 min of speech × $0.39/hr) — with the rest of the pipeline
 * optimised, that single line is what stops 60 exams landing under $10 (see
 * finalCostModel.mjs). Whisper-large-v3-turbo on Groq is $0.04/hr (~$0.01 per
 * exam); self-hosted is cheaper still but needs a GPU endpoint.
 *
 * Utterance-buffering, not true streaming: the transcribe call takes one
 * complete audio buffer per request. This client buffers PCM16 chunks and
 * flushes whenever no new chunk has arrived for FLUSH_DEBOUNCE_MS — which
 * reliably signals "the caller's own hangover window has closed"
 * (muendlichVoiceSession.ts's shouldForwardToStt already applies RMS-based
 * silence suppression WITH a 1500ms hangover before calling sendPcm16 at all,
 * so by the time frames stop arriving here, a real pause has already been
 * confirmed upstream). onPartial (interim results) is never called — a
 * disclosed simplification versus ElevenLabs' incremental streaming;
 * onCommitted fires once per detected utterance, which is the only signal
 * muendlichVoiceSession.ts actually consumes.
 *
 * Two things a plain debounce-only client got wrong for the exam, fixed here:
 *  - MAX_SEGMENT_MS: a candidate speaking continuously for a 90s Teil-1
 *    presentation never pauses long enough to trigger the debounce, so NOTHING
 *    would be committed until the very end — the examiner would then open its
 *    follow-up question with an empty transcript. Long speech is now cut into
 *    ~12s segments so the transcript arrives progressively.
 *  - Ordering: segments are transcribed through one promise chain, so a slow
 *    response for segment 1 can never be delivered after segment 2.
 */
import type { SttCallbacks, SttSession } from "./elevenLabsStt.js";

const FLUSH_DEBOUNCE_MS = 400;
const SAMPLE_RATE = 16_000;
const BYTES_PER_SAMPLE = 2; // PCM16
const MAX_SEGMENT_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * 12; // ~12s of continuous speech per request
const WINDOW_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * 0.05; // 50ms analysis window
const VOICED_RMS = 0.02 * 32768; // same threshold as the upstream silence gate (muendlichVoiceSession.ts SILENCE_RMS_THRESHOLD)
const MIN_VOICED_WINDOWS = 6; // ~0.3s of actual voiced audio — less isn't worth a real inference call
const SPEECH_PAD_BEFORE_WINDOWS = 4; // keep 200ms of lead-in so a word onset isn't clipped
const SPEECH_PAD_AFTER_WINDOWS = 6; // and 300ms of tail

export type TranscribeFn = (pcm16: Buffer) => Promise<string>;

function windowRms(buf: Buffer, offset: number): number {
  const end = Math.min(offset + WINDOW_BYTES, buf.length);
  let sum = 0, n = 0;
  for (let i = offset; i + 1 < end; i += 2) { const v = buf.readInt16LE(i); sum += v * v; n++; }
  return n ? Math.sqrt(sum / n) : 0;
}

/** Whisper-class models hallucinate stock phrases ("Vielen Dank.", "...") on
 * near-silent audio, and the upstream gate's 1.5s hangover means every buffer
 * ends in silence. Drop buffers with too little voiced audio outright, and
 * trim the rest to the voiced span (plus a small pad) — fewer hallucination
 * triggers, and less audio to send. Found by the live test
 * (groqStt.live-test.mjs): digital silence -> "Vielen Dank.", noise -> "...". */
function trimToSpeech(buf: Buffer): Buffer | null {
  let first = -1, last = -1, voiced = 0;
  const windows = Math.floor(buf.length / WINDOW_BYTES);
  for (let w = 0; w < windows; w++) {
    if (windowRms(buf, w * WINDOW_BYTES) >= VOICED_RMS) { voiced++; if (first < 0) first = w; last = w; }
  }
  if (voiced < MIN_VOICED_WINDOWS) return null;
  const from = Math.max(0, first - SPEECH_PAD_BEFORE_WINDOWS) * WINDOW_BYTES;
  const to = Math.min(windows, last + 1 + SPEECH_PAD_AFTER_WINDOWS) * WINDOW_BYTES;
  return buf.subarray(from, to);
}

/** Where to cut a too-long continuous buffer: the quietest 50ms window in the
 * last 4s (a gap between words) rather than a blind hard cut mid-word — the
 * live test lost "Außerdem" at a hard cut. */
function quietestSplitPoint(buf: Buffer): number {
  const windows = Math.floor(buf.length / WINDOW_BYTES);
  const firstCandidate = Math.max(1, windows - 80); // last 4s
  let bestW = windows, bestRms = Infinity;
  for (let w = firstCandidate; w < windows - 10; w++) { // not within the last 0.5s
    const rms = windowRms(buf, w * WINDOW_BYTES);
    if (rms <= bestRms) { bestRms = rms; bestW = w; }
  }
  return bestW >= windows ? buf.length : bestW * WINDOW_BYTES;
}

export function openBufferedStt(transcribe: TranscribeFn, callbacks: SttCallbacks): SttSession {
  let closed = false;
  let chunks: Buffer[] = [];
  let bufferedBytes = 0;
  let flushTimer: NodeJS.Timeout | null = null;
  let chain: Promise<void> = Promise.resolve();

  function submit(buf: Buffer) {
    const speech = trimToSpeech(buf);
    if (!speech) return; // too little voiced audio: drop silently (matches ElevenLabs' VAD commit not firing on noise blips)
    chain = chain.then(async () => {
      try {
        const text = (await transcribe(speech)).trim();
        if (text && !closed) callbacks.onCommitted?.(text, Date.now());
      } catch (e) {
        callbacks.onError?.(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function flush(): Promise<void> {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (chunks.length > 0) {
      const buf = Buffer.concat(chunks);
      chunks = [];
      bufferedBytes = 0;
      submit(buf);
    }
    return chain;
  }

  /** Continuous speech past MAX_SEGMENT_BYTES: submit up to the quietest point
   * and keep the remainder buffered as the start of the next segment. */
  function cutLongSegment() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    const buf = Buffer.concat(chunks);
    const at = quietestSplitPoint(buf);
    submit(buf.subarray(0, at));
    const rest = Buffer.from(buf.subarray(at));
    chunks = rest.length ? [rest] : [];
    bufferedBytes = rest.length;
  }

  return {
    sendPcm16(base64: string) {
      if (closed) return;
      const chunk = Buffer.from(base64, "base64");
      chunks.push(chunk);
      bufferedBytes += chunk.length;
      if (bufferedBytes >= MAX_SEGMENT_BYTES) cutLongSegment();
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => { void flush(); }, FLUSH_DEBOUNCE_MS);
    },
    flush,
    close() {
      closed = true;
      if (flushTimer) clearTimeout(flushTimer);
      // Deliberately does NOT flush a partial trailing buffer on close — the
      // session is ending, there's no one left to receive a late
      // onCommitted callback for it, and firing one into a closing session
      // risks the exact "message after close" race this codebase has
      // otherwise been careful to avoid (see muendlichVoiceSession.ts's
      // generation-id supersession comments).
      callbacks.onClose?.();
    },
  };
}

/** Self-hosted faster-whisper (whisper-server/). NOT LIVE-TESTED: no instance
 * is running anywhere this project can reach (WHISPER_STT_URL unset). */
export function openWhisperStt(callbacks: SttCallbacks): Promise<SttSession> {
  const rawBaseUrl = process.env.WHISPER_STT_URL;
  if (!rawBaseUrl) return Promise.reject(new Error("WHISPER_STT_URL not set"));
  const baseUrl = rawBaseUrl.replace(/\/$/, "");

  const transcribe: TranscribeFn = async (pcm) => {
    const res = await fetch(`${baseUrl}/transcribe`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(pcm),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`whisper-server ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { text?: string };
    return data.text ?? "";
  };
  return Promise.resolve(openBufferedStt(transcribe, callbacks));
}
