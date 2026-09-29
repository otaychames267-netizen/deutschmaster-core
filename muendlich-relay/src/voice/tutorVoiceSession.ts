/**
 * openTutorVoiceSession() — the AI Voice Tutor's ElevenLabs+Claude session,
 * a sibling to muendlichVoiceSession.ts (the 2-candidate exam's own
 * ElevenLabs session) rather than a shared abstraction over it — same
 * reasoning as tutorBrain.ts vs examinerBrain.ts.
 *
 * Chosen over the tutor's original Gemini Live backend (tutorGeminiLive.ts)
 * because Gemini Live is the CURRENTLY BROKEN backend on this account
 * ("Internal error encountered", reproducible across models, an
 * account/quota-level issue outside this codebase's control — see
 * MUENDLICH_VOICE_BACKEND's own history), while ElevenLabs+Claude is the
 * proven, currently-working path (same one the exam room now runs on live).
 * tutorGeminiLive.ts is left in place, unused, as a documented fallback if
 * Gemini access is ever restored — not deleted.
 *
 * Per-utterance ElevenLabs connections from the start (not the old
 * session-wide shared-connection pattern muendlichVoiceSession.ts had to be
 * fixed away from today) — see that file's header comment for the full
 * incident: a shared socket's late "isFinal" from a superseded utterance
 * could be misattributed to a newer, unrelated call. No reason to
 * reintroduce that bug in new code.
 *
 * Scope: Teil 1 and Teil 2 (both AI-as-examiner) — see setStage() below for
 * how the session advances from one to the other mid-connection.
 */
import { openRealtimeStt, type SttSession } from "./elevenLabsStt.js";
import { openStreamingConnection, startStreamingSynthesis, type StreamConnection } from "./elevenLabsTts.js";
import { generateTutorReply, type TutorContext, type TutorHistoryTurn, type TutorTrigger } from "./tutorBrain.js";
import { ExaminerBrainError } from "./examinerBrain.js";
import type { ExamUsage } from "./costAccounting.js";
import { VoiceManager } from "./voiceManager.js";
import { createSupabaseVoiceStore } from "./supabaseVoiceStore.js";
import { getPool, EXAMINER_POOL } from "./voicePools.js";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const voiceManager = new VoiceManager(getPool(EXAMINER_POOL), createSupabaseVoiceStore(admin));

export interface TutorVoiceCallbacks {
  onOpen?: () => void;
  onAudioChunk?: (base64: string) => void;
  onOutputTranscript?: (text: string) => void;
  onInputTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onClose?: (reason: string) => void;
}

export interface TutorVoiceSession {
  sendAudioChunk(base64: string): void;
  sendSystemMessage(text: string): void;
  speakScriptedText(text: string): Promise<void>;
  /** Advances the session's stage (and, for stage 2, sets the shared topic)
   * — server.ts calls this exactly once, when Teil 1 completes and Teil 2
   * begins. Mutates the context used by every SUBSEQUENT speak() call;
   * Claude needs the CURRENT stage's own prompt/topic, not whatever this
   * session opened with (see tutorBrain.ts's buildTutorSystemPrompt, which
   * branches on ctx.stage). History is deliberately NOT cleared — Teil 2's
   * examiner can still ground a question in something said back in Teil 1
   * if genuinely relevant, same as a real examiner would remember. */
  setStage(stage: 2, teil2Topic: string): void;
  /** The real ElevenLabs voice ID for this session — needed to pick a
   * style-consistent scripted-phrase variant (examinerPhrases.ts's
   * pickSectionTransition12) before speaking it, same reasoning as
   * muendlichVoiceSession.ts's identical method. */
  getVoiceId(): string;
  getUsage(): ExamUsage;
  close(): void;
}

// Real bug found via live testing at the original 3,000: some Teil 2/3
// muendlich_materials rows carry a FULL reading-passage body_text (a whole
// short newspaper article, not a one-line guiding sentence) — formatTopic()
// embeds that verbatim into the topic announcement, which alone can run
// 1,500+ characters. Combined with Teil 1's opening/2 questions and several
// Teil 2 questions, the ceiling was hit mid-session, silently dropping the
// closing line's AUDIO (the transcript still recorded it via the ceiling's
// own text-only fallback — see speakScriptedText's ceiling branch below —
// which is exactly why this went unnoticed until the actual character count
// was checked, not just "did a transcript line appear"). 6,000 covers
// Teil 1 + a long-article Teil 2 topic + several questions + closing with
// real headroom, while staying well under the 2-participant exam room's
// 7,000 (this is one participant, not two).
const MAX_ELEVENLABS_CHARS_PER_SESSION = 6000;

export async function openTutorVoiceSession(initialCtx: TutorContext, sessionId: string, callbacks: TutorVoiceCallbacks): Promise<TutorVoiceSession> {
  let voice = await voiceManager.assignVoice(sessionId, EXAMINER_POOL);
  let ctx: TutorContext = initialCtx;

  const history: TutorHistoryTurn[] = [];
  let closed = false;
  let stt: SttSession | null = null;
  let currentGenerationId = 0;
  let currentAbort: AbortController | null = null;
  let currentTtsHandle: ReturnType<typeof startStreamingSynthesis> | null = null;
  let currentTtsConn: StreamConnection | null = null;

  let ttsCharacters = 0;
  let sttBytes = 0;
  let claudeInputTokens = 0, claudeOutputTokens = 0, claudeCacheCreationInputTokens = 0, claudeCacheReadInputTokens = 0;
  const STT_SAMPLE_RATE = 16_000, STT_BYTES_PER_SAMPLE = 2;

  function charBudgetRemaining(): number { return MAX_ELEVENLABS_CHARS_PER_SESSION - ttsCharacters; }

  async function speak(trigger: TutorTrigger) {
    if (closed) return;
    currentAbort?.abort();
    currentTtsHandle?.cancel();
    try { currentTtsConn?.close(); } catch {}
    const myId = ++currentGenerationId;
    const abortCtrl = new AbortController();
    currentAbort = abortCtrl;
    let conn: StreamConnection | null = null;

    try {
      conn = await openStreamingConnection(voice.voiceId);
    } catch (e) {
      // Connection-level failure (including a handshake timeout — see
      // elevenLabsTts.ts's CONNECT_TIMEOUT_MS, added after a real live-
      // tested hang with zero error output anywhere) is treated as a
      // recoverable, per-utterance blip, NOT a fatal session error: this one
      // scheduled question/reply is skipped (logged, not silently) rather
      // than ending an otherwise-fine practice session over a single
      // transient network hiccup. Distinct from onVoiceError below, which
      // handles failures AFTER a connection is already open.
      console.warn(`[tutor voice] connection failed for session ${sessionId}, skipping this utterance:`, e instanceof Error ? e.message : e);
      if (myId === currentGenerationId) currentAbort = null;
      return;
    }

    try {
      if (closed || myId !== currentGenerationId) { try { conn.close(); } catch {} return; }
      currentTtsConn = conn;
      const ttsHandle = startStreamingSynthesis(conn, {
        onAudioChunk: (b64) => { if (myId === currentGenerationId) callbacks.onAudioChunk?.(b64); },
        onVoiceError: async (message) => {
          console.error(`[tutor voice] TTS error for session ${sessionId}:`, message);
          try {
            const fresh = await voiceManager.reassignAfterFailure(sessionId, EXAMINER_POOL, voice.voiceId);
            voice = fresh;
          } catch (e) {
            console.error(`[tutor voice] onVoiceError recovery itself failed for session ${sessionId}:`, e);
            callbacks.onError?.(e instanceof Error ? e.message : String(e));
          }
        },
      });
      currentTtsHandle = ttsHandle;
      let ttsError: unknown = null;
      ttsHandle.done.catch((e) => { ttsError = e; });

      let reply: string | null = null;
      let attempt = 0;
      for (;;) {
        // True the moment generateTutorReply emits its first chunk THIS
        // attempt — distinguishes "Claude returned nothing at all" (safe to
        // silently retry: no partial audio has gone out yet) from "Claude
        // returned something, it just happened to trim to empty" (NOT safe
        // to retry once chunks already reached ttsHandle — see below).
        let chunksSentThisAttempt = false;
        try {
          reply = await generateTutorReply(ctx, history, trigger, {
            onChunk: (text) => {
              if (myId !== currentGenerationId) return;
              chunksSentThisAttempt = true;
              const budget = charBudgetRemaining();
              if (budget <= 0) { console.warn(`[tutor voice] ${MAX_ELEVENLABS_CHARS_PER_SESSION}-char ceiling reached for session ${sessionId}`); return; }
              const toSend = text.length > budget ? text.slice(0, budget) : text;
              ttsCharacters += toSend.length;
              ttsHandle.appendText(toSend, false);
            },
            onUsage: (usage) => {
              if (myId !== currentGenerationId) return;
              claudeInputTokens += usage.inputTokens; claudeOutputTokens += usage.outputTokens;
              claudeCacheCreationInputTokens += usage.cacheCreationInputTokens; claudeCacheReadInputTokens += usage.cacheReadInputTokens;
            },
          }, abortCtrl.signal);
          // Real failure mode found via live testing: Claude occasionally
          // returns a genuinely empty reply with NO thrown error and NO
          // chunks ever emitted — previously silently accepted as "nothing
          // to say," which in practice meant the examiner skipped an entire
          // scheduled question with no visible symptom anywhere. Since zero
          // chunks means zero audio has been sent to ttsHandle yet, retrying
          // the whole call is safe (unlike a partial-then-trimmed-empty
          // reply, which we do NOT retry — something may already be playing).
          if (!reply?.trim() && !chunksSentThisAttempt && attempt < 2) {
            console.warn(`[tutor voice] empty reply with no chunks sent for session ${sessionId} (attempt ${attempt + 1}) — retrying`);
            attempt++;
            continue;
          }
          break;
        } catch (e) {
          if (e instanceof ExaminerBrainError && e.message === "aborted") { ttsHandle.cancel(); return; }
          attempt++;
          if (e instanceof ExaminerBrainError && e.retryable && attempt < 2) { await new Promise((r) => setTimeout(r, 500 * attempt)); continue; }
          ttsHandle.cancel();
          throw e;
        }
      }
      if (myId !== currentGenerationId) { ttsHandle.cancel(); return; }
      ttsHandle.appendText("", true);
      await ttsHandle.done.catch(() => {});
      if (ttsError) throw ttsError;

      if (reply && myId === currentGenerationId) {
        history.push({ speaker: "examiner", text: reply });
        callbacks.onOutputTranscript?.(reply);
      }
    } catch (e) {
      console.error(`[tutor voice] speak() failed for session ${sessionId}:`, e);
      if (myId === currentGenerationId) callbacks.onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      if (conn) { try { conn.close(); } catch {} }
      if (myId === currentGenerationId) { currentAbort = null; currentTtsHandle = null; currentTtsConn = null; }
    }
  }

  async function speakScriptedText(text: string): Promise<void> {
    if (closed) return;
    if (text.length > charBudgetRemaining()) {
      console.warn(`[tutor voice] ${MAX_ELEVENLABS_CHARS_PER_SESSION}-char ceiling reached for session ${sessionId} — skipping scripted utterance`);
      history.push({ speaker: "examiner", text });
      callbacks.onOutputTranscript?.(text);
      return;
    }
    currentAbort?.abort();
    currentTtsHandle?.cancel();
    try { currentTtsConn?.close(); } catch {}
    const myId = ++currentGenerationId;
    let conn: StreamConnection | null = null;

    try {
      conn = await openStreamingConnection(voice.voiceId);
    } catch (e) {
      // Same reasoning as speak()'s identical connection-failure branch — a
      // recoverable, per-utterance blip (including a handshake timeout, see
      // elevenLabsTts.ts's CONNECT_TIMEOUT_MS), not a fatal session error.
      // Unlike speak(), we already know the exact text here, so it's still
      // recorded to the transcript (audio just didn't make it this time) —
      // same convention as the char-budget-ceiling branch above.
      console.warn(`[tutor voice] connection failed for session ${sessionId}, skipping this scripted utterance's audio:`, e instanceof Error ? e.message : e);
      if (myId === currentGenerationId) {
        currentAbort = null;
        history.push({ speaker: "examiner", text });
        callbacks.onOutputTranscript?.(text);
      }
      return;
    }

    try {
      if (closed || myId !== currentGenerationId) { try { conn.close(); } catch {} return; }
      currentTtsConn = conn;
      const ttsHandle = startStreamingSynthesis(conn, {
        onAudioChunk: (b64) => { if (myId === currentGenerationId) callbacks.onAudioChunk?.(b64); },
        onVoiceError: async (message) => {
          console.error(`[tutor voice] TTS error (scripted) for session ${sessionId}:`, message);
          try {
            const fresh = await voiceManager.reassignAfterFailure(sessionId, EXAMINER_POOL, voice.voiceId);
            voice = fresh;
          } catch (e) {
            console.error(`[tutor voice] onVoiceError recovery itself failed for session ${sessionId}:`, e);
            callbacks.onError?.(e instanceof Error ? e.message : String(e));
          }
        },
      });
      currentTtsHandle = ttsHandle;
      let ttsError: unknown = null;
      ttsHandle.done.catch((e) => { ttsError = e; });

      ttsCharacters += text.length;
      ttsHandle.appendText(text, true);
      await ttsHandle.done.catch(() => {});
      if (ttsError) throw ttsError;

      if (myId === currentGenerationId) {
        history.push({ speaker: "examiner", text });
        callbacks.onOutputTranscript?.(text);
      }
    } catch (e) {
      console.error(`[tutor voice] speakScriptedText() failed for session ${sessionId}:`, e);
      if (myId === currentGenerationId) callbacks.onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      if (conn) { try { conn.close(); } catch {} }
      if (myId === currentGenerationId) { currentAbort = null; currentTtsHandle = null; currentTtsConn = null; }
    }
  }

  function handleCommittedTranscript(text: string) {
    if (!text.trim()) return;
    history.push({ speaker: "student", text });
    callbacks.onInputTranscript?.(text);
    // No organic-trigger mechanism here, by design — same reasoning as the
    // exam's Teil 1 redesign: every examiner turn in Teil 1 is explicitly
    // cued by the deterministic timer in server.ts, never decided by the
    // model listening in the background.
  }

  try {
    const sttCallbacks = {
      onCommitted: (text: string) => handleCommittedTranscript(text),
      onError: (msg: string) => console.error(`[tutor voice] STT error (session ${sessionId}):`, msg),
      onClose: () => console.warn(`[tutor voice] STT connection closed (session ${sessionId}) — organic input transcripts disabled for the rest of the session`),
    };
    stt = await openRealtimeStt(sttCallbacks);
  } catch (e) {
    console.error(`[tutor voice] failed to open STT for session ${sessionId}:`, e);
  }

  setTimeout(() => callbacks.onOpen?.(), 0);

  return {
    sendAudioChunk(base64) {
      const bytes = Buffer.byteLength(base64, "base64");
      sttBytes += bytes;
      stt?.sendPcm16(base64);
    },
    sendSystemMessage(text) {
      void speak({ type: "system", text: `[SYSTEM] ${text}` });
    },
    speakScriptedText(text) {
      return speakScriptedText(text);
    },
    setStage(stage, teil2Topic) {
      ctx = { ...ctx, stage, teil2Topic };
    },
    getVoiceId() {
      return voice.voiceId;
    },
    getUsage() {
      const sttMinutes = sttBytes / STT_BYTES_PER_SAMPLE / STT_SAMPLE_RATE / 60;
      return {
        ttsCharacters, sttMinutes,
        claudeInputTokens, claudeOutputTokens, claudeCacheCreationInputTokens, claudeCacheReadInputTokens,
      } as ExamUsage;
    },
    close() {
      closed = true;
      currentAbort?.abort();
      currentTtsHandle?.cancel();
      stt?.close();
      try { currentTtsConn?.close(); } catch {}
    },
  };
}
