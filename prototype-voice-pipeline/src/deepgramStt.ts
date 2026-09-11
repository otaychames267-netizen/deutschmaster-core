/**
 * deepgramStt.ts — raw WebSocket streaming STT client (no SDK, matching this
 * repo's established bias — see claudeExaminerBrain.ts's header comment).
 *
 * Protocol per Deepgram's live-streaming API: connect with the API key as a
 * Bearer/Token Authorization header, stream raw linear16 PCM as binary
 * frames, receive JSON "Results" messages (interim + is_final/speech_final)
 * and a separate "UtteranceEnd" event once utterance_end_ms of silence
 * follows the last finalized word — that UtteranceEnd event is this
 * prototype's sole "candidate is done talking" signal (see harness.ts).
 *
 * NOT yet smoke-tested against the real Deepgram service — DEEPGRAM_API_KEY
 * isn't available in this environment. Written against documented protocol
 * shape as of this session; verify field names on the first real run and
 * adjust here if Deepgram's wire format has since changed.
 */
import WebSocket from "ws";

export interface DeepgramCallbacks {
  onOpen?: () => void;
  onInterim?: (text: string, atMs: number) => void;
  onFinal?: (text: string, confidence: number, atMs: number) => void;
  onUtteranceEnd?: (atMs: number) => void;
  /** msg.speech_final on a Results message — Deepgram's OWN per-segment
   * endpointing signal (driven by the `endpointing` param's silence
   * window), distinct from the separate UtteranceEnd event (driven by the
   * larger `utterance_end_ms` window). Being tested as a potentially
   * earlier-firing alternative "candidate is done" trigger. */
  onSpeechFinal?: (text: string, atMs: number) => void;
  /** Fires when a Results message carries from_finalize:true — confirms a
   * {"type":"Finalize"} control message's flush has actually completed
   * server-side. Needed to avoid a race where the flush's own (possibly
   * delayed) response arrives during the NEXT utterance's window and gets
   * misread as that utterance's own end-of-speech signal. */
  onFinalizeComplete?: (atMs: number) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

export interface DeepgramSession {
  sendPcm16(chunk: Buffer): void;
  /** Tell Deepgram no more audio is coming — flushes any pending finalization. */
  finish(): void;
  /** {"type":"Finalize"} control message — forces Deepgram to flush/process
   * all audio buffered since the last finalization point and cleanly reset
   * its endpointing state, WITHOUT tearing down the WebSocket. Sending this
   * right after detecting speech_final/UtteranceEnd is what makes reusing
   * ONE Deepgram connection across multiple turns safe — see
   * deepgramMultiTurn.ts, where omitting this caused turns 2+ to misfire
   * (spuriously fast) or never fire at all, because Deepgram's endpointing
   * had no explicit per-utterance reset boundary. */
  finalize(): void;
  close(): void;
}

export function openDeepgramStream(sampleRate: number, callbacks: DeepgramCallbacks): Promise<DeepgramSession> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return Promise.reject(new Error("DEEPGRAM_API_KEY not set"));

  const model = process.env.DEEPGRAM_MODEL ?? "nova-3";
  const params = new URLSearchParams({
    model,
    language: "de",
    encoding: "linear16",
    sample_rate: String(sampleRate),
    channels: "1",
    interim_results: "true",
    utterance_end_ms: process.env.DEEPGRAM_UTTERANCE_END_MS ?? "1000",
    punctuate: "true",
    endpointing: process.env.DEEPGRAM_ENDPOINTING_MS ?? "300",
  });
  const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Token ${key}` } });
    let opened = false;

    // OPTIMIZATION: disable Nagle's algorithm on the underlying TCP socket.
    // Node doesn't set TCP_NODELAY by default, and Nagle batches small
    // outbound writes (our 20ms PCM16 frames are ~640 bytes each) waiting
    // either for a full segment or an ACK of the previous one — up to
    // ~40ms of pure batching delay per send on a naive connection. This is
    // the same fix applied to cartesiaTts.ts's connection.
    if (process.env.DEEPGRAM_NODELAY_OFF !== "1") {
      ws.on("upgrade", (res: any) => { res.socket?.setNoDelay?.(true); });
    }

    ws.on("open", () => {
      opened = true;
      callbacks.onOpen?.();
      resolve({
        sendPcm16(chunk: Buffer) {
          if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
        },
        finish() {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" }));
        },
        finalize() {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "Finalize" }));
        },
        close() {
          ws.close();
        },
      });
    });

    ws.on("message", (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      const now = Date.now();

      if (msg.type === "UtteranceEnd") {
        callbacks.onUtteranceEnd?.(now);
        return;
      }
      if (msg.type === "Results" || msg.channel) {
        if (msg.from_finalize) callbacks.onFinalizeComplete?.(now);
        const alt = msg.channel?.alternatives?.[0];
        const text = alt?.transcript ?? "";
        if (!text) return;
        if (msg.is_final) {
          callbacks.onFinal?.(text, alt?.confidence ?? 0, now);
          if (msg.speech_final) callbacks.onSpeechFinal?.(text, now);
        } else callbacks.onInterim?.(text, now);
      }
    });

    ws.on("error", (err) => {
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      if (!opened) reject(err);
    });

    ws.on("close", () => callbacks.onClose?.());
  });
}
