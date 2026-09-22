import { useCallback, useEffect, useRef, useState } from "react";
import { describeMicError } from "./micError";

/**
 * useVoiceTutorAudio — forked from useRelayAudio.ts for the 1:1 AI Voice
 * Tutor (free-conversation speaking practice), which talks to the relay's
 * separate `/tutor/:scenarioId` path instead of the 2-candidate exam's
 * `/room/:roomId`. All mic-capture/PCM16-resample/gapless-playback logic
 * below is unchanged from the original — that part is genuinely generic
 * audio I/O with no room/participant coupling. What's different:
 *   - WS URL targets `/tutor/${scenarioId}` instead of `/room/${roomId}`.
 *   - TranscriptLine.speaker is "tutor"|"student" instead of "examiner"|"A"|"B".
 *   - No stage/intermission/repeat concepts (a free-flowing 1:1 chat has
 *     none of the exam's Teil structure) — dropped entirely rather than
 *     carried over as always-null fields.
 *   - No setMySlot/ducking-by-partner heuristic (there is no "partner" in a
 *     1:1 session) — the AI-speaking ducking (attenuate mic while the tutor
 *     is talking) is kept, since that's a real, still-relevant echo guard.
 *   - New `secondsRemaining` field, populated from the relay's `cap_status`
 *     message (the exam has no equivalent — it hard-stops silently instead;
 *     for money-metered practice time a visible, server-authoritative
 *     countdown is better UX, see server.ts's protocol doc-comment).
 */

export interface TutorTranscriptLine {
  speaker: "tutor" | "student";
  text: string;
  at: number;
}

export type TutorTerminatedReason = "daily_cap_exceeded" | "budget_exceeded" | "ai_error" | "idle_timeout" | string;

export interface VoiceTutorAudioState {
  connected: boolean;
  ready: boolean;
  sessionId: string | null;
  secondsRemaining: number | null;
  micLevel: number;
  aiSpeaking: boolean;
  aiThinking: boolean;
  lastNudgeAt: number | null;
  latencyMs: number | null;
  transcript: TutorTranscriptLine[];
  terminated: TutorTerminatedReason | null;
  error: string | null;
}

const CAPTURE_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;
const PING_INTERVAL_MS = 5000;
const THINKING_TIMEOUT_MS = 2000;
const MIC_ACTIVITY_RMS = 0.02;
const DUCK_WHILE_AI_SPEAKING = 0.4;

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

const initialState: VoiceTutorAudioState = {
  connected: false, ready: false, sessionId: null, secondsRemaining: null,
  micLevel: 0, aiSpeaking: false, aiThinking: false, lastNudgeAt: null,
  latencyMs: null, transcript: [], terminated: null, error: null,
};

export function useVoiceTutorAudio(relayUrl: string | null, scenarioId: string | null, accessToken: string | null) {
  const [state, setState] = useState<VoiceTutorAudioState>(initialState);
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
  const duckRef = useRef({ aiSpeaking: false });
  const micMutedRef = useRef(false);
  const [micMuted, setMicMutedState] = useState(false);

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

  const setMicMuted = useCallback((muted: boolean) => { micMutedRef.current = muted; setMicMutedState(muted); }, []);

  useEffect(() => {
    if (!relayUrl || !scenarioId || !accessToken) return;
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

        const ws = new WebSocket(`${relayUrl}/tutor/${scenarioId}?token=${encodeURIComponent(accessToken)}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setState((s) => ({ ...s, connected: true }));
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
          }, PING_INTERVAL_MS);
          ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
        };
        ws.onerror = () => setState((s) => ({ ...s, error: "Verbindung zum Sprachtrainer fehlgeschlagen." }));
        ws.onclose = () => setState((s) => ({ ...s, connected: false }));
        ws.onmessage = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.type === "ready") setState((s) => ({ ...s, ready: true, sessionId: msg.sessionId ?? null }));
          else if (msg.type === "pong") setState((s) => ({ ...s, latencyMs: Date.now() - msg.t }));
          else if (msg.type === "cap_status") setState((s) => ({ ...s, secondsRemaining: msg.secondsRemaining }));
          else if (msg.type === "nudge") setState((s) => ({ ...s, lastNudgeAt: Date.now() }));
          else if (msg.type === "transcript") {
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
          } else if (msg.type === "terminated") setState((s) => ({ ...s, terminated: msg.reason }));
        };

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

          if (rms > MIC_ACTIVITY_RMS) {
            if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; }
            setState((s) => (s.aiThinking ? { ...s, aiThinking: false } : s));
          } else if (!duckRef.current.aiSpeaking && !thinkingTimeoutRef.current) {
            thinkingTimeoutRef.current = setTimeout(() => {
              thinkingTimeoutRef.current = null;
              setState((s) => ({ ...s, aiThinking: true }));
            }, THINKING_TIMEOUT_MS);
          }

          if (ws.readyState !== WebSocket.OPEN || micMutedRef.current) return;

          // Same echo-guard as the exam: attenuate outgoing mic samples while
          // the tutor's own audio is actually playing. No partner-turn
          // ducking here — there is no partner in a 1:1 session.
          let gain = 1;
          if (duckRef.current.aiSpeaking) gain *= DUCK_WHILE_AI_SPEAKING;

          const resampled = resample(input, audioCtx.sampleRate, CAPTURE_SAMPLE_RATE);
          if (gain < 1) for (let i = 0; i < resampled.length; i++) resampled[i] *= gain;
          const pcm = floatTo16BitPCM(resampled);
          ws.send(JSON.stringify({ type: "audio", data: arrayBufferToBase64(pcm) }));
        };
        source.connect(processor);
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(audioCtx.destination);
      } catch (e: any) {
        if (!cancelled) setState((s) => ({ ...s, error: describeMicError(e) }));
      }
    })();

    return () => {
      cancelled = true;
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
      if (aiSpeakingTimeoutRef.current) clearTimeout(aiSpeakingTimeoutRef.current);
      stop();
    };
  }, [relayUrl, scenarioId, accessToken, stop, reconnectNonce]);

  return { ...state, reconnect, micMuted, setMicMuted };
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
