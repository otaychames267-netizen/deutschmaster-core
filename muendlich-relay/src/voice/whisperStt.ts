/**
 * Self-hosted German STT client — talks to whisper-server/ (faster-whisper
 * wrapped in a stateless HTTP /transcribe endpoint), drop-in-compatible
 * with elevenLabsStt.ts's SttCallbacks/SttSession shape.
 *
 * WHY this exists: at the real Teil-1 student-response duration
 * (7,000-10,000 chars/candidate ≈ 15-22 minutes of speech per exam room),
 * ElevenLabs' STT credit rate (330 credits/min) and even Google Cloud STT's
 * $0.016/min ($14-17/participant/month at this duration ALONE — see
 * finalCostModel.mjs) both blow the $10/participant/month budget by
 * themselves. Self-hosted faster-whisper costs ~$0.01/exam room — this is
 * the single change that makes the budget work, not an optional extra.
 *
 * Utterance-buffering, not true streaming: whisper-server's /transcribe
 * endpoint takes one complete audio buffer per call (faster-whisper's
 * stable, file-oriented transcribe() API), not a persistent stream. This
 * client buffers PCM16 chunks and flushes (POSTs) whenever no new chunk has
 * arrived for FLUSH_DEBOUNCE_MS — which reliably signals "the caller's own
 * hangover window has closed" (muendlichVoiceSession.ts's
 * shouldForwardToStt already applies RMS-based silence suppression WITH a
 * 1500ms hangover before calling sendPcm16 at all, so by the time frames
 * stop arriving here, a real pause has already been confirmed upstream —
 * this client doesn't need to re-implement that logic, just detect the gap).
 * This means onPartial (interim results) is never called — a real,
 * disclosed simplification (see whisper-server/README.md's header) versus
 * ElevenLabs' true incremental streaming; onCommitted fires once per
 * detected utterance, which is the only signal muendlichVoiceSession.ts's
 * organic-trigger mechanism actually consumes.
 *
 * NOT LIVE-TESTED: no whisper-server instance is running anywhere this
 * session can reach (WHISPER_STT_URL unset) — see whisperStt.live-test.mjs
 * for the exact BLOCKED status.
 */
import type { SttCallbacks, SttSession } from "./elevenLabsStt.js";

const FLUSH_DEBOUNCE_MS = 400;
const SAMPLE_RATE = 16_000;
const BYTES_PER_SAMPLE = 2; // PCM16
const MIN_UTTERANCE_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * 0.3; // ~0.3s — shorter than this isn't worth a real inference call

export function openWhisperStt(callbacks: SttCallbacks): Promise<SttSession> {
  const rawBaseUrl = process.env.WHISPER_STT_URL;
  if (!rawBaseUrl) return Promise.reject(new Error("WHISPER_STT_URL not set"));
  const baseUrl = rawBaseUrl.replace(/\/$/, "");

  let closed = false;
  let chunks: Buffer[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let inFlightFlush: Promise<void> | null = null;

  async function flush() {
    if (chunks.length === 0) return;
    const buf = Buffer.concat(chunks);
    chunks = [];
    if (buf.length < MIN_UTTERANCE_BYTES) return; // too short to be real speech, drop silently (matches ElevenLabs' vad-based commit behavior of not firing on noise blips)

    const doFetch = (async () => {
      try {
        const res = await fetch(`${baseUrl}/transcribe`, {
          method: "POST",
          headers: { "content-type": "application/octet-stream" },
          body: buf,
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          callbacks.onError?.(`whisper-server ${res.status}: ${body.slice(0, 300)}`);
          return;
        }
        const data = (await res.json()) as { text?: string };
        const text = (data.text ?? "").trim();
        if (text) callbacks.onCommitted?.(text, Date.now());
      } catch (e) {
        callbacks.onError?.(e instanceof Error ? e.message : String(e));
      }
    })();
    inFlightFlush = doFetch;
    await doFetch;
    if (inFlightFlush === doFetch) inFlightFlush = null;
  }

  return Promise.resolve({
    sendPcm16(base64: string) {
      if (closed) return;
      chunks.push(Buffer.from(base64, "base64"));
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => { void flush(); }, FLUSH_DEBOUNCE_MS);
    },
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
  });
}
