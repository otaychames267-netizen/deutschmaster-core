/**
 * ElevenLabs TTS — THREE distinct code paths for three distinct needs,
 * per the explicit product requirement that not every sentence should go
 * through the same pipeline:
 *
 *   1. openStreamingConnection() / startStreamingSynthesis() — the LIVE,
 *      latency-sensitive path for genuinely dynamic examiner speech
 *      (organic follow-ups, takeover questions, nudges). Uses the
 *      STANDARD /v1/text-to-speech/{voice_id}/stream-input endpoint with
 *      Flash v2.5 by default, not v3.
 *
 *      Model choice, explained (a real technical reason, not a cost-only
 *      pick): ElevenLabs' own documentation explicitly states v3 has
 *      materially higher first-token latency and is NOT recommended for
 *      real-time/conversational use — their own Agents Platform excludes
 *      v3 for exactly this reason and recommends Flash v2.5/v2. Verified
 *      via ElevenLabs' own docs/product guidance, not assumed. Flash v2.5
 *      is also literally half the published $/1000-characters rate of v3
 *      ($0.05 vs $0.10), which matters a lot given the 90-exams/month cost
 *      target. Quality tradeoff: v3 has richer expressiveness (audio tags,
 *      emotional range) that Flash lacks — which is exactly why it's kept
 *      for the pre-generated library below, where that quality is worth
 *      paying for ONCE, and latency is irrelevant since nothing is waiting
 *      on it live.
 *
 *   2. openDialogueConnection() / startDialogueSynthesis() — the ORIGINAL
 *      v3 Text-to-Dialogue streaming path from the first round of this
 *      work. Kept, not deleted, as an explicit A/B option — if live
 *      testing (once the account unblocks) shows v3's latency is
 *      acceptable in practice for this app's pacing, this is one env-var
 *      flip away (ELEVENLABS_DYNAMIC_TTS_MODE=dialogue) from being used
 *      live again. Only /v1/text-to-dialogue/stream-input supports v3 at
 *      all — the standard endpoint above explicitly does not.
 *
 *   3. synthesizeOnce() — a plain, NON-streaming REST call
 *      (POST /v1/text-to-speech/{voice_id}), for the pre-generated phrase
 *      library (phraseLibrary/generateLibrary.ts). Works with ANY model
 *      including v3 — used with v3 there specifically, since library audio
 *      is generated ONCE, offline, and played back thousands of times, so
 *      the extra quality is worth the one-time cost/latency.
 *
 * Protocol details for #1 and #3 verified against ElevenLabs' own docs
 * before writing this (not yet live-tested — the account-tier blocker
 * documented in this module's README applies to ALL THREE paths equally,
 * since it's an account limitation, not a per-endpoint one).
 */
import WebSocket from "ws";

const KEEPALIVE_INTERVAL_MS = 15_000; // under the documented 20s idle timeout

// ============================================================================
// 1. STANDARD STREAMING (Flash v2.5 default) — the live, latency-sensitive path
// ============================================================================

export interface StreamConnection {
  ws: WebSocket;
  close(): void;
}

export function openStreamingConnection(voiceId: string): Promise<StreamConnection> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Promise.reject(new Error("ELEVENLABS_API_KEY not set"));
  const model = process.env.ELEVENLABS_DYNAMIC_TTS_MODEL ?? "eleven_flash_v2_5";
  const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}&output_format=pcm_24000`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on("upgrade", (res: any) => { res.socket?.setNoDelay?.(true); });

    let keepalive: NodeJS.Timeout | null = null;
    ws.on("open", () => {
      ws.send(JSON.stringify({
        text: " ",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: false },
        generation_config: { chunk_length_schedule: [50, 90, 120, 150] }, // smaller first chunk than the 120-default = faster first audio for short examiner utterances
        xi_api_key: key,
      }));
      keepalive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ text: " " }));
      }, KEEPALIVE_INTERVAL_MS);
      resolve({
        ws,
        close() {
          if (keepalive) clearInterval(keepalive);
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ text: "" }));
          ws.close();
        },
      });
    });
    ws.on("error", (err) => { if (keepalive) clearInterval(keepalive); reject(err); });
  });
}

export interface StreamingSynthesisCallbacks {
  onFirstAudio?: (atMs: number) => void;
  onAudioChunk?: (pcm16Base64: string) => void;
  onDone?: (atMs: number) => void;
  onVoiceError?: (message: string) => void;
}

export interface StreamingSynthesisHandle {
  appendText(text: string, isFinal: boolean): void;
  cancel(): void;
  done: Promise<void>;
}

export function startStreamingSynthesis(conn: StreamConnection, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  let gotFirstAudio = false;
  let resolveDone: () => void;
  let rejectDone: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => { resolveDone = res; rejectDone = rej; });

  const onMessage = (raw: WebSocket.RawData) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.audio) {
      if (!gotFirstAudio) { gotFirstAudio = true; callbacks.onFirstAudio?.(Date.now()); }
      callbacks.onAudioChunk?.(msg.audio);
    }
    if (msg.error || msg.message) {
      const text = String(msg.message ?? msg.error);
      callbacks.onVoiceError?.(text);
      rejectDone(new Error(text));
      conn.ws.off("message", onMessage);
      return;
    }
    if (msg.isFinal || msg.is_final) {
      callbacks.onDone?.(Date.now());
      resolveDone();
      conn.ws.off("message", onMessage);
    }
  };
  conn.ws.on("message", onMessage);

  return {
    appendText(text: string, isFinal: boolean) {
      if (conn.ws.readyState !== WebSocket.OPEN) return;
      conn.ws.send(JSON.stringify({ text: text + (isFinal ? "" : " ") }));
      if (isFinal) conn.ws.send(JSON.stringify({ text: "" }));
    },
    cancel() {
      // No documented per-turn cancel frame on this endpoint either — same
      // reasoning as the dialogue client below: flush/end-of-stream is the
      // safe stop signal, actual audio playback interruption is the
      // caller's responsibility (already handled in muendlichVoiceSession.ts).
      if (conn.ws.readyState === WebSocket.OPEN) conn.ws.send(JSON.stringify({ text: "" }));
      conn.ws.off("message", onMessage);
      resolveDone();
    },
    done,
  };
}

// ============================================================================
// 2. TEXT-TO-DIALOGUE (v3) — kept as an explicit, swappable alternative
// ============================================================================

export interface DialogueConnection {
  ws: WebSocket;
  voiceId: string;
  close(): void;
}

export function openDialogueConnection(voiceId: string): Promise<DialogueConnection> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Promise.reject(new Error("ELEVENLABS_API_KEY not set"));
  const model = process.env.ELEVENLABS_DIALOGUE_MODEL ?? "eleven_v3";
  const url = `wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=${model}&output_format=pcm_24000`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on("upgrade", (res: any) => { res.socket?.setNoDelay?.(true); });

    let keepalive: NodeJS.Timeout | null = null;
    ws.on("open", () => {
      ws.send(JSON.stringify({ voices: [voiceId], xi_api_key: key }));
      keepalive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ keep_alive: true }));
      }, KEEPALIVE_INTERVAL_MS);
      resolve({
        ws, voiceId,
        close() {
          if (keepalive) clearInterval(keepalive);
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ close_socket: true }));
          else ws.close();
        },
      });
    });
    ws.on("error", (err) => { if (keepalive) clearInterval(keepalive); reject(err); });
  });
}

export function startDialogueSynthesis(conn: DialogueConnection, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  let firstChunkSent = true;
  let gotFirstAudio = false;
  let resolveDone: () => void;
  let rejectDone: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => { resolveDone = res; rejectDone = rej; });

  const onMessage = (raw: WebSocket.RawData) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.audio) {
      if (!gotFirstAudio) { gotFirstAudio = true; callbacks.onFirstAudio?.(Date.now()); }
      callbacks.onAudioChunk?.(msg.audio);
    }
    if (msg.error || msg.message) {
      const text = String(msg.message ?? msg.error);
      callbacks.onVoiceError?.(text);
      rejectDone(new Error(text));
      conn.ws.off("message", onMessage);
      return;
    }
    if (msg.is_final) {
      callbacks.onDone?.(Date.now());
      resolveDone();
      conn.ws.off("message", onMessage);
    }
  };
  conn.ws.on("message", onMessage);

  return {
    appendText(text: string, isFinal: boolean) {
      if (conn.ws.readyState !== WebSocket.OPEN) return;
      conn.ws.send(JSON.stringify({ inputs: [{ text, voice_id: conn.voiceId, new_turn: firstChunkSent }] }));
      firstChunkSent = false;
      if (isFinal) conn.ws.send(JSON.stringify({ flush: true }));
    },
    cancel() {
      if (conn.ws.readyState === WebSocket.OPEN) conn.ws.send(JSON.stringify({ flush: true }));
      conn.ws.off("message", onMessage);
      resolveDone();
    },
    done,
  };
}

// ============================================================================
// 3. ONE-SHOT (non-streaming REST) — for pre-generating the phrase library
// ============================================================================

/** Plain POST /v1/text-to-speech/{voice_id} — no streaming, one request per
 * phrase, run OFFLINE by phraseLibrary/generateLibrary.ts, never during a
 * live exam. Works with any model; the library generator uses v3 by
 * default since neither latency nor request volume matter here — each
 * phrase is generated once and reused forever after. */
export async function synthesizeOnce(voiceId: string, text: string, model = "eleven_v3", outputFormat = "mp3_44100_128"): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY not set");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.55, similarity_boost: 0.8 } }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs synthesizeOnce ${res.status}: ${body.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
