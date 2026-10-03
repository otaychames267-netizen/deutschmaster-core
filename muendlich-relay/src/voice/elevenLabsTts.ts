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
 * before writing this, and extensively live-tested since (every real exam
 * this whole project has run uses #1). The library-voice-via-API account-
 * tier restriction that once blocked #3's offline generation script
 * (generateLibrary.ts) was unrelated to #1's own live streaming path — see
 * that script's header for its own resolution as of 2026-10-03.
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

// Real bug found via live testing (the AI Voice Tutor's Teil 1/2 flow, but
// this function is shared with the exam room too): this had NO timeout at
// all — if the WebSocket handshake ever stalls (neither "open" nor "error"
// fires — a real, observed network condition, not hypothetical), the
// returned Promise never settles, hanging whatever called it FOREVER with
// zero error output anywhere in the pipeline. That silent hang was
// indistinguishable from "nothing went wrong" until traced live: the only
// visible symptom was the caller's own much-later, generic idle-timeout.
// Exposure to this went up specifically because of today's per-utterance
// connection redesign (see muendlichVoiceSession.ts's header) — many short
// connection attempts per exam/session instead of one long-lived one means
// many more chances for a single handshake to stall. A ~8s timeout is well
// under any caller's own answer/response windows, so a real stall now fails
// fast and visibly instead of silently eating an entire turn.
const CONNECT_TIMEOUT_MS = 8_000;

export function openStreamingConnection(voiceId: string): Promise<StreamConnection> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Promise.reject(new Error("ELEVENLABS_API_KEY not set"));
  const model = process.env.ELEVENLABS_DYNAMIC_TTS_MODEL ?? "eleven_flash_v2_5";
  const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}&output_format=pcm_24000`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on("upgrade", (res: any) => { res.socket?.setNoDelay?.(true); });

    let keepalive: NodeJS.Timeout | null = null;
    let settled = false;
    const connectTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws.terminate(); } catch {}
      reject(new Error(`ElevenLabs streaming connection handshake timed out after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    ws.on("open", () => {
      if (settled) return; // timeout already fired and terminated the socket — don't resolve a connection the caller already gave up on
      settled = true;
      clearTimeout(connectTimer);
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
    ws.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      if (keepalive) clearInterval(keepalive);
      reject(err);
    });
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

// Real bug found via live testing (the AI Voice Tutor's Teil 2->3 handoff):
// once the CONNECTION is open, `done` had NO timeout of its own — if
// ElevenLabs ever goes silent mid-stream (no further "audio" chunk, no
// "isFinal") after we've sent it text, the promise never settles. Every
// caller of a scripted transition (e.g. server.ts's startTutorTeil2/
// startTutorTeil3) awaits this promise before advancing its own state
// machine, so a single stalled utterance silently froze the ENTIRE session
// forever — no error, no timeout, nothing — exactly the same class of bug
// CONNECT_TIMEOUT_MS above fixed for the handshake phase, just one step
// later in the same call. Armed only once we've actually sent ElevenLabs
// something (on the first appendText call and refreshed on every one after,
// and refreshed again on every inbound message) so a slow-to-generate reply
// upstream (e.g. Claude still thinking, before any appendText call) can
// never trip it — only real silence from ElevenLabs AFTER we've given it
// text does.
const SYNTHESIS_IDLE_TIMEOUT_MS = 15_000;

export function startStreamingSynthesis(conn: StreamConnection, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  let gotFirstAudio = false;
  let settled = false;
  let idleTimer: NodeJS.Timeout | null = null;
  let resolveDone: () => void;
  let rejectDone: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => { resolveDone = res; rejectDone = rej; });

  function armIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      conn.ws.off("message", onMessage);
      rejectDone(new Error(`ElevenLabs streaming synthesis stalled — no response ${SYNTHESIS_IDLE_TIMEOUT_MS}ms after sending text`));
    }, SYNTHESIS_IDLE_TIMEOUT_MS);
  }
  function clearIdleTimer() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  }

  const onMessage = (raw: WebSocket.RawData) => {
    if (settled) return;
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    armIdleTimer(); // any server activity resets the stall clock
    if (msg.audio) {
      if (!gotFirstAudio) { gotFirstAudio = true; callbacks.onFirstAudio?.(Date.now()); }
      callbacks.onAudioChunk?.(msg.audio);
    }
    if (msg.error || msg.message) {
      const text = String(msg.message ?? msg.error);
      settled = true;
      clearIdleTimer();
      callbacks.onVoiceError?.(text);
      rejectDone(new Error(text));
      conn.ws.off("message", onMessage);
      return;
    }
    if (msg.isFinal || msg.is_final) {
      settled = true;
      clearIdleTimer();
      callbacks.onDone?.(Date.now());
      resolveDone();
      conn.ws.off("message", onMessage);
    }
  };
  conn.ws.on("message", onMessage);

  return {
    appendText(text: string, isFinal: boolean) {
      if (conn.ws.readyState !== WebSocket.OPEN) return;
      armIdleTimer(); // we just sent ElevenLabs something to synthesize — arm/refresh the stall clock waiting for its response
      conn.ws.send(JSON.stringify({ text: text + (isFinal ? "" : " ") }));
      if (isFinal) conn.ws.send(JSON.stringify({ text: "" }));
    },
    cancel() {
      // No documented per-turn cancel frame on this endpoint either — same
      // reasoning as the dialogue client below: flush/end-of-stream is the
      // safe stop signal, actual audio playback interruption is the
      // caller's responsibility (already handled in muendlichVoiceSession.ts).
      if (settled) return;
      settled = true;
      clearIdleTimer();
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

// Same stalled-synthesis guard as startStreamingSynthesis above, and for the
// identical reason — see that function's comment.
export function startDialogueSynthesis(conn: DialogueConnection, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  let firstChunkSent = true;
  let gotFirstAudio = false;
  let settled = false;
  let idleTimer: NodeJS.Timeout | null = null;
  let resolveDone: () => void;
  let rejectDone: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => { resolveDone = res; rejectDone = rej; });

  function armIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      conn.ws.off("message", onMessage);
      rejectDone(new Error(`ElevenLabs dialogue synthesis stalled — no response ${SYNTHESIS_IDLE_TIMEOUT_MS}ms after sending text`));
    }, SYNTHESIS_IDLE_TIMEOUT_MS);
  }
  function clearIdleTimer() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  }

  const onMessage = (raw: WebSocket.RawData) => {
    if (settled) return;
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    armIdleTimer();
    if (msg.audio) {
      if (!gotFirstAudio) { gotFirstAudio = true; callbacks.onFirstAudio?.(Date.now()); }
      callbacks.onAudioChunk?.(msg.audio);
    }
    if (msg.error || msg.message) {
      const text = String(msg.message ?? msg.error);
      settled = true;
      clearIdleTimer();
      callbacks.onVoiceError?.(text);
      rejectDone(new Error(text));
      conn.ws.off("message", onMessage);
      return;
    }
    if (msg.is_final) {
      settled = true;
      clearIdleTimer();
      callbacks.onDone?.(Date.now());
      resolveDone();
      conn.ws.off("message", onMessage);
    }
  };
  conn.ws.on("message", onMessage);

  return {
    appendText(text: string, isFinal: boolean) {
      if (conn.ws.readyState !== WebSocket.OPEN) return;
      armIdleTimer();
      conn.ws.send(JSON.stringify({ inputs: [{ text, voice_id: conn.voiceId, new_turn: firstChunkSent }] }));
      firstChunkSent = false;
      if (isFinal) conn.ws.send(JSON.stringify({ flush: true }));
    },
    cancel() {
      if (settled) return;
      settled = true;
      clearIdleTimer();
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
