import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useRelayAudio — captures the student's microphone, encodes to PCM16 16kHz,
 * streams it to the muendlich-relay over a plain WebSocket, and plays back
 * the AI examiner's PCM16 24kHz response via a gapless scheduled queue.
 *
 * Uses ScriptProcessorNode (deprecated but universally supported, single
 * self-contained file) rather than an AudioWorklet — simpler and more likely
 * to work correctly on the first real deployment than getting a worklet
 * module's public-asset path exactly right without being able to test actual
 * microphone/speaker behavior myself.
 *
 * Echo cancellation / noise suppression requested per spec — actual
 * effectiveness depends on the browser/OS honoring the constraint.
 */

export type Stage = 1 | 2 | 3;
export type TerminatedReason = "insufficient_minutes" | "window_expired" | "partner_disconnected" | "ai_error" | string;

export interface TranscriptLine {
  speaker: "examiner" | "A" | "B";
  text: string;
  at: number;
}

export interface RelayAudioState {
  connected: boolean;
  ready: boolean;
  stage: Stage | null;
  stageSeconds: number | null;
  stageStartedAt: number | null; // client Date.now() when the stage message arrived — used for a local countdown display
  intermission: { seconds: number; startedAt: number } | null;
  micLevel: number; // 0-1, for a waveform/level indicator
  aiSpeaking: boolean;
  aiThinking: boolean; // heuristic: local mic activity just stopped, AI hasn't started answering yet
  lastNudgeAt: number | null; // set whenever the AI's anti-silence takeover fires, for a toast
  repeatRemaining: number; // "Wie bitte?" uses left, starts at MAX_REPEAT_USES
  repeatDenied: number; // increments each time a denied repeat request comes back, for a toast trigger
  latencyMs: number | null;
  transcript: TranscriptLine[];
  finished: boolean;
  terminated: TerminatedReason | null;
  error: string | null;
}

const CAPTURE_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;
const MAX_REPEAT_USES = 2;
const PING_INTERVAL_MS = 5000;
const THINKING_TIMEOUT_MS = 2000; // how long after mic activity stops we consider the AI "thinking" until it starts speaking
const MIC_ACTIVITY_RMS = 0.02; // rough noise floor below which we don't count the mic as "active"
const DUCK_WHILE_AI_SPEAKING = 0.4; // hard signal — AI audio is actually playing out of the speakers right now
const DUCK_WHILE_PARTNER_TURN = 0.75; // soft heuristic — last transcript line was the other participant, recently

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToInt16Array(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

/** Naive linear-interpolation resample — good enough for mic capture at
 * typical hardware rates (44.1k/48k) down to 16k; not audiophile-grade, but
 * this is speech for a language exam, not music production. */
function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.round(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcPos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

const initialState: RelayAudioState = {
  connected: false, ready: false, stage: null, stageSeconds: null, stageStartedAt: null, intermission: null,
  micLevel: 0, aiSpeaking: false, aiThinking: false, lastNudgeAt: null, repeatRemaining: MAX_REPEAT_USES, repeatDenied: 0,
  latencyMs: null, transcript: [], finished: false, terminated: null, error: null,
};

export function useRelayAudio(relayUrl: string | null, roomId: string | null, accessToken: string | null) {
  const [state, setState] = useState<RelayAudioState>(initialState);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef(0);
  const aiSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirrors state.aiSpeaking / last transcript speaker+time inside the audio callback without
  // re-subscribing the ScriptProcessorNode on every state change (which would glitch capture).
  const duckRef = useRef({ aiSpeaking: false, lastSpeaker: null as "A" | "B" | null, lastSpeakerAt: 0, mySlot: null as "A" | "B" | null });

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    wsRef.current?.close();
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    processorRef.current = null; sourceRef.current = null; streamRef.current = null; audioCtxRef.current = null; wsRef.current = null;
  }, []);

  const reconnect = useCallback(() => {
    stop();
    setState(initialState);
    setReconnectNonce((n) => n + 1);
  }, [stop]);

  const sendRepeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "repeat" }));
  }, []);

  /** mySlot is used only for the ducking heuristic (to know which transcript speaker counts as "the partner"). */
  const setMySlot = useCallback((slot: "A" | "B" | null) => { duckRef.current.mySlot = slot; }, []);

  useEffect(() => {
    if (!relayUrl || !roomId || !accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        nextPlayTimeRef.current = audioCtx.currentTime;

        const ws = new WebSocket(`${relayUrl}/room/${roomId}?token=${encodeURIComponent(accessToken)}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setState((s) => ({ ...s, connected: true }));
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
          }, PING_INTERVAL_MS);
          ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
        };
        ws.onerror = () => setState((s) => ({ ...s, error: "Verbindung zum Prüfungsserver fehlgeschlagen." }));
        ws.onclose = () => setState((s) => ({ ...s, connected: false }));
        ws.onmessage = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.type === "ready") setState((s) => ({ ...s, ready: true }));
          else if (msg.type === "pong") setState((s) => ({ ...s, latencyMs: Date.now() - msg.t }));
          else if (msg.type === "stage") {
            setState((s) => ({ ...s, stage: msg.stage, stageSeconds: msg.seconds, stageStartedAt: Date.now(), intermission: null }));
          } else if (msg.type === "intermission") {
            setState((s) => ({ ...s, intermission: { seconds: msg.seconds, startedAt: Date.now() } }));
          } else if (msg.type === "nudge") {
            setState((s) => ({ ...s, lastNudgeAt: Date.now() }));
          } else if (msg.type === "repeat_ack") {
            setState((s) => ({ ...s, repeatRemaining: msg.remaining }));
          } else if (msg.type === "repeat_denied") {
            setState((s) => ({ ...s, repeatDenied: s.repeatDenied + 1 }));
          } else if (msg.type === "transcript") {
            if (msg.speaker === "A" || msg.speaker === "B") { duckRef.current.lastSpeaker = msg.speaker; duckRef.current.lastSpeakerAt = Date.now(); }
            setState((s) => ({ ...s, transcript: [...s.transcript, { speaker: msg.speaker, text: msg.text, at: Date.now() }] }));
          } else if (msg.type === "audio") {
            playChunk(audioCtx, base64ToInt16Array(msg.data), nextPlayTimeRef);
            duckRef.current.aiSpeaking = true;
            if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; }
            setState((s) => ({ ...s, aiSpeaking: true, aiThinking: false }));
            if (aiSpeakingTimeoutRef.current) clearTimeout(aiSpeakingTimeoutRef.current);
            aiSpeakingTimeoutRef.current = setTimeout(() => {
              duckRef.current.aiSpeaking = false;
              setState((s) => ({ ...s, aiSpeaking: false }));
            }, 600);
          } else if (msg.type === "finished") setState((s) => ({ ...s, finished: true }));
          else if (msg.type === "terminated") setState((s) => ({ ...s, terminated: msg.reason }));
        };

        // Capture: downsample to 16kHz PCM16, send as base64 JSON frames.
        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);

          let sum = 0;
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
          const rms = Math.sqrt(sum / input.length);
          setState((s) => ({ ...s, micLevel: Math.min(1, rms * 6) }));

          // "Thinking" heuristic: local mic activity just stopped and the AI
          // hasn't started answering yet (no distinct signal for this from
          // the Gemini Live SDK — onAudioChunk firing is the only "AI is
          // producing a response" event we get, so this is a best-effort UI
          // cue, not an authoritative state).
          if (rms > MIC_ACTIVITY_RMS) {
            if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; }
            setState((s) => (s.aiThinking ? { ...s, aiThinking: false } : s));
          } else if (!duckRef.current.aiSpeaking && !thinkingTimeoutRef.current) {
            thinkingTimeoutRef.current = setTimeout(() => {
              thinkingTimeoutRef.current = null;
              setState((s) => ({ ...s, aiThinking: true }));
            }, THINKING_TIMEOUT_MS);
          }

          if (ws.readyState !== WebSocket.OPEN) return;

          // Client-side audio ducking: attenuate outgoing mic samples while the
          // AI's audio is actually playing (hard signal, reduces the chance
          // the AI's own voice/echo gets sent back into the session) and more
          // softly while the partner appears to be mid-turn (best-effort
          // heuristic from the most recent transcript speaker — deliberately
          // mild so a real interruption still gets through; a wrong guess
          // here should never fully silence someone who's actually talking).
          let gain = 1;
          if (duckRef.current.aiSpeaking) gain *= DUCK_WHILE_AI_SPEAKING;
          const { lastSpeaker, lastSpeakerAt, mySlot } = duckRef.current;
          if (lastSpeaker && mySlot && lastSpeaker !== mySlot && Date.now() - lastSpeakerAt < 3000) gain *= DUCK_WHILE_PARTNER_TURN;

          const resampled = resample(input, audioCtx.sampleRate, CAPTURE_SAMPLE_RATE);
          if (gain < 1) for (let i = 0; i < resampled.length; i++) resampled[i] *= gain;
          const pcm = floatTo16BitPCM(resampled);
          ws.send(JSON.stringify({ type: "audio", data: arrayBufferToBase64(pcm) }));
        };
        source.connect(processor);
        // ScriptProcessorNode requires a destination connection to fire onaudioprocess
        // in most browsers, even though we don't want to hear our own raw mic audio.
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(audioCtx.destination);
      } catch (e: any) {
        if (!cancelled) setState((s) => ({ ...s, error: e?.message ?? "Mikrofonzugriff nicht möglich." }));
      }
    })();

    return () => {
      cancelled = true;
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
      if (aiSpeakingTimeoutRef.current) clearTimeout(aiSpeakingTimeoutRef.current);
      stop();
    };
  }, [relayUrl, roomId, accessToken, stop, reconnectNonce]);

  return { ...state, reconnect, sendRepeat, setMySlot };
}

function playChunk(audioCtx: AudioContext, pcm16: Int16Array, nextPlayTimeRef: { current: number }) {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);

  const buffer = audioCtx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
  buffer.copyToChannel(float32, 0);

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);

  const startAt = Math.max(nextPlayTimeRef.current, audioCtx.currentTime);
  src.start(startAt);
  nextPlayTimeRef.current = startAt + buffer.duration;
}
