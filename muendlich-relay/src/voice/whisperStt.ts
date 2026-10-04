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
const MIN_UTTERANCE_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * 0.3; // ~0.3s — shorter than this isn't worth a real inference call
const MAX_SEGMENT_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * 12; // ~12s of continuous speech per request

export type TranscribeFn = (pcm16: Buffer) => Promise<string>;

export function openBufferedStt(transcribe: TranscribeFn, callbacks: SttCallbacks): SttSession {
  let closed = false;
  let chunks: Buffer[] = [];
  let bufferedBytes = 0;
  let flushTimer: NodeJS.Timeout | null = null;
  let chain: Promise<void> = Promise.resolve();

  function flush(): Promise<void> {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (chunks.length > 0) {
      const buf = Buffer.concat(chunks);
      chunks = [];
      bufferedBytes = 0;
      if (buf.length >= MIN_UTTERANCE_BYTES) { // too short to be real speech: drop silently (matches ElevenLabs' VAD commit not firing on noise blips)
        chain = chain.then(async () => {
          try {
            const text = (await transcribe(buf)).trim();
            if (text && !closed) callbacks.onCommitted?.(text, Date.now());
          } catch (e) {
            callbacks.onError?.(e instanceof Error ? e.message : String(e));
          }
        });
      }
    }
    return chain;
  }

  return {
    sendPcm16(base64: string) {
      if (closed) return;
      const chunk = Buffer.from(base64, "base64");
      chunks.push(chunk);
      bufferedBytes += chunk.length;
      if (bufferedBytes >= MAX_SEGMENT_BYTES) { void flush(); return; }
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
