/**
 * Raw WebSocket client for ElevenLabs Scribe v2 Realtime (speech-to-text).
 * Protocol verified against ElevenLabs' own docs before writing this, and
 * extensively live-tested since (real exams, real candidate audio, this
 * module's own per-slot STT connections) — the account-tier restriction
 * that once blocked library-voice TTS (a separate endpoint/limitation, see
 * phraseLibrary/generateLibrary.ts's header for its own resolution) never
 * actually applied to this STT endpoint in practice.
 *
 *   connect: wss://api.elevenlabs.io/v1/speech-to-text/realtime
 *            ?model_id=scribe_v2_realtime&audio_format=pcm_16000
 *            &language_code=de&commit_strategy=vad
 *   auth: header "xi-api-key"
 *   -> {message_type:"input_audio_chunk", audio_base_64, commit:false, sample_rate}
 *   <- {message_type:"partial_transcript", text}   (interim, may change)
 *   <- {message_type:"committed_transcript", text} (final for a segment —
 *      with commit_strategy=vad, ElevenLabs' own voice-activity detector
 *      decides the segment boundary, the same role Deepgram's speech_final
 *      played in the earlier Cartesia-pipeline prototype: a validated,
 *      safe "candidate paused speaking" trigger, not something built here
 *      from scratch)
 *
 * One instance per candidate SLOT (A or B), not one shared stream for the
 * room — server.ts already knows which participant's socket each audio
 * chunk arrived on, so routing per-slot here gives real speaker attribution
 * instead of the "last sender before this transcript arrived" heuristic the
 * Gemini-Live version's file header explicitly flagged as a known
 * simplification. This is a genuine improvement, not just a vendor swap.
 */
import WebSocket from "ws";

export interface SttCallbacks {
  onPartial?: (text: string) => void;
  /** Segment-final transcript — the "candidate paused" trigger. */
  onCommitted?: (text: string, atMs: number) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface SttSession {
  sendPcm16(base64: string): void;
  /** Utterance-buffering backends (whisperStt.ts) transcribe a whole buffered
   * segment per request; this forces any currently buffered audio out and
   * resolves once its transcript has been delivered (or failed). Streaming
   * backends (ElevenLabs) commit continuously and don't implement it. */
  flush?(): Promise<void>;
  /** Per-request-billed backends (Groq) report what they will actually be billed
   * for: requests made and billed seconds (each request is billed for at least
   * 10s). Lets the exam cost record use real billing instead of forwarded
   * audio minutes. */
  billing?(): { requests: number; billedSeconds: number };
  close(): void;
}

// ROOT CAUSE of "STT connections close early in every real exam" (found
// 2026-10-04 by an isolated experiment: connect, send NO audio, the server
// closes it with code 1000 after exactly ~15s of inactivity). The exam relay
// only forwards candidate audio during/just after speech (muendlichVoice
// Session.shouldForwardToStt) and hard-suppresses it while the examiner is
// speaking — the welcome + exam_start + first question alone is 15-20s of
// NO audio forwarded — so both candidates' STT sockets died before the first
// word and were never reopened ("organic triggers disabled for the rest of
// the exam"), leaving candidate speech untranscribed for the whole exam.
// A silent 100 ms frame every few seconds counts as activity; it is billed
// as audio but is ~1% of a live second, i.e. negligible.
const KEEPALIVE_INTERVAL_MS = 5_000;
const SILENT_100MS_16K_B64 = Buffer.alloc(3200, 0).toString("base64");

export function openRealtimeStt(callbacks: SttCallbacks): Promise<SttSession> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Promise.reject(new Error("ELEVENLABS_API_KEY not set"));
  const model = process.env.ELEVENLABS_STT_MODEL ?? "scribe_v2_realtime";
  const params = new URLSearchParams({
    model_id: model,
    audio_format: "pcm_16000",
    language_code: "de",
    commit_strategy: "vad",
  });
  const url = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { "xi-api-key": key } });
    let opened = false;
    let lastSendAt = Date.now();
    let keepalive: NodeJS.Timeout | null = null;
    ws.on("upgrade", (res: any) => { res.socket?.setNoDelay?.(true); });

    const send = (base64: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        lastSendAt = Date.now();
        ws.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: base64, commit: false, sample_rate: 16000 }));
      }
    };

    ws.on("open", () => {
      opened = true;
      // See KEEPALIVE_INTERVAL_MS's comment above for why this exists.
      keepalive = setInterval(() => {
        if (Date.now() - lastSendAt >= KEEPALIVE_INTERVAL_MS) send(SILENT_100MS_16K_B64);
      }, KEEPALIVE_INTERVAL_MS);
      resolve({
        sendPcm16: send,
        close() { if (keepalive) clearInterval(keepalive); ws.close(); },
      });
    });

    ws.on("message", (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.message_type === "partial_transcript" && msg.text) callbacks.onPartial?.(msg.text);
      else if (msg.message_type === "committed_transcript" && msg.text) callbacks.onCommitted?.(msg.text, Date.now());
      else if (typeof msg.message_type === "string" && msg.message_type.includes("error")) {
        callbacks.onError?.(msg.error ?? msg.message_type);
      }
    });
    ws.on("error", (err) => { callbacks.onError?.(err instanceof Error ? err.message : String(err)); if (!opened) reject(err); });
    ws.on("close", (code, reason) => {
      if (keepalive) clearInterval(keepalive);
      // Real gap found 2026-10-04 while investigating repeated early STT
      // closes during live testing: this handler used to discard the actual
      // WebSocket close code/reason entirely, so an application-level
      // failure (auth_error, quota — see openRealtimeStt's own header
      // comment, which already anticipated this) was indistinguishable in
      // the logs from a normal end-of-session close. Surfacing it doesn't
      // change behavior, only diagnosability.
      console.warn(`[elevenLabsStt] connection closed, code=${code} reason="${reason?.toString?.() ?? ""}"`);
      callbacks.onClose?.();
    });
  });
}
