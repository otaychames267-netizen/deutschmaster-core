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
 * Scope: Teil 1, Teil 2 (both AI-as-examiner), and Teil 3 (AI switches to a
 * "study partner" persona — see setPartnerStage() below) — see setStage()/
 * setPartnerStage() for how the session advances between them
 * mid-connection.
 */
import { openRealtimeStt, type SttSession } from "./elevenLabsStt.js";
import { openGroqStt } from "./groqStt.js";
import { openFailoverStt } from "./failoverStt.js";
import { SpeechDetector } from "../speechActivity.js";
import { openLiveConnection, startLiveSynthesis, liveTtsPath, warmUpLiveVoice, type LiveConnection, type StreamingSynthesisHandle } from "./elevenLabsTts.js";
import { VOICES } from "./voices.config.js";
import { generateTutorReply, type TutorContext, type TutorHistoryTurn, type TutorTrigger } from "./tutorBrain.js";
import { ExaminerBrainError } from "./examinerBrain.js";
import type { ExamUsage } from "./costAccounting.js";
import { VoiceManager } from "./voiceManager.js";
import { createSupabaseVoiceStore } from "./supabaseVoiceStore.js";
import { getTutorPool, TUTOR_EXAMINER_POOL, TUTOR_PARTNER_POOL } from "./voicePools.js";
import { isAzureVoice } from "./azureTts.js";
import type { VoiceProfile } from "./voiceProfiles.js";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
// The 1:1 tutor now reuses the 2:1 exam's transitions + closing lines and their pre-generated audio clips (owner 2026-10-06).
import { findLibraryAssetById, findTutorV4Asset } from "./phraseLibrary/libraryStore.js";
import { pickVariant } from "./phraseLibrary/phraseSelection.js";
import { getSoloExamEndPool, TUTOR_PHRASE_STYLE, type ScriptedLine } from "../examinerPhrases.js";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
// Two separate pools (owner 2026-10-09): 10 examiner voices for Teil 1/2 and 10 different partner voices for Teil 3 — see voices.config.ts.
const examinerVoices = new VoiceManager(getTutorPool(TUTOR_EXAMINER_POOL), createSupabaseVoiceStore(admin));
const partnerVoices = new VoiceManager(getTutorPool(TUTOR_PARTNER_POOL), createSupabaseVoiceStore(admin));

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
  /** Resolves when the triggered reply has been fully SENT (not played — see playbackRemainingMs). */
  sendSystemMessage(text: string): Promise<void>;
  /** Milliseconds until everything sent so far has finished PLAYING on the client. */
  playbackRemainingMs(): number;
  speakScriptedText(text: string): Promise<void>;
  /** A 2:1 exam transition line: its fixed lead sentence plays from the cached audio library ($0), the part with the topic is
   * spoken live right behind it. Falls back to speaking the whole line live when no clip exists for this voice. */
  speakScriptedLine(line: ScriptedLine): Promise<void>;
  /** The 2:1 exam's closing line (cached clip, $0), restricted to the wordings that fit ONE student; spoken in the voice that is
   * active right now (the partner's in Teil 3). Falls back to live TTS of the same text when no clip exists. */
  playSoloExamEnd(): Promise<void>;
  /** Waits (capped) until the student's last words are transcribed — call before deciding anything from what they just said. */
  flushStt(): Promise<void>;
  /** Advances the session's stage (and, for stage 2, sets the shared topic)
   * — server.ts calls this exactly once, when Teil 1 completes and Teil 2
   * begins. Mutates the context used by every SUBSEQUENT speak() call;
   * Claude needs the CURRENT stage's own prompt/topic, not whatever this
   * session opened with (see tutorBrain.ts's buildTutorSystemPrompt, which
   * branches on ctx.stage). History is deliberately NOT cleared — Teil 2's
   * examiner can still ground a question in something said back in Teil 1
   * if genuinely relevant, same as a real examiner would remember. */
  setStage(stage: 2, teil2Topic: string): void;
  /** Advances to Teil 3 AND assigns a distinct, stable "partner" voice —
   * the persona switch (examiner -> study partner) is the whole point of
   * Teil 3, so it needs to audibly sound like a different person, not just
   * different wording from the same voice. Assigned once (keyed on
   * `${sessionId}:partner`, a different assignment key than the examiner's
   * own `sessionId` — see voiceManager.ts's assignVoice, keyed on
   * (sessionKey, characterId) — so the two land on independently-hashed,
   * very likely different voices), stable for the rest of the session.
   * Async (unlike setStage) because voice assignment itself is async, same
   * as the examiner voice's own assignment at session open. Every speak()/
   * speakScriptedText() call AFTER this resolves uses the partner voice;
   * calls made to deliver the Teil2->3 TRANSITION line itself still use the
   * examiner voice (that line is spoken as the examiner, announcing the
   * switch) — call this only once that line has finished. */
  setPartnerStage(teil3Topic: string): Promise<void>;
  /** The examiner's ElevenLabs voice ID — needed to pick a style-consistent
   * scripted-phrase variant (tutorPhrases.ts's pickTeil1ToTeil2/
   * pickTeil2ToTeil3) before speaking it, same reasoning as
   * muendlichVoiceSession.ts's identical method. Always the EXAMINER voice,
   * even after setPartnerStage() — the Teil2->3 transition line is the last
   * thing spoken as the examiner. */
  getVoiceId(): string;
  /** The partner's voice id — null until setPartnerStage() resolves. For
   * style-consistent picking of anything spoken AFTER the persona switch
   * (e.g. tutorPhrases.ts's pickSessionEnd, spoken by the partner). */
  getPartnerVoiceId(): string | null;
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
// 2026-10-08: lowered 6,000 -> 3,500 after the lean-prompt rewrite (measured full sessions use ~2,500-2,900 live
// chars, see tutorCost.harness.mjs; replies are length-capped and turns fixed at 2/6/7, so ~20-40% headroom is
// enough) — it is the hard worst-case bound behind the per-student monthly budget
// (muendlich_ai_monthly_budget_usd): 3,500 chars is at most ~0.18 USD of TTS per session.
const MAX_ELEVENLABS_CHARS_PER_SESSION = 3500;

/** Optional pin: set TUTOR_EXAMINER_VOICE_ID (e.g. Leonie, uvysWDLbKpA4XvpD3GI6) to make every 1:1 session use that one examiner voice. Unset = the
 * normal rotation over the 10 examiner voices of the "tutor_examiner" pool. */
const TUTOR_EXAMINER_VOICE_ID = process.env.TUTOR_EXAMINER_VOICE_ID ?? "";

/** The cached tutor clips (audio-library/tutor-v4) belong to the live voice of the tutor: Azure voices and ElevenLabs v4 Turbo. Only the old Flash path uses the Flash library. */
function usesTutorLibrary(voiceId: string): boolean {
  return isAzureVoice(voiceId) || liveTtsPath() === "dialogue";
}

export async function openTutorVoiceSession(initialCtx: TutorContext, sessionId: string, callbacks: TutorVoiceCallbacks): Promise<TutorVoiceSession> {
  // Owner 2026-10-09: 10 examiner voices (Leonie first in the list) rotate per session, stable within a session; TUTOR_EXAMINER_VOICE_ID pins one.
  const preferredExaminer = TUTOR_EXAMINER_VOICE_ID ? VOICES.find((v) => v.enabled && v.voiceId === TUTOR_EXAMINER_VOICE_ID) : undefined;
  let voice = preferredExaminer ?? (await examinerVoices.assignVoice(sessionId, TUTOR_EXAMINER_POOL));
  if (liveTtsPath() === "dialogue") void warmUpLiveVoice(voice.voiceId); // hides the slow first stream of a voice behind the session start (see warmUpLiveVoice)
  // Assigned once, lazily, by setPartnerStage() — null until Teil 3 begins.
  // A DIFFERENT assignment key (`${sessionId}:partner`, not `sessionId`)
  // than the examiner's own — see voiceManager.ts's stableHash-based
  // selection, keyed on the sessionKey string — so the two land on
  // independently-computed, very likely different voices from the pool.
  let partnerVoice: VoiceProfile | null = null;
  let ctx: TutorContext = initialCtx;

  // The voice actually used for the NEXT speak()/speakScriptedText() call —
  // the partner's once Teil 3 has begun, the examiner's otherwise. Checked
  // fresh each call (not cached) since ctx.stage changes mid-session.
  // Set once the exam is being closed: the EXAMINER says the closing line in her own voice (a fellow-candidate partner closing the exam would
  // sound wrong), even though ctx.stage is still 3 at that point.
  let closingByExaminer = false;
  function isPartnerSpeaking(): boolean {
    return !closingByExaminer && ctx.stage === 3 && !!partnerVoice;
  }
  function activeVoiceId(): string {
    return !closingByExaminer && ctx.stage === 3 && partnerVoice ? partnerVoice.voiceId : voice.voiceId;
  }

  const history: TutorHistoryTurn[] = [];
  let closed = false;
  let stt: SttSession | null = null;
  let currentGenerationId = 0;
  let currentAbort: AbortController | null = null;
  let currentTtsHandle: StreamingSynthesisHandle | null = null;
  let currentTtsConn: LiveConnection | null = null;

  let ttsCharacters = 0;
  let sttBytes = 0;
  let sttFallbackBytes = 0; // subset of sttBytes that went to the ElevenLabs fallback after a Groq failover

  // When the audio sent so far will have finished PLAYING on the client. The relay sends audio far faster than real
  // time and the browser queues it gaplessly, so "I finished sending" is NOT "the tutor finished speaking" — every
  // student-facing clock (90s presentation, 40s answer windows) must start from here (found with the exam room's
  // full-length test; the tutor had the identical bug). Also used to keep the tutor's own voice out of STT.
  let playbackEndsAt = 0;
  const PLAYBACK_BYTES_PER_SECOND = 24_000 * 2; // pcm16 mono @ 24kHz
  function emitAudio(b64: string) {
    const seconds = Buffer.byteLength(b64, "base64") / PLAYBACK_BYTES_PER_SECOND;
    playbackEndsAt = Math.max(playbackEndsAt, Date.now()) + seconds * 1000;
    callbacks.onAudioChunk?.(b64);
  }
  // One adaptive speech detector for the student's mic (speechActivity.ts) — the SAME one the exam room uses: forwards
  // speech plus a short hangover to STT, drops long silence (was: ALL audio, ~$0.39/h of Scribe for silence too).
  const sttGate = new SpeechDetector();
  const STT_HANGOVER_MS = 1_500;
  let sttLastActiveAt = 0;
  const FLUSH_WAIT_CAP_MS = 8_000;
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
    let conn: LiveConnection | null = null;
    // Snapshot NOW, not re-read after any await below — ctx.stage (and
    // therefore which persona is "active") could in principle change again
    // before this call's onVoiceError fires, and that handler must reassign
    // the SAME voice this call actually opened a connection with, examiner
    // or partner, not whichever happens to be active by then.
    const speakingIsPartner = isPartnerSpeaking();
    const speakingVoiceId = activeVoiceId();

    try {
      conn = await openLiveConnection(speakingVoiceId);
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
      const ttsHandle = startLiveSynthesis(conn, {
        onAudioChunk: (b64) => { if (myId === currentGenerationId) emitAudio(b64); },
        onVoiceError: async (message) => {
          console.error(`[tutor voice] TTS error for session ${sessionId}:`, message);
          try {
            // Reassign whichever persona was ACTUALLY speaking this call
            // (snapshotted above, before any await) — not whichever is
            // "active" now, which could differ if the stage advanced again
            // in the meantime.
            if (speakingIsPartner && partnerVoice) {
              const fresh = await partnerVoices.reassignAfterFailure(`${sessionId}:partner`, TUTOR_PARTNER_POOL, partnerVoice.voiceId);
              partnerVoice = fresh;
            } else {
              const fresh = await examinerVoices.reassignAfterFailure(sessionId, TUTOR_EXAMINER_POOL, voice.voiceId);
              voice = fresh;
            }
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
        history.push({ speaker: speakingIsPartner ? "partner" : "examiner", text: reply });
        callbacks.onOutputTranscript?.(reply);
      }
    } catch (e) {
      // Real bug found via live testing (2026-09-29): a post-connection TTS
      // failure here — including the new synthesis-stall timeout added to
      // elevenLabsTts.ts earlier the same day — used to call callbacks.onError,
      // which server.ts wires to a FATAL path that ends the entire session.
      // That meant a single transient ElevenLabs hiccup killed an otherwise-
      // fine practice session outright, wasting the student's daily-cap
      // minutes for a network blip. Treat it the same as the connection-open
      // failure branch above: recoverable, this one turn's audio is skipped,
      // the session continues. Reserve escalation for a genuinely
      // unrecoverable case (onVoiceError's own recovery attempt failing,
      // handled separately below) rather than every single-utterance error.
      console.error(`[tutor voice] speak() failed for session ${sessionId}, skipping this utterance:`, e);
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
    let conn: LiveConnection | null = null;
    // Snapshot now — see speak()'s identical comment for why. Note this is
    // taken BEFORE any stage change a caller might make right after this
    // call resolves (e.g. server.ts speaks the Teil2->3 transition line via
    // this function WHILE ctx.stage is still 2, THEN calls setPartnerStage()
    // — the transition line itself must stay the examiner's voice).
    const speakingIsPartner = isPartnerSpeaking();
    const speakingVoiceId = activeVoiceId();

    try {
      conn = await openLiveConnection(speakingVoiceId);
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
        history.push({ speaker: speakingIsPartner ? "partner" : "examiner", text });
        callbacks.onOutputTranscript?.(text);
      }
      return;
    }

    try {
      if (closed || myId !== currentGenerationId) { try { conn.close(); } catch {} return; }
      currentTtsConn = conn;
      const ttsHandle = startLiveSynthesis(conn, {
        onAudioChunk: (b64) => { if (myId === currentGenerationId) emitAudio(b64); },
        onVoiceError: async (message) => {
          console.error(`[tutor voice] TTS error (scripted) for session ${sessionId}:`, message);
          try {
            if (speakingIsPartner && partnerVoice) {
              const fresh = await partnerVoices.reassignAfterFailure(`${sessionId}:partner`, TUTOR_PARTNER_POOL, partnerVoice.voiceId);
              partnerVoice = fresh;
            } else {
              const fresh = await examinerVoices.reassignAfterFailure(sessionId, TUTOR_EXAMINER_POOL, voice.voiceId);
              voice = fresh;
            }
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
        history.push({ speaker: speakingIsPartner ? "partner" : "examiner", text });
        callbacks.onOutputTranscript?.(text);
      }
    } catch (e) {
      // Same fix as speak()'s identical catch block, same reasoning — a
      // post-connection TTS failure (including a synthesis-stall timeout)
      // is a recoverable per-utterance blip, not a reason to end the whole
      // session. We already know the exact text here, so it's still
      // recorded to the transcript (audio just didn't make it this time) —
      // same convention as the connection-failure branch above.
      console.error(`[tutor voice] speakScriptedText() failed for session ${sessionId}, skipping this utterance's audio:`, e);
      if (myId === currentGenerationId) {
        history.push({ speaker: speakingIsPartner ? "partner" : "examiner", text });
        callbacks.onOutputTranscript?.(text);
      }
    } finally {
      if (conn) { try { conn.close(); } catch {} }
      if (myId === currentGenerationId) { currentAbort = null; currentTtsHandle = null; currentTtsConn = null; }
    }
  }

  // ---- cached 2:1 clips (same mechanics as muendlichVoiceSession.ts's playPcmFile / speakScriptedLine / playLibraryPhrase) ----
  const LIBRARY_CHUNK_BYTES = 32 * 1024; // ~0.33s of pcm16@24kHz per chunk, same cadence as live TTS

  async function playPcmFile(logLabel: string, absolutePath: string, spokenText: string): Promise<void> {
    if (closed) return;
    currentAbort?.abort();
    currentTtsHandle?.cancel();
    try { currentTtsConn?.close(); } catch {}
    currentTtsConn = null;
    const myId = ++currentGenerationId;
    const speakingIsPartner = isPartnerSpeaking(); // snapshot before any await, same as speakScriptedText
    try {
      const pcm = await readFile(absolutePath);
      if (myId !== currentGenerationId) return; // superseded while reading the file
      for (let offset = 0; offset < pcm.length; offset += LIBRARY_CHUNK_BYTES) {
        if (myId !== currentGenerationId || closed) return;
        emitAudio(pcm.subarray(offset, offset + LIBRARY_CHUNK_BYTES).toString("base64"));
      }
      // No ttsCharacters increment: a cached clip costs nothing at runtime — that is the whole point.
      if (myId === currentGenerationId) {
        history.push({ speaker: speakingIsPartner ? "partner" : "examiner", text: spokenText });
        callbacks.onOutputTranscript?.(spokenText);
      }
    } catch (e) {
      // a missing / unreadable clip is one line's audio, never a reason to end a practice session
      console.error(`[tutor voice] ${logLabel} failed for session ${sessionId}, skipping this utterance's audio:`, e);
    }
  }

  async function speakScriptedLine(line: ScriptedLine): Promise<void> {
    if (closed) return;
    // Cached lead: v4 Turbo clips (audio-library/tutor-v4, generateTutorLibrary.ts) when the live voice is v4 Turbo, the Flash v2.5 library when it
    // is Flash — a lead must be synthesized with the same model as the live remainder after it, or the line changes timbre mid-sentence.
    if (line.lead) {
      const found = usesTutorLibrary(activeVoiceId())
        ? await findTutorV4Asset("scripted_lead", activeVoiceId(), line.id)
        : await findLibraryAssetById("scripted_lead", activeVoiceId(), line.id);
      if (found) {
        await playPcmFile(`speakScriptedLine(${line.id})`, found.absolutePath, found.asset.text);
        return speakScriptedText(line.rest);
      }
    }
    return speakScriptedText(line.full);
  }

  async function playSoloExamEnd(): Promise<void> {
    if (closed) return;
    closingByExaminer = true; // from here on every utterance is the examiner's (see isPartnerSpeaking)
    const voiceId = voice.voiceId;
    const pool = getSoloExamEndPool();
    const chosen = pickVariant("solo_exam_end", pool, TUTOR_PHRASE_STYLE); // professional register for every voice
    const found = usesTutorLibrary(voiceId)
      ? await findTutorV4Asset("exam_end", voiceId, chosen.id)
      : await findLibraryAssetById("exam_end", voiceId, chosen.id);
    if (!found) return speakScriptedText(chosen.text); // library not generated for this voice: same text, spoken live
    return playPcmFile("playSoloExamEnd", found.absolutePath, found.asset.text);
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
    // Groq-hosted Whisper (~10x cheaper) with automatic failover to ElevenLabs Scribe, same as the exam room.
    stt = process.env.MUENDLICH_STT_BACKEND === "groq"
      ? await openFailoverStt(openGroqStt, openRealtimeStt, sttCallbacks, `tutor session ${sessionId}`)
      : await openRealtimeStt(sttCallbacks);
  } catch (e) {
    console.error(`[tutor voice] failed to open STT for session ${sessionId}:`, e);
  }

  setTimeout(() => callbacks.onOpen?.(), 0);

  return {
    sendAudioChunk(base64) {
      const now = Date.now();
      if (now < playbackEndsAt + 500) return; // the tutor is (still) audibly speaking — never feed its own voice back into STT
      const speech = sttGate.isSpeech(base64, now);
      if (speech) sttLastActiveAt = now;
      else if (now - sttLastActiveAt >= STT_HANGOVER_MS) return; // genuine silence beyond the hangover
      const bytes = Buffer.byteLength(base64, "base64");
      sttBytes += bytes;
      if (stt && "failedOver" in stt && (stt as { failedOver: boolean }).failedOver) sttFallbackBytes += bytes;
      stt?.sendPcm16(base64);
    },
    sendSystemMessage(text) {
      // Utterance-buffering STT (Groq) holds the student's last words un-transcribed for up to a pause: flush first
      // (capped) so the reply is grounded on what was JUST said, then speak. Resolves when the reply has been sent.
      const sendIt = (): Promise<void> => speak({ type: "system", text: `[SYSTEM] ${text}` }).catch(() => {});
      const flushing = stt?.flush?.();
      if (!flushing) return sendIt();
      return Promise.race([flushing.catch(() => {}), new Promise<void>((r) => setTimeout(r, FLUSH_WAIT_CAP_MS))]).then(sendIt);
    },
    playbackRemainingMs() {
      return Math.max(0, playbackEndsAt - Date.now());
    },
    speakScriptedText(text) {
      return speakScriptedText(text);
    },
    speakScriptedLine(line) {
      return speakScriptedLine(line);
    },
    playSoloExamEnd() {
      return playSoloExamEnd();
    },
    flushStt() {
      const flushing = stt?.flush?.();
      if (!flushing) return Promise.resolve();
      return Promise.race([flushing.catch(() => {}), new Promise<void>((r) => setTimeout(r, FLUSH_WAIT_CAP_MS))]).then(() => {});
    },
    setStage(stage, teil2Topic) {
      ctx = { ...ctx, stage, teil2Topic };
      if (stage === 2 && liveTtsPath() === "dialogue") {
        // Pick the Teil-3 partner now (assignVoice is idempotent — setPartnerStage() gets the same voice) and warm it during Teil 2.
        void partnerVoices.assignVoice(`${sessionId}:partner`, TUTOR_PARTNER_POOL).then((p) => warmUpLiveVoice(p.voiceId)).catch(() => {});
      }
    },
    async setPartnerStage(teil3Topic) {
      // Different assignment key (`${sessionId}:partner`) than the
      // examiner's own `sessionId` — see this function's own interface doc
      // comment for why that reliably lands on a different voice.
      partnerVoice = await partnerVoices.assignVoice(`${sessionId}:partner`, TUTOR_PARTNER_POOL);
      // The partner pool is disjoint from the examiner pool (voices.config.ts), so the partner is always a different person than the examiner.
      ctx = { ...ctx, stage: 3, teil3Topic };
    },
    getVoiceId() {
      return voice.voiceId;
    },
    getPartnerVoiceId() {
      return partnerVoice?.voiceId ?? null;
    },
    getUsage() {
      const sttMinutes = sttBytes / STT_BYTES_PER_SAMPLE / STT_SAMPLE_RATE / 60;
      const usingGroq = process.env.MUENDLICH_STT_BACKEND === "groq";
      const fallbackMinutes = sttFallbackBytes / STT_BYTES_PER_SAMPLE / STT_SAMPLE_RATE / 60;
      const billing = stt?.billing?.() ?? null;
      return {
        ttsCharacters,
        // Groq path: ElevenLabs STT minutes are only what failed over; Groq is billed per request (>= 10s each).
        sttMinutes: usingGroq ? fallbackMinutes : sttMinutes,
        groqSttMinutes: usingGroq ? (billing ? billing.billedSeconds / 60 : sttMinutes - fallbackMinutes) : 0,
        groqRequests: billing?.requests,
        forwardedSttMinutes: sttMinutes,
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
