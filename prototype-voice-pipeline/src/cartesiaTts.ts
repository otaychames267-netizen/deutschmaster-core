/**
 * cartesiaTts.ts — raw WebSocket streaming TTS client (no SDK).
 *
 * Protocol per Cartesia's streaming TTS API: connect with the API key as a
 * query param, send one JSON request per synthesis describing the text +
 * voice + desired raw PCM output format, receive a stream of base64-encoded
 * audio chunks tagged with the request's context_id, followed by a "done"
 * message for that context_id.
 *
 * LATENCY FIX: the original version opened a fresh WebSocket (full TLS +
 * auth handshake) for every single synthesize() call. Measured average
 * time-to-first-audio was ~1.1s against Cartesia's own advertised ~90ms for
 * Sonic-3 — a >10x gap that pointed straight at per-call connection setup,
 * not the model itself. A real exam session makes many examiner turns over
 * its lifetime; there's no reason to pay a fresh handshake for each one.
 * openCartesiaConnection() now opens ONE socket for the whole session,
 * synthesizeOnConnection() reuses it per turn (distinguishing turns by
 * context_id, since multiple could theoretically be in flight), and the
 * connection is closed once at session end via closeCartesiaConnection().
 * synthesize() (open, synthesize once, close) is kept for the single-shot
 * harness.ts default run.
 */
import WebSocket from "ws";

const CARTESIA_VERSION = "2026-01-01";
const OUTPUT_SAMPLE_RATE = 24000;

export interface CartesiaCallbacks {
  onFirstChunk?: (atMs: number) => void;
  onChunk?: (pcm: Buffer) => void;
  onDone?: (atMs: number) => void;
  onError?: (err: Error) => void;
}

export interface CartesiaConnection {
  ws: WebSocket;
  connectMs: number; // wall-clock ms the initial handshake took
}

export function openCartesiaConnection(): Promise<CartesiaConnection> {
  const key = process.env.CARTESIA_API_KEY;
  if (!key) return Promise.reject(new Error("CARTESIA_API_KEY not set"));
  const url = `wss://api.cartesia.ai/tts/websocket?api_key=${encodeURIComponent(key)}&cartesia_version=${CARTESIA_VERSION}`;
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    // OPTIMIZATION: same Nagle's-algorithm fix as deepgramStt.ts — TTS text
    // fragments and audio chunks are also small/frequent. NOT YET
    // benchmarked live (Cartesia credits exhausted this session) — prepared
    // so it's ready the moment credits are topped up; safe/inert either way.
    ws.on("upgrade", (res: any) => { res.socket?.setNoDelay?.(true); });
    ws.on("open", () => resolve({ ws, connectMs: Date.now() - t0 }));
    ws.on("error", (err) => reject(err instanceof Error ? err : new Error(String(err))));
  });
}

export function closeCartesiaConnection(conn: CartesiaConnection): void {
  conn.ws.close();
}

/** Reuses an already-open connection for one synthesis turn. */
export function synthesizeOnConnection(conn: CartesiaConnection, text: string, voiceId: string, callbacks: CartesiaCallbacks): Promise<void> {
  if (!voiceId) return Promise.reject(new Error("voiceId is required — pick one via voicePool.ts's pickSessionVoice()"));
  const model = process.env.CARTESIA_MODEL ?? "sonic-3";
  const contextId = `prototype-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    let gotFirstChunk = false;
    let settled = false;

    const onMessage = (raw: WebSocket.RawData) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.context_id && msg.context_id !== contextId) return; // another turn's messages, ignore
      const now = Date.now();

      if (msg.type === "chunk" && msg.data) {
        if (!gotFirstChunk) { gotFirstChunk = true; callbacks.onFirstChunk?.(now); }
        callbacks.onChunk?.(Buffer.from(msg.data, "base64"));
      } else if (msg.type === "done") {
        callbacks.onDone?.(now);
        settled = true;
        conn.ws.off("message", onMessage);
        resolve();
      } else if (msg.type === "error") {
        const err = new Error(String(msg.error ?? "Cartesia synthesis error"));
        callbacks.onError?.(err);
        settled = true;
        conn.ws.off("message", onMessage);
        reject(err);
      }
    };
    conn.ws.on("message", onMessage);

    const onClose = () => {
      if (!settled) { settled = true; reject(new Error("Cartesia connection closed before a done/error message")); }
    };
    conn.ws.once("close", onClose);

    conn.ws.send(JSON.stringify({
      model_id: model,
      transcript: text,
      voice: { mode: "id", id: voiceId },
      language: "de",
      output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: OUTPUT_SAMPLE_RATE },
      context_id: contextId,
    }));
  });
}

export interface StreamingSynthesisHandle {
  /** Appends the next text chunk to the same in-progress utterance.
   * isFinal=true on the last chunk closes out the context (continue:false),
   * everything before that keeps it open (continue:true) — verified live
   * against the real Cartesia API that this produces one continuous,
   * naturally-stitched utterance rather than separate clips with gaps. */
  appendText(text: string, isFinal: boolean): void;
  /** Real mid-synthesis cancellation for barge-in — verified live against
   * the actual Cartesia API that {context_id, cancel:true} stops the
   * server from generating/sending further audio for this context (a real
   * "done" arrives ~1s after cancel, not a client-side "just stop
   * listening" fake). This is a genuine cancel, not a courtesy no-op. */
  cancel(): void;
  done: Promise<void>;
}

/**
 * Streaming append mode: caller can send text chunks as they become
 * available (e.g. sentence-by-sentence from a streaming Claude response)
 * instead of needing the complete reply text up front. This is the actual
 * mechanism behind the pipelined architecture — Cartesia starts speaking
 * chunk 1 while chunk 2+ hasn't been generated by Claude yet.
 */
export function startStreamingSynthesis(conn: CartesiaConnection, voiceId: string, callbacks: CartesiaCallbacks): StreamingSynthesisHandle {
  const model = process.env.CARTESIA_MODEL ?? "sonic-3";
  const contextId = `prototype-stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let gotFirstChunk = false;

  const done = new Promise<void>((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.context_id && msg.context_id !== contextId) return;
      const now = Date.now();

      if (msg.type === "chunk" && msg.data) {
        if (!gotFirstChunk) { gotFirstChunk = true; callbacks.onFirstChunk?.(now); }
        callbacks.onChunk?.(Buffer.from(msg.data, "base64"));
      } else if (msg.type === "done") {
        callbacks.onDone?.(now);
        conn.ws.off("message", onMessage);
        resolve();
      } else if (msg.type === "error") {
        const err = new Error(String(msg.error ?? "Cartesia synthesis error"));
        callbacks.onError?.(err);
        conn.ws.off("message", onMessage);
        reject(err);
      }
    };
    conn.ws.on("message", onMessage);
  });

  return {
    appendText(text: string, isFinal: boolean) {
      conn.ws.send(JSON.stringify({
        model_id: model,
        transcript: text,
        voice: { mode: "id", id: voiceId },
        language: "de",
        output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: OUTPUT_SAMPLE_RATE },
        context_id: contextId,
        continue: !isFinal,
      }));
    },
    cancel() {
      conn.ws.send(JSON.stringify({ context_id: contextId, cancel: true }));
    },
    done,
  };
}

/** Single-shot convenience wrapper: opens a connection, synthesizes once, closes. */
export async function synthesize(text: string, voiceId: string, callbacks: CartesiaCallbacks): Promise<void> {
  const conn = await openCartesiaConnection();
  try {
    await synthesizeOnConnection(conn, text, voiceId, callbacks);
  } finally {
    closeCartesiaConnection(conn);
  }
}

export const CARTESIA_OUTPUT_SAMPLE_RATE = OUTPUT_SAMPLE_RATE;
