import { useCallback, useEffect, useRef, useState } from "react";
import { describeMicError } from "./micError";

/**
 * useVoiceTutorAudio — forked from useRelayAudio.ts for the AI Voice
 * Tutor's Teil 1 -> Teil 2 -> Teil 3 flow (structured examiner practice,
 * then partner-persona planning), which talks to the relay's separate
 * `/tutor/:sessionId` path instead of the 2-candidate exam's
 * `/room/:roomId`. All mic-capture/PCM16-resample/gapless-playback logic
 * below is unchanged from the original — that part is genuinely generic
 * audio I/O with no room/participant coupling. What's different:
 *   - WS URL targets `/tutor/${sessionId}` (a real voice_tutor_sessions row
 *     the CALLER already created, topics locked in) instead of `/room/${roomId}`.
 *   - TranscriptLine.speaker is "examiner"|"partner"|"student" — the SAME
 *     AI voice/session switches from "examiner" to "partner" once Teil 3
 *     starts (see tutorVoiceSession.ts's activeVoiceId()/speakingIsPartner).
 *   - `currentStage` (1|2|3) from the relay's `stage` message, mirroring the
 *     exam's own stage concept — but no intermission/repeat concepts (each
 *     Teil handoff here is a scripted transition line, not a timed breather
 *     the client needs to display).
 *   - No setMySlot/ducking-by-partner heuristic — the AI-speaking ducking
 *     (attenuate mic while the AI is talking, examiner or partner) is kept,
 *     since that's a real, still-relevant echo guard.
 *   - `secondsRemaining` from the relay's `cap_status` message (the exam has
 *     no equivalent — it hard-stops silently instead; for money-metered
 *     practice time a visible, server-authoritative countdown is better UX).
 *   - A dropped connection does NOT end the exam (2026-10-13, after a student lost hers to "connection dropped"): the relay freezes the session for
 *     two minutes, this hook reconnects to the SAME /tutor/:sessionId with a fresh token (backoff, instantly on "back online" / "tab visible again") while the
 *     microphone keeps running, and the relay resumes where it was and replays the tutor's speech that was missed. `reconnecting` drives the banner. Leaving
 *     on purpose (stop()) first sends {type:"end"} — a bare socket close is treated as a drop.
 *   - `teil1Complete`/`teil2Complete` (informational — the session continues
 *     straight into the next Teil) and `sessionComplete` (the real
 *     end-of-session signal, once Teil 3 finishes) are separate flags — do
 *     not treat the former as an ending.
 */

export interface TutorTranscriptLine {
  speaker: "examiner" | "partner" | "student";
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
  /** Which Teil the relay is currently driving — starts at 1, advances on
   * the server's own "stage" messages. */
  currentStage: 1 | 2 | 3;
  /** Informational only — Teil 1 finished but the session keeps running
   * straight into Teil 2 (see server.ts's tutorTickTeil1 handoff). Not an
   * end-of-session signal; see sessionComplete for that. */
  teil1Complete: boolean;
  /** Informational only — Teil 2 finished but the session keeps running
   * straight into Teil 3, where the AI switches to the "partner" persona
   * (see server.ts's tutorTickTeil2/startTutorTeil3). */
  teil2Complete: boolean;
  /** The whole session ended normally (Teil 3 finished) — a clean
   * completion, not an error/terminated case. */
  sessionComplete: boolean;
  terminated: TutorTerminatedReason | null;
  error: string | null;
  /** The connection to the relay broke and the hook is trying to get back into the same session (the exam is frozen on the server meanwhile). */
  reconnecting: boolean;
}

const CAPTURE_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;
const PING_INTERVAL_MS = 5000;
const THINKING_TIMEOUT_MS = 2000;
const MIC_ACTIVITY_RMS = 0.02;
const DUCK_WHILE_AI_SPEAKING = 0.4;
// The relay keeps a dropped session for 120 s (server.ts TUTOR_RESUME_GRACE_MS); give up a little before that — after it the session is gone for good.
const RECONNECT_GIVE_UP_MS = 110_000;
const RECONNECT_DELAYS_MS = [400, 1000, 2000, 3000];
// An open-looking socket that has delivered nothing (not even the relay's answer to our 5 s ping) for this long is dead (Wi-Fi gone, half-open TCP): start a new connection instead of waiting for the browser to notice.
const DEAD_AFTER_MS = 12_000;
// Relay close codes after which reconnecting cannot work, mapped to what the student is told (see TERMINATED_MESSAGE in the session route).
const FATAL_CLOSE_CODES: Record<number, string> = {
  4003: "session_unavailable", 4004: "session_unavailable", 4006: "session_unavailable", 4007: "session_unavailable",
  4010: "opened_elsewhere", 4005: "session_ended", 4009: "daily_cap_exceeded", 4011: "insufficient_minutes", 4013: "service_unavailable", 4014: "session_lost", 4015: "too_many_reconnects",
};

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
  latencyMs: null, transcript: [], currentStage: 1, teil1Complete: false, teil2Complete: false, sessionComplete: false,
  terminated: null, error: null, reconnecting: false,
};

export function useVoiceTutorAudio(relayUrl: string | null, sessionId: string | null, accessToken: string | null, getFreshToken?: () => Promise<string | null>) {
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
  // Reconnect bookkeeping: `intentionalCloseRef` = WE are shutting down (stop()), so a closing socket is not a drop; `finishedRef` = the session is over (terminated / complete).
  const intentionalCloseRef = useRef(false);
  const finishedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeListenersRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    // Tell the relay this is on purpose (a bare close is treated as a dropped connection and keeps the session frozen for two minutes).
    const ws = wsRef.current;
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) { try { ws.send(JSON.stringify({ type: "end" })); } catch { /* closing anyway */ } ws.close(); }
      else if (ws.readyState === WebSocket.CONNECTING) { ws.onopen = () => { try { ws.send(JSON.stringify({ type: "end" })); } catch { /* closing anyway */ } ws.close(); }; }
    }
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
    if (!relayUrl || !sessionId || !accessToken) return;
    let cancelled = false;
    intentionalCloseRef.current = false;
    finishedRef.current = false;
    const initialToken: string = accessToken;
    let lostAt = 0, attempt = 0, everConnected = false, lastInboundAt = Date.now();

    const markFinished = (reason: string | null) => { finishedRef.current = true; if (reason) setState((s) => ({ ...s, terminated: reason, reconnecting: false })); };

    // One WebSocket to the relay. Called for the first connection and again, with a fresh token, after every drop; the microphone/AudioContext below live across all of them.
    const connect = async (audioCtx: AudioContext) => {
      if (cancelled || intentionalCloseRef.current || finishedRef.current) return;
      let token: string = initialToken;
      if (lostAt > 0 && getFreshToken) { try { token = (await getFreshToken()) ?? initialToken; } catch { /* keep the old token */ } }
      if (cancelled || intentionalCloseRef.current || finishedRef.current) return;
      const ws = new WebSocket(`${relayUrl}/tutor/${sessionId}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      lastInboundAt = Date.now();

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        everConnected = true;
        setState((s) => ({ ...s, connected: true, error: null }));
        ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
      };
      ws.onerror = () => { if (wsRef.current === ws && lostAt === 0) setState((s) => ({ ...s, error: "Verbindung zum Sprachtrainer fehlgeschlagen." })); };
      ws.onclose = (ev) => {
        if (wsRef.current !== ws) return; // an older socket closing after it was replaced
        setState((s) => ({ ...s, connected: false }));
        if (cancelled || intentionalCloseRef.current || finishedRef.current) return;
        const fatal = FATAL_CLOSE_CODES[ev.code];
        if (fatal) { markFinished(fatal); return; }
        // Anything else is a dropped connection: keep the microphone, reconnect to the same session.
        if (lostAt === 0) { lostAt = Date.now(); attempt = 0; }
        scheduleReconnect(audioCtx, attempt === 0 ? 0 : undefined); // the first retry is immediate, the next ones back off (RECONNECT_DELAYS_MS)
      };
      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return;
        lastInboundAt = Date.now();
        const msg = JSON.parse(ev.data);
        if (msg.type === "ready") {
          lostAt = 0; attempt = 0;
          setState((s) => ({ ...s, ready: true, sessionId: msg.sessionId ?? null, reconnecting: false, error: null }));
          if (msg.resumed) nextPlayTimeRef.current = audioCtx.currentTime;
        }
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
        } else if (msg.type === "teil1_complete") setState((s) => ({ ...s, teil1Complete: true }));
        else if (msg.type === "teil2_complete") setState((s) => ({ ...s, teil2Complete: true }));
        else if (msg.type === "stage") setState((s) => ({ ...s, currentStage: msg.stage }));
        else if (msg.type === "session_complete") { finishedRef.current = true; setState((s) => ({ ...s, sessionComplete: true })); }
        else if (msg.type === "terminated") markFinished(msg.reason);
      };
    };

    const scheduleReconnect = (audioCtx: AudioContext, delayOverride?: number) => {
      if (cancelled || intentionalCloseRef.current || finishedRef.current) return;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      // a connection that never opened at all (relay down / blocked) fails fast; one that was inside a live session gets the relay's whole reconnect window
      if (Date.now() - lostAt > (everConnected ? RECONNECT_GIVE_UP_MS : 15_000)) { markFinished("connection_lost"); return; }
      setState((s) => ({ ...s, reconnecting: true }));
      const delay = delayOverride ?? RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      attempt++;
      reconnectTimerRef.current = setTimeout(async () => {
        reconnectTimerRef.current = null;
        await connect(audioCtx);
        // A connect that never opens (network still down) fires onclose too, which schedules the next attempt; a socket stuck in CONNECTING is cut after 8 s.
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.CONNECTING) setTimeout(() => { if (wsRef.current === ws && ws.readyState === WebSocket.CONNECTING) ws.close(); }, 8000);
      }, delay);
    };

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

        await connect(audioCtx);
        pingIntervalRef.current = setInterval(() => {
          const ws = wsRef.current;
          if (!ws || ws.readyState !== WebSocket.OPEN || finishedRef.current) return;
          if (Date.now() - lastInboundAt > DEAD_AFTER_MS) {
            if (lostAt === 0) { lostAt = Date.now(); attempt = 0; }
            wsRef.current = null; // from here the old socket's events are ignored
            try { ws.close(); } catch { /* already dead */ }
            setState((s) => ({ ...s, connected: false }));
            scheduleReconnect(audioCtx, 0);
            return;
          }
          ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
        }, PING_INTERVAL_MS);

        // Back online / tab visible again (phone unlocked, app switched back): the browser may have suspended the audio and killed the socket — retry at once instead of waiting for the backoff.
        const wake = () => {
          if (cancelled || intentionalCloseRef.current || finishedRef.current) return;
          if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
          const ws = wsRef.current;
          if (lostAt > 0 && (!ws || ws.readyState === WebSocket.CLOSED)) { attempt = 0; scheduleReconnect(audioCtx, 0); }
        };
        const onVisibility = () => { if (document.visibilityState === "visible") wake(); };
        window.addEventListener("online", wake);
        document.addEventListener("visibilitychange", onVisibility);
        removeListenersRef.current = () => { window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", onVisibility); };

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

          const ws = wsRef.current; // the CURRENT socket — it is replaced after a reconnect
          if (!ws || ws.readyState !== WebSocket.OPEN || micMutedRef.current) return;

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
      removeListenersRef.current?.(); removeListenersRef.current = null;
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
      if (aiSpeakingTimeoutRef.current) clearTimeout(aiSpeakingTimeoutRef.current);
      stop();
    };
  }, [relayUrl, sessionId, accessToken, stop, reconnectNonce]);

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
