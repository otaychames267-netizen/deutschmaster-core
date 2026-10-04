/**
 * Automatic STT failover: run on a cheap primary backend (Groq), and if it
 * starts failing, switch THIS candidate's stream to a fallback (ElevenLabs
 * realtime) for the rest of the exam instead of silently losing every
 * transcript.
 *
 * Why this exists: Groq's free tier has hard limits (2,000 requests/day,
 * 7,200 audio-seconds/hour) and any hosted API can have an outage. Without
 * failover, a 429 storm or an outage means a paying candidate's exam runs with
 * NO transcription — the examiner can't ground its questions and the
 * evaluator sees an empty transcript. With it, the worst case is "this exam
 * costs ~$0.05 more", not "this exam is broken".
 *
 * Failover triggers (either is enough):
 *   - the primary reports an error marked permanent (PERMANENT_MARKER: bad
 *     key, daily quota exhausted — retrying cannot help), or
 *   - FAILOVER_AFTER_CONSECUTIVE_ERRORS errors in a row with no successful
 *     commit in between (the primary has already retried each request itself).
 * Audio that arrives while the fallback is still connecting is queued and
 * replayed, so the switch itself doesn't drop speech. Segments that had
 * already failed on the primary are lost — unavoidable, and at most a few.
 */
import type { SttCallbacks, SttSession } from "./elevenLabsStt.js";

export const PERMANENT_MARKER = "[permanent]";
const FAILOVER_AFTER_CONSECUTIVE_ERRORS = 3;

export type FailoverSttSession = SttSession & {
  /** True once this stream has switched to the fallback backend. */
  readonly failedOver: boolean;
};

export async function openFailoverStt(
  openPrimary: (cb: SttCallbacks) => Promise<SttSession>,
  openFallback: (cb: SttCallbacks) => Promise<SttSession>,
  callbacks: SttCallbacks,
  label: string,
): Promise<FailoverSttSession> {
  let failedOver = false;
  let switching = false;
  let closed = false;
  let consecutiveErrors = 0;
  let fallback: SttSession | null = null;
  let queued: string[] = [];

  const startFailover = (why: string) => {
    if (failedOver || switching || closed) return;
    switching = true;
    console.error(`[failoverStt] ${label}: primary STT failing (${why}) — switching this stream to the fallback backend for the rest of the exam`);
    openFallback(callbacks)
      .then((s) => {
        if (closed) { s.close(); return; }
        fallback = s;
        failedOver = true;
        switching = false;
        for (const b64 of queued) s.sendPcm16(b64);
        queued = [];
      })
      .catch((e) => {
        switching = false;
        console.error(`[failoverStt] ${label}: fallback STT ALSO failed to open — no transcription for this stream:`, e);
        callbacks.onError?.(`fallback STT failed to open: ${e instanceof Error ? e.message : String(e)}`);
      });
  };

  const primary = await openPrimary({
    ...callbacks,
    onCommitted: (text, at) => { consecutiveErrors = 0; callbacks.onCommitted?.(text, at); },
    onError: (msg) => {
      callbacks.onError?.(msg);
      consecutiveErrors++;
      if (msg.includes(PERMANENT_MARKER)) startFailover(msg.slice(0, 120));
      else if (consecutiveErrors >= FAILOVER_AFTER_CONSECUTIVE_ERRORS) startFailover(`${consecutiveErrors} consecutive errors, last: ${msg.slice(0, 120)}`);
    },
    // The primary's own close is the session ending (buffered clients only
    // call it from close()); don't forward it while we're switching.
    onClose: () => { if (!switching && !failedOver) callbacks.onClose?.(); },
  });

  return {
    get failedOver() { return failedOver; },
    sendPcm16(base64) {
      if (closed) return;
      if (failedOver && fallback) fallback.sendPcm16(base64);
      else if (switching) { if (queued.length < 600) queued.push(base64); } // ~60s of 100ms frames, bounded
      else primary.sendPcm16(base64);
    },
    async flush() {
      if (failedOver && fallback) await fallback.flush?.();
      else await primary.flush?.();
    },
    close() {
      closed = true;
      primary.close();
      fallback?.close();
    },
  };
}
