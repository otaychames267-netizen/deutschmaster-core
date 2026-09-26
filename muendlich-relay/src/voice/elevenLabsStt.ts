/**
 * Raw WebSocket client for ElevenLabs Scribe v2 Realtime (speech-to-text).
 * Protocol verified against ElevenLabs' docs before writing this (see this
 * module's README note on the account-tier blocker for live-test status):
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
  close(): void;
}

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
    ws.on("upgrade", (res: any) => { res.socket?.setNoDelay?.(true); });

    ws.on("open", () => {
      opened = true;
      resolve({
        sendPcm16(base64: string) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: base64, commit: false, sample_rate: 16000 }));
          }
        },
        close() { ws.close(); },
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
    ws.on("close", () => callbacks.onClose?.());
  });
}
