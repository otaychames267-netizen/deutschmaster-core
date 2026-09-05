/**
 * Picks the live-exam voice backend at startup based on
 * MUENDLICH_VOICE_BACKEND ("gemini" default, or "elevenlabs") and exposes
 * ONE unified interface so server.ts's call sites don't need to know or
 * care which backend is actually running underneath. This is the whole
 * point of the env-gated switch: flipping the backend back to "gemini" for
 * an instant rollback needs zero code changes, just a redeploy with a
 * different env value.
 *
 * The two backends' native shapes differ (Gemini Live exposes a raw
 * `session.sendClientContent`; the new backend exposes `sendSystemMessage`/
 * `setStage`/per-slot `sendAudioChunk`) — this file is the thin adapter
 * that normalizes both to the same shape, not a reimplementation of either.
 */
import { openMuendlichLiveSession, type RoomContext as GeminiRoomContext } from "./geminiLive.js";
import { openMuendlichVoiceSession, type RoomContext as ElevenLabsRoomContext } from "./voice/muendlichVoiceSession.js";
import type { ExamUsage } from "./voice/costAccounting.js";
import type { FixedPhraseCategory } from "./voice/phraseLibrary/phraseTypes.js";
import { getFixedPool } from "./voice/phraseLibrary/fixedPhrases.js";
import { getTeil1QuestionPool } from "./voice/phraseLibrary/teil1Questions.js";

export interface VoiceBackendSession {
  sendAudioChunk(slot: "A" | "B", base64: string): void;
  sendSystemMessage(text: string): void;
  /** On the ElevenLabs backend: plays pre-generated audio (zero TTS cost)
   * with a dynamic-TTS fallback. On the Gemini backend, which has no
   * concept of a pre-generated library, this just speaks the same
   * hand-written text through Gemini's own voice, same as sendSystemMessage
   * — a real utterance either way, never a silent no-op. */
  playLibraryPhrase(category: FixedPhraseCategory): Promise<void>;
  /** Teil 1's opening move: examiner asks ONE pre-generated question for the
   * candidate's topic (see voice/phraseLibrary/teil1Questions.ts), then the
   * candidate does almost all of the talking. Same real-utterance-either-way
   * guarantee as playLibraryPhrase — Gemini has no pre-generated audio, so
   * it gets the same question TEXT via a "say exactly this" instruction. */
  playTeil1Question(topic: string): Promise<void>;
  /** On the ElevenLabs backend: skips Claude, speaks the exact given text
   * directly via TTS. On the Gemini backend there's no separate "skip the
   * brain" path (Gemini Live's reasoning and voice are the same call), so
   * this instructs it to say the text exactly, same as before this feature
   * existed. */
  speakScriptedText(text: string): Promise<void>;
  /** Real ElevenLabs voice ID on that backend; a stable placeholder on
   * Gemini (which has no per-exam voice pool of its own) — used only to
   * pick a style-consistent scripted-phrase variant, see
   * examinerPhrases.ts. */
  getVoiceId(): string;
  /** No-op on the Gemini backend — it has no concept of "current stage"
   * affecting its own behavior; only the ElevenLabs backend's organic-
   * trigger gating needs this. */
  setStage(stage: 1 | 2 | 3): void;
  /** Real {0,0} on the Gemini backend — it doesn't call ElevenLabs at all,
   * so there's nothing to meter. server.ts's credit-cap enforcement is
   * itself gated on activeVoiceBackend()==="elevenlabs" (see server.ts),
   * so this zero value is never actually consulted for the Gemini path,
   * but the interface stays honest either way rather than returning
   * something misleading. */
  getUsage(): ExamUsage;
  close(): void;
}

export interface VoiceBackendCallbacks {
  onOpen?: () => void;
  onAudioChunk?: (base64: string) => void;
  onOutputTranscript?: (text: string) => void;
  onInputTranscript?: (text: string, slot: "A" | "B") => void;
  onError?: (message: string) => void;
  onClose?: (reason: string) => void;
}

export type RoomContext = GeminiRoomContext & ElevenLabsRoomContext;

export function activeVoiceBackend(): "gemini" | "elevenlabs" {
  return process.env.MUENDLICH_VOICE_BACKEND === "elevenlabs" ? "elevenlabs" : "gemini";
}

export async function openVoiceBackend(ctx: RoomContext, examSessionId: string, callbacks: VoiceBackendCallbacks): Promise<VoiceBackendSession> {
  if (activeVoiceBackend() === "elevenlabs") {
    const session = await openMuendlichVoiceSession(ctx, examSessionId, callbacks);
    return session; // already matches VoiceBackendSession exactly — no adapting needed
  }

  // lastSenderSlot mirrors exactly what server.ts's own onInputTranscript
  // handler used to compute inline before this file existed — Gemini Live
  // merges both candidates into one input stream, so there's no real
  // per-slot signal to give it; this preserves that same known
  // simplification (documented in server.ts's header) rather than
  // pretending it's more accurate than it is.
  let lastSenderSlot: "A" | "B" = "A";
  const gemini = await openMuendlichLiveSession(ctx, {
    onOpen: callbacks.onOpen,
    onAudioChunk: callbacks.onAudioChunk,
    onOutputTranscript: callbacks.onOutputTranscript,
    onInputTranscript: (text) => callbacks.onInputTranscript?.(text, lastSenderSlot),
    onError: callbacks.onError,
    onClose: callbacks.onClose,
  });

  return {
    sendAudioChunk(slot, base64) {
      lastSenderSlot = slot;
      gemini.sendAudioChunk(base64);
    },
    sendSystemMessage(text) {
      gemini.session.sendClientContent({ turns: `[SYSTEM] ${text}`, turnComplete: true });
    },
    async playLibraryPhrase(category) {
      // Gemini Live has no pre-generated-audio concept — its reasoning and
      // voice are one inseparable call, so the only way to get an exact
      // sentence out of it is the same "say exactly this" instruction
      // speakScriptedText uses below. Still a real spoken utterance, not a
      // silent no-op.
      const pool = getFixedPool(category);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      gemini.session.sendClientContent({
        turns: `[SYSTEM] Sagen Sie GENAU diesen Satz (nicht umformulieren, nichts hinzufügen): "${chosen.text}"`,
        turnComplete: true,
      });
    },
    async playTeil1Question(topic) {
      const pool = getTeil1QuestionPool(topic);
      if (pool.length === 0) return;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      gemini.session.sendClientContent({
        turns: `[SYSTEM] Sagen Sie GENAU diesen Satz (nicht umformulieren, nichts hinzufügen): "${chosen.text}"`,
        turnComplete: true,
      });
    },
    async speakScriptedText(text) {
      gemini.session.sendClientContent({
        turns: `[SYSTEM] Sagen Sie GENAU diesen Satz (nicht umformulieren, nichts hinzufügen): "${text}"`,
        turnComplete: true,
      });
    },
    getVoiceId() { return "gemini-default"; }, // no real per-exam voice pool on this backend — see interface doc comment
    setStage() {}, // no-op — see interface doc comment
    getUsage() { return { ttsCharacters: 0, sttMinutes: 0 }; }, // no-op — see interface doc comment
    close() { gemini.close(); },
  };
}
