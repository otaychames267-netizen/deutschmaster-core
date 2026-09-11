/**
 * openMuendlichVoiceSession() — the Claude + ElevenLabs replacement for
 * geminiLive.ts's openMuendlichLiveSession(). Deliberately mirrors that
 * file's external shape closely (same ctx fields, same callback names
 * where the semantics match) so server.ts's integration is a small,
 * reviewable diff rather than a rewrite — see server.ts's own comments at
 * each call site for exactly what changed and why.
 *
 * Per-turn flow for an explicit ("system") trigger — opening line, Teil
 * handoffs, takeover questions, anti-silence nudges, repeat requests —
 * mirrors 1:1 what server.ts already sends today:
 *   sendSystemMessage(text) -> generateExaminerReply() streams sentence
 *   chunks -> each chunk is appended to the one persistent ElevenLabs Flash
 *   v2.5 streaming connection for this session -> audio chunks stream back
 *   out through onAudioChunk as they arrive (progressive playback, not
 *   wait-for-the-whole-reply).
 *
 * Organic triggers (Teil-1 presentation follow-ups) are driven by the
 * per-slot ElevenLabs STT streams' committed_transcript events — see this
 * file's header note in examinerBrain.ts for why this exists and what it
 * approximates.
 */
import { readFile } from "node:fs/promises";
import { openRealtimeStt, type SttSession } from "./elevenLabsStt.js";
import { openWhisperStt } from "./whisperStt.js";
import { openStreamingConnection, startStreamingSynthesis, type StreamConnection } from "./elevenLabsTts.js";
import { generateExaminerReply, ExaminerBrainError, type ExamContext, type HistoryTurn } from "./examinerBrain.js";
import type { ExamUsage } from "./costAccounting.js";
import { VoiceManager } from "./voiceManager.js";
import { createSupabaseVoiceStore } from "./supabaseVoiceStore.js";
import { getPool, EXAMINER_POOL } from "./voicePools.js";
import { pickLibraryAsset } from "./phraseLibrary/libraryStore.js";
import { getFixedPool } from "./phraseLibrary/fixedPhrases.js";
import { getTeil1QuestionPool } from "./phraseLibrary/teil1Questions.js";
import { pickVariant } from "./phraseLibrary/phraseSelection.js";
import { assignPhraseStyle } from "./phraseLibrary/voiceStyle.js";
import type { FixedPhraseCategory } from "./phraseLibrary/phraseTypes.js";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const voiceManager = new VoiceManager(getPool(EXAMINER_POOL), createSupabaseVoiceStore(admin));

/** Last-resort Teil-1 prompt for a topic string that doesn't match any of
 * the 7 configured TEIL1_TOPICS (see teil1Questions.ts) — genuinely
 * topic-agnostic (works with any raw topic string), used only so
 * playTeil1Question() never produces silence. Not a substitute for adding
 * real questions when this actually fires (it's logged loudly when it
 * does) — see playTeil1Question()'s call site. */
const GENERIC_TEIL1_FALLBACK: ((topic: string) => string)[] = [
  (topic) => `Bitte präsentieren Sie nun Ihr Thema: ${topic}. Sprechen Sie über Ihre eigenen Erfahrungen und Ihre persönliche Meinung dazu. Sie haben dafür etwa anderthalb Minuten.`,
  (topic) => `Ihr Thema für diesen Teil lautet: ${topic}. Erzählen Sie bitte davon — was Sie damit verbinden und wie Sie persönlich dazu stehen. Sie haben dafür etwa anderthalb Minuten.`,
  (topic) => `Bitte beginnen Sie nun mit Ihrer Präsentation zum Thema ${topic}. Gehen Sie dabei auf Ihre eigenen Erfahrungen ein. Sie haben dafür etwa anderthalb Minuten.`,
];

export interface RoomContext {
  personAName: string;
  personBName: string;
  teil1TopicA: string;
  teil1TopicB: string;
  teil2Topic: string;
  teil3Topic: string;
  level?: "B1" | "B2";
}

export interface MuendlichVoiceSession {
  sendAudioChunk(slot: "A" | "B", base64: string): void;
  sendSystemMessage(text: string): void;
  /** Plays a fully fixed, pre-generated welcome/exam_end phrase for this
   * session's assigned voice — zero ElevenLabs TTS cost when the audio
   * library has actually been generated (see phraseLibrary/
   * generateLibrary.ts); falls back to a real dynamic-TTS reading of the
   * same hand-written pool when it hasn't (safe either way, never silent). */
  playLibraryPhrase(category: FixedPhraseCategory): Promise<void>;
  /** Teil 1's opening move: plays one pre-generated question for the given
   * topic (phraseLibrary/teil1Questions.ts, 7 topics x 15 real questions),
   * $0 ElevenLabs cost once generated. The candidate then presents at
   * length in response — that response goes to STT only, never TTS. */
  playTeil1Question(topic: string): Promise<void>;
  /** Speaks a fully predetermined sentence (exam_start / task_transition /
   * section_transition — see examinerPhrases.ts) directly via TTS, skipping
   * Claude entirely: there is no "what to say" decision left once the
   * caller has already picked the exact text, so routing it through the
   * examiner brain was pure overhead (extra latency, extra Claude cost, and
   * a small risk of the model paraphrasing instead of saying it exactly). */
  speakScriptedText(text: string): Promise<void>;
  /** The real ElevenLabs voice ID assigned to this exam session — server.ts
   * needs this to pick a style-consistent scripted-phrase variant
   * (examinerPhrases.ts's pickExamStart/pickTaskTransition/
   * pickSectionTransition*) BEFORE calling speakScriptedText, since the
   * picking itself has to happen one level up (it needs the real candidate
   * name/topic for this exam, which the voice session doesn't have). */
  getVoiceId(): string;
  /** server.ts calls this from startStage() — lets the session gate
   * organic (Teil-1-only) triggers without server.ts needing to know
   * anything about how those triggers work internally. */
  setStage(stage: 1 | 2 | 3): void;
  /** Running totals for the credit/cost accounting system (costAccounting.ts) —
   * real character counts actually sent to TTS, real audio-minutes actually
   * sent to STT, accumulated live as the exam progresses. server.ts reads
   * this periodically (same cadence as the existing credit tick) to persist
   * usage and enforce the 60,000-credit hard cap. */
  getUsage(): ExamUsage;
  close(): void;
}

export interface MuendlichVoiceCallbacks {
  onOpen?: () => void;
  onAudioChunk?: (base64: string) => void;
  onOutputTranscript?: (text: string) => void;
  /** Unlike Gemini Live's version (which had to guess the speaker from a
   * "last sender" heuristic — see server.ts's file header), this fires
   * with the REAL slot, because each candidate has their own STT stream. */
  onInputTranscript?: (text: string, slot: "A" | "B") => void;
  onError?: (message: string) => void;
  onClose?: (reason: string) => void;
}

const CLAUDE_MAX_RETRYABLE_ATTEMPTS = 2;
// How long a candidate can keep talking before an organic trigger considers
// firing — mirrors the same "candidate paused" signal shape as committed
// transcripts already provide; this just adds a minimum pause so a single
// short committed segment mid-sentence-with-a-breath doesn't immediately
// trigger a Claude call on every clause.
const ORGANIC_TRIGGER_DEBOUNCE_MS = 1_500;

export async function openMuendlichVoiceSession(ctx: RoomContext, examSessionId: string, callbacks: MuendlichVoiceCallbacks): Promise<MuendlichVoiceSession> {
  const level = ctx.level ?? "B2";
  const examCtx: ExamContext = {
    personAName: ctx.personAName, personBName: ctx.personBName,
    teil1TopicA: ctx.teil1TopicA, teil1TopicB: ctx.teil1TopicB,
    teil2Topic: ctx.teil2Topic, teil3Topic: ctx.teil3Topic, level,
  };

  // `let`, not `const`: reassigned in the onVoiceError fallback paths below
  // (speak() and speakScriptedText()) so getVoiceId() and the style-
  // consistency logic (playLibraryPhrase, speakScriptedText's own
  // reassignment) always reflect the CURRENTLY active voice, not the one
  // this session started with — a real bug in the first version of this
  // reassignment path (it kept calling reassignAfterFailure with the
  // original, now-stale voiceId on every subsequent failure instead of the
  // current one), caught while wiring in getVoiceId(), not by a test.
  let voice = await voiceManager.assignVoice(examSessionId, EXAMINER_POOL);
  let ttsConn: StreamConnection = await openStreamingConnection(voice.voiceId);

  const history: HistoryTurn[] = [];
  let currentStage: 1 | 2 | 3 = 1;
  let closed = false;
  let sttA: SttSession | null = null;
  let sttB: SttSession | null = null;
  let organicDebounceTimer: NodeJS.Timeout | null = null;
  // Generation-id supersession, not a plain boolean guard: a boolean would
  // race on intentional barge-in (sendSystemMessage aborting an in-flight
  // organic reply and immediately starting a new one) — abort() doesn't
  // synchronously flip a "generating" flag back to false, so a same-tick
  // re-entry would see the old (still-true) flag and silently drop the new,
  // more important system-triggered message. Each speak() call instead
  // claims a fresh id; only the CURRENT id's own cleanup/callbacks apply —
  // a superseded call's aborted-error is swallowed quietly rather than
  // surfaced as a real failure (server.ts's onError is wired to a fatal,
  // session-ending path — an intentional barge-in must never trigger it).
  let currentGenerationId = 0;
  let currentAbort: AbortController | null = null;
  // True only while playLibraryPhrase() is actively streaming pre-generated
  // file bytes — it has no ttsHandle (no ElevenLabs synthesis in flight),
  // so the organic-trigger busy-check below needs this in addition to
  // currentTtsHandle to correctly treat "examiner is currently speaking a
  // library phrase" the same as "examiner is currently speaking a live
  // TTS reply."
  let currentlyPlayingLibrary = false;
  // HARD ceiling on dynamic ElevenLabs TTS characters for this one exam
  // (room total, both candidates combined) — a real, product-mandated
  // business limit, not just something reported after the fact. Fixed
  // library phrases (welcome/exam_end/Teil1 questions) never count against
  // this since they cost $0 at runtime regardless of volume; only text that
  // actually gets sent to ElevenLabs synthesis does. Enforced by gating the
  // TTS-chunk-forwarding point directly (see the two appendText call sites
  // below), not just checked/logged afterward — once the budget is spent,
  // further dynamic speech for this exam is silently dropped rather than
  // exceeding the ceiling, ever.
  const MAX_ELEVENLABS_CHARS_PER_EXAM_ROOM = 7000;
  function elevenLabsCharBudgetRemaining(): number {
    return MAX_ELEVENLABS_CHARS_PER_EXAM_ROOM - ttsCharacters;
  }
  // Real running usage, for costAccounting.ts — see getUsage() below.
  let ttsCharacters = 0;
  let sttBytesA = 0;
  let sttBytesB = 0;
  // Real Anthropic-reported token counts, accumulated across every Claude
  // call this session makes (speak() only — speakScriptedText/
  // playLibraryPhrase never call Claude at all, that's their entire point).
  let claudeInputTokens = 0;
  let claudeOutputTokens = 0;
  let claudeCacheCreationInputTokens = 0;
  let claudeCacheReadInputTokens = 0;
  const STT_SAMPLE_RATE = 16_000;
  const STT_BYTES_PER_SAMPLE = 2; // PCM16
  // Cost-efficiency fix: the client (useRelayAudio.ts) streams audio
  // continuously and unconditionally whenever a candidate is connected and
  // unmuted — including silence — because its own RMS check is only used
  // for a UI "thinking" heuristic, never to gate what's actually sent
  // (verified by reading the real ws.send call site, not assumed). Scribe
  // bills by audio duration regardless of content, so forwarding 100% of a
  // ~16-minute exam per candidate (most of which is silence while the
  // OTHER candidate or the examiner is speaking) would be pure waste on a
  // paid, per-minute service.
  //
  // This is silence SUPPRESSION WITH HANGOVER (the standard VoIP/telephony
  // pattern), not a naive per-frame drop: frames are always forwarded while
  // RMS is above the noise floor, AND for a short window afterward (the
  // "hangover"), so Scribe's own commit_strategy=vad still gets the trailing
  // silence it needs to actually recognize an utterance boundary and fire
  // committed_transcript — dropping ALL silence unconditionally would
  // starve that signal and silently break the organic-trigger mechanism.
  // Only silence BEYOND the hangover window (i.e. genuinely long dead air)
  // gets dropped. Same RMS-over-threshold value already proven in this
  // exact codebase's frontend (MIC_ACTIVITY_RMS=0.02 in useRelayAudio.ts).
  const SILENCE_RMS_THRESHOLD = 0.02;
  const SILENCE_HANGOVER_MS = 1_500;
  const lastActiveAt: Record<"A" | "B", number> = { A: 0, B: 0 };
  function frameRms(base64: string): number {
    const buf = Buffer.from(base64, "base64");
    if (buf.length < 2) return 0;
    let sumSquares = 0;
    const sampleCount = buf.length / 2;
    for (let i = 0; i < buf.length; i += 2) {
      const sample = buf.readInt16LE(i) / 0x8000;
      sumSquares += sample * sample;
    }
    return Math.sqrt(sumSquares / sampleCount);
  }
  /** true = forward this frame to Scribe; false = drop it (genuine
   * long-silence suppression, past the hangover window). */
  function shouldForwardToStt(slot: "A" | "B", base64: string): boolean {
    const now = Date.now();
    if (frameRms(base64) > SILENCE_RMS_THRESHOLD) { lastActiveAt[slot] = now; return true; }
    return now - lastActiveAt[slot] < SILENCE_HANGOVER_MS;
  }
  // Tracked at this outer scope (not just local to speak()) so a new
  // speak() call can cancel the PREVIOUS handle synchronously, before it
  // creates its own. Relying solely on AbortSignal for this would leave a
  // real race: the old generateExaminerReply() only notices abortSignal at
  // specific await points, so between currentAbort.abort() and the old call
  // actually throwing, BOTH the old and new ttsHandle would have live
  // `message` listeners on the same shared ttsConn.ws at once —
  // synchronous cancel() here removes the old listener immediately instead.
  let currentTtsHandle: ReturnType<typeof startStreamingSynthesis> | null = null;

  async function speak(trigger: Parameters<typeof generateExaminerReply>[2]) {
    if (closed) return;
    currentAbort?.abort(); // supersede whatever's in flight
    currentTtsHandle?.cancel();
    const myId = ++currentGenerationId;
    const abortCtrl = new AbortController();
    currentAbort = abortCtrl;

    try {
      const ttsHandle = startStreamingSynthesis(ttsConn, {
        onAudioChunk: (b64) => { if (myId === currentGenerationId) callbacks.onAudioChunk?.(b64); },
        onVoiceError: async (message) => {
          console.error(`[voice] TTS error for session ${examSessionId}:`, message);
          // Real voice-level failure (invalid/unavailable voice) — fall back
          // to a different voice and reconnect for the REST of the session,
          // rather than let one bad voice id break the whole exam.
          //
          // This whole body is wrapped in try/catch — a REAL, found bug: it
          // used to run unguarded, called fire-and-forget from
          // elevenLabsTts.ts's message handler with no .catch() anywhere in
          // the chain. If EITHER await below threw (e.g.
          // reassignAfterFailure() throwing "no available voices in pool"
          // once every voice has failed during a broader outage, or the
          // reconnect itself failing), it became a genuine unhandled
          // promise rejection — which crashes the ENTIRE Node process by
          // default (verified: no process.on("unhandledRejection") handler
          // existed anywhere in this package), taking down every OTHER
          // concurrent exam room on the relay, not just this one. Caught
          // during a full audit, fixed before it could happen live.
          try {
            const fresh = await voiceManager.reassignAfterFailure(examSessionId, EXAMINER_POOL, voice.voiceId);
            voice = fresh;
            try { ttsConn.close(); } catch {}
            ttsConn = await openStreamingConnection(fresh.voiceId);
          } catch (e) {
            console.error(`[voice] onVoiceError recovery itself failed for session ${examSessionId} — no further fallback voice available:`, e);
            callbacks.onError?.(e instanceof Error ? e.message : String(e));
          }
        },
      });
      currentTtsHandle = ttsHandle;
      let ttsError: unknown = null;
      ttsHandle.done.catch((e) => { ttsError = e; }); // attach immediately — see prototype's documented unhandled-rejection lesson

      let reply: string | null = null;
      let attempt = 0;
      for (;;) {
        try {
          reply = await generateExaminerReply(examCtx, history, trigger, {
            onChunk: (text) => {
              if (myId !== currentGenerationId) return;
              // HARD 7,000-char/exam ElevenLabs ceiling, enforced here, not
              // just measured — once the budget is spent, further chunks
              // for this (and any later) turn are silently dropped instead
              // of forwarded to TTS. Claude's own reasoning/history isn't
              // truncated (still recorded below), only what actually gets
              // synthesized is capped.
              const budget = elevenLabsCharBudgetRemaining();
              if (budget <= 0) {
                console.warn(`[voice] ElevenLabs ${MAX_ELEVENLABS_CHARS_PER_EXAM_ROOM}-char/exam ceiling reached for session ${examSessionId} — dropping further dynamic TTS for the rest of this exam`);
                return;
              }
              const toSend = text.length > budget ? text.slice(0, budget) : text;
              ttsCharacters += toSend.length; // real usage, counted at the exact point text is actually sent to ElevenLabs
              ttsHandle.appendText(toSend, false);
            },
            onUsage: (usage) => {
              if (myId !== currentGenerationId) return; // don't count a superseded/retried call's usage twice
              claudeInputTokens += usage.inputTokens;
              claudeOutputTokens += usage.outputTokens;
              claudeCacheCreationInputTokens += usage.cacheCreationInputTokens;
              claudeCacheReadInputTokens += usage.cacheReadInputTokens;
            },
          }, abortCtrl.signal);
          break;
        } catch (e) {
          if (e instanceof ExaminerBrainError && e.message === "aborted") { ttsHandle.cancel(); return; } // superseded — not a real error, don't surface it
          attempt++;
          if (e instanceof ExaminerBrainError && e.retryable && attempt < CLAUDE_MAX_RETRYABLE_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
            continue;
          }
          ttsHandle.cancel();
          throw e;
        }
      }
      if (myId !== currentGenerationId) { ttsHandle.cancel(); return; } // superseded mid-generation
      ttsHandle.appendText("", true);
      await ttsHandle.done.catch(() => {});
      if (ttsError) throw ttsError;

      if (reply && myId === currentGenerationId) {
        history.push({ speaker: "examiner", text: reply });
        callbacks.onOutputTranscript?.(reply);
      }
    } catch (e) {
      console.error(`[voice] speak() failed for session ${examSessionId}:`, e);
      if (myId === currentGenerationId) callbacks.onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      if (myId === currentGenerationId) { currentAbort = null; currentTtsHandle = null; }
    }
  }

  /** Drives one already-decided, exact-text utterance through TTS, skipping
   * Claude — shares the same generation-id supersession, TTS-error/voice-
   * fallback, and usage-accounting logic as speak(), just without a Claude
   * call in the middle. Used for exam_start / task_transition /
   * section_transition (examinerPhrases.ts) and as playLibraryPhrase()'s
   * fallback when no pre-generated audio exists yet for this voice. */
  async function speakScriptedText(text: string): Promise<void> {
    if (closed) return;
    // Same hard 7,000-char/exam ElevenLabs ceiling as speak()'s onChunk
    // path — scripted text is sent as one complete sentence (not streamed
    // in pieces), so truncating it mid-word would produce a broken
    // utterance; skipping entirely is the safer failure mode for exact,
    // grammatically-complete scripted text. Extremely rare in practice —
    // real measured dynamic usage for a whole exam is ~2,467 chars, well
    // under this ceiling — but enforced unconditionally, not just relied on.
    if (text.length > elevenLabsCharBudgetRemaining()) {
      console.warn(`[voice] ElevenLabs ${MAX_ELEVENLABS_CHARS_PER_EXAM_ROOM}-char/exam ceiling reached for session ${examSessionId} — skipping scripted utterance ("${text.slice(0, 40)}...") rather than exceeding it`);
      history.push({ speaker: "examiner", text });
      callbacks.onOutputTranscript?.(text);
      return;
    }
    currentAbort?.abort();
    currentTtsHandle?.cancel();
    const myId = ++currentGenerationId;

    try {
      const ttsHandle = startStreamingSynthesis(ttsConn, {
        onAudioChunk: (b64) => { if (myId === currentGenerationId) callbacks.onAudioChunk?.(b64); },
        onVoiceError: async (message) => {
          console.error(`[voice] TTS error (scripted) for session ${examSessionId}:`, message);
          // Wrapped in try/catch — see speak()'s identical onVoiceError
          // comment above for the real unhandled-rejection/process-crash
          // bug this fixes.
          try {
            const fresh = await voiceManager.reassignAfterFailure(examSessionId, EXAMINER_POOL, voice.voiceId);
            voice = fresh;
            try { ttsConn.close(); } catch {}
            ttsConn = await openStreamingConnection(fresh.voiceId);
          } catch (e) {
            console.error(`[voice] onVoiceError recovery itself failed for session ${examSessionId} — no further fallback voice available:`, e);
            callbacks.onError?.(e instanceof Error ? e.message : String(e));
          }
        },
      });
      currentTtsHandle = ttsHandle;
      let ttsError: unknown = null;
      ttsHandle.done.catch((e) => { ttsError = e; });

      ttsCharacters += text.length; // real usage — this IS a real dynamic TTS call, just Claude-free
      ttsHandle.appendText(text, true);
      await ttsHandle.done.catch(() => {});
      if (ttsError) throw ttsError;

      if (myId === currentGenerationId) {
        history.push({ speaker: "examiner", text });
        callbacks.onOutputTranscript?.(text);
      }
    } catch (e) {
      console.error(`[voice] speakScriptedText() failed for session ${examSessionId}:`, e);
      if (myId === currentGenerationId) callbacks.onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      if (myId === currentGenerationId) { currentAbort = null; currentTtsHandle = null; }
    }
  }

  // ~0.33s of pcm16@24kHz mono per chunk when streaming a pre-generated
  // library file — roughly matches the cadence of ElevenLabs' own streamed
  // chunks, so client-side playback pacing doesn't need special-casing for
  // this path vs. the live-TTS path.
  const LIBRARY_CHUNK_BYTES = 32 * 1024;

  /** Streams a pre-generated PCM file's bytes out as audio chunks — the
   * shared mechanics behind playLibraryPhrase() and playTeil1Question().
   * Claims its own generation id (superseding whatever's in flight), same
   * as every other speak-something entry point in this file. */
  async function playPcmFile(logLabel: string, absolutePath: string, spokenText: string): Promise<void> {
    if (closed) return;
    currentAbort?.abort();
    currentTtsHandle?.cancel();
    const myId = ++currentGenerationId;
    currentlyPlayingLibrary = true;
    try {
      const pcm = await readFile(absolutePath);
      if (myId !== currentGenerationId) return; // superseded while reading the file
      for (let offset = 0; offset < pcm.length; offset += LIBRARY_CHUNK_BYTES) {
        if (myId !== currentGenerationId || closed) return; // superseded or session closed mid-playback
        callbacks.onAudioChunk?.(pcm.subarray(offset, offset + LIBRARY_CHUNK_BYTES).toString("base64"));
      }
      // No ttsCharacters increment here — this is the entire point of the
      // fixed audio library: zero incremental ElevenLabs cost at runtime.
      if (myId === currentGenerationId) {
        history.push({ speaker: "examiner", text: spokenText });
        callbacks.onOutputTranscript?.(spokenText);
      }
    } catch (e) {
      console.error(`[voice] ${logLabel} failed for session ${examSessionId}:`, e);
      if (myId === currentGenerationId) callbacks.onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      if (myId === currentGenerationId) currentlyPlayingLibrary = false;
    }
  }

  async function playLibraryPhrase(category: FixedPhraseCategory): Promise<void> {
    if (closed) return;
    const found = await pickLibraryAsset(category, voice.voiceId);
    if (!found) {
      // Library not generated yet for this voice (or at all) — fall back to
      // a real dynamic-TTS reading of the same hand-written pool, so this
      // moment is never silently skipped just because
      // generate-phrase-library hasn't been run (still BLOCKED on the
      // ElevenLabs account tier — see that script's header).
      const pool = getFixedPool(category);
      const chosen = pickVariant(`library_fallback_${category}`, pool, assignPhraseStyle(voice.voiceId));
      return speakScriptedText(chosen.text);
    }
    return playPcmFile(`playLibraryPhrase(${category})`, found.absolutePath, found.asset.text);
  }

  /** Teil 1's opening move under the redesigned flow: the examiner asks ONE
   * real, pre-generated question for the candidate's topic (see
   * phraseLibrary/teil1Questions.ts) instead of reading out a topic label —
   * the candidate then does almost all of the talking. $0 ElevenLabs cost
   * once the library is generated; falls back to a real dynamic-TTS reading
   * of the same question text otherwise (never silently skipped). */
  async function playTeil1Question(topic: string): Promise<void> {
    if (closed) return;
    const found = await pickLibraryAsset("teil1_question", voice.voiceId, topic);
    if (!found) {
      const pool = getTeil1QuestionPool(topic);
      if (pool.length === 0) {
        // Real, previously-silent gap, fixed: a topic string that doesn't
        // exactly match one of the 7 configured TEIL1_TOPICS (a typo, an
        // 8th topic added to muendlich_materials later, a whitespace
        // mismatch) used to mean the examiner said NOTHING at all here —
        // dead air with no recovery. This generic, topic-agnostic prompt
        // works for ANY topic string and guarantees the candidate always
        // gets a real, speakable prompt, never silence, even in this
        // last-resort case. Logged loudly since it signals a real content
        // gap (a topic that needs its own real library questions) even
        // though the exam itself recovers gracefully.
        console.error(`[voice] playTeil1Question: no question pool for topic "${topic}" (session ${examSessionId}) — falling back to a generic prompt. Check muendlich_materials titles match teil1Questions.ts's TEIL1_TOPICS exactly, or add real questions for this topic.`);
        const generic = GENERIC_TEIL1_FALLBACK[Math.floor(Math.random() * GENERIC_TEIL1_FALLBACK.length)](topic);
        return speakScriptedText(generic);
      }
      const chosen = pickVariant(`library_fallback_teil1_question_${topic}`, pool, assignPhraseStyle(voice.voiceId));
      return speakScriptedText(chosen.text);
    }
    return playPcmFile(`playTeil1Question(${topic})`, found.absolutePath, found.asset.text);
  }

  function handleCommittedTranscript(slot: "A" | "B", text: string) {
    if (!text.trim()) return;
    history.push({ speaker: slot, text });
    callbacks.onInputTranscript?.(text, slot);

    // Organic follow-up trigger: Teil 1 only, and only while the examiner
    // isn't already mid-reply (unlike a scheduled SYSTEM trigger, an
    // organic one should never interrupt — it's a "maybe I'll say
    // something" check, not an authoritative takeover) — matches Gemini
    // Live's "listen, don't comment after every sentence" behavior (see
    // examinerBrain.ts's header for the full reasoning). Debounced so a
    // burst of short committed segments from one continuous sentence
    // doesn't fire a Claude call per segment.
    if (currentStage !== 1 || currentTtsHandle !== null || currentlyPlayingLibrary) return;
    if (organicDebounceTimer) clearTimeout(organicDebounceTimer);
    organicDebounceTimer = setTimeout(() => {
      void speak({ type: "organic", candidateSlot: slot, text });
    }, ORGANIC_TRIGGER_DEBOUNCE_MS);
  }

  async function openSlotStt(slot: "A" | "B"): Promise<SttSession | null> {
    try {
      const sttCallbacks = {
        onCommitted: (text: string) => handleCommittedTranscript(slot, text),
        onError: (msg: string) => console.error(`[voice] STT error (slot ${slot}, session ${examSessionId}) — organic triggers for this candidate may now be degraded:`, msg),
        onClose: () => console.warn(`[voice] STT connection closed (slot ${slot}, session ${examSessionId}) — organic triggers disabled for this candidate for the rest of the exam; scheduled triggers are unaffected`),
      };
      // MUENDLICH_STT_BACKEND=whisper routes candidate speech-to-text to the
      // self-hosted faster-whisper service (whisperStt.ts) instead of
      // ElevenLabs Scribe — the cost driver that actually matters at real
      // Teil-1 student-response durations (7,000-10,000 chars/candidate ≈
      // 15-22 min of speech): ElevenLabs/Google STT both cost more than the
      // entire $10/participant/month budget on their own at that duration;
      // self-hosted costs ~$0.01/exam room — see finalCostModel.mjs.
      // Defaults to ElevenLabs ("elevenlabs" or unset) for safety/backward
      // compatibility — flipping the env var is the whole migration, same
      // rollback pattern as MUENDLICH_VOICE_BACKEND.
      if (process.env.MUENDLICH_STT_BACKEND === "whisper") {
        return await openWhisperStt(sttCallbacks);
      }
      // The underlying WebSocket can report success at the transport layer
      // (ws "open") before an application-level failure (auth_error, quota,
      // etc.) arrives as a separate message a moment later and closes the
      // socket server-side — verified live: openRealtimeStt's own promise
      // resolves in that case, it does NOT reject, so this try/catch alone
      // does not catch that failure mode. sendPcm16 already no-ops safely
      // once the socket is closed (checks ws.readyState), so the exam
      // itself was already safe either way — but without an onClose
      // handler, that silent no-op was the ONLY visible symptom, making a
      // real failure indistinguishable from "candidate is just quiet" in
      // the logs. This makes it observable instead of silent.
      return await openRealtimeStt(sttCallbacks);
    } catch (e) {
      // Graceful degradation, per spec ("do not let one unavailable voice/
      // component break the entire application") — organic triggers for
      // this slot just won't fire; the app-owned scheduled triggers in
      // server.ts don't depend on STT at all and keep working normally.
      console.error(`[voice] failed to open STT for slot ${slot}, session ${examSessionId} — organic triggers disabled for this candidate:`, e);
      return null;
    }
  }

  [sttA, sttB] = await Promise.all([openSlotStt("A"), openSlotStt("B")]);
  // Deferred via setTimeout (a real macrotask), not called synchronously
  // here and not queueMicrotask either: the caller (server.ts) does
  // `room.live = await openMuendlichVoiceSession(...)`, and its very first
  // thing to do on open is call room.live.sendSystemMessage() for the
  // opening line — if onOpen fired before this function's own `return`
  // below, room.live would still be undefined at that moment (the
  // assignment only happens once THIS promise resolves) and the opening
  // line would silently no-op. A microtask isn't enough to guarantee
  // ordering here (it can still run before the caller's own await
  // continuation); a macrotask reliably runs after ALL of that has settled.
  setTimeout(() => callbacks.onOpen?.(), 0);

  return {
    sendAudioChunk(slot, base64) {
      if (!shouldForwardToStt(slot, base64)) return; // long-silence suppression — see header comment
      // Real bytes actually sent to Scribe — base64 decode gives the exact
      // PCM16 byte count, not an approximation from the string length.
      const bytes = Buffer.byteLength(base64, "base64");
      if (slot === "A") sttBytesA += bytes; else sttBytesB += bytes;
      (slot === "A" ? sttA : sttB)?.sendPcm16(base64);
    },
    getUsage() {
      const totalSttBytes = sttBytesA + sttBytesB;
      const sttMinutesTotal = totalSttBytes / STT_BYTES_PER_SAMPLE / STT_SAMPLE_RATE / 60;
      // Route real STT minutes to whichever cost bucket actually billed
      // them: MUENDLICH_STT_BACKEND=whisper never touches ElevenLabs at
      // all, so those minutes must NOT be charged as ElevenLabs STT
      // credits/dollars (computeExamCost bills sttMinutes at ElevenLabs'
      // rate unconditionally) — a real correctness bug this specifically
      // avoids, not a hypothetical one.
      const usingWhisper = process.env.MUENDLICH_STT_BACKEND === "whisper";
      return {
        ttsCharacters,
        sttMinutes: usingWhisper ? 0 : sttMinutesTotal,
        selfHostedSttMinutes: usingWhisper ? sttMinutesTotal : 0,
        claudeInputTokens, claudeOutputTokens,
        claudeCacheCreationInputTokens, claudeCacheReadInputTokens,
      };
    },
    getVoiceId() {
      return voice.voiceId;
    },
    playLibraryPhrase(category) {
      return playLibraryPhrase(category);
    },
    playTeil1Question(topic) {
      return playTeil1Question(topic);
    },
    speakScriptedText(text) {
      return speakScriptedText(text);
    },
    sendSystemMessage(text) {
      // A scheduled trigger (handoff, takeover, nudge) always wins over an
      // in-flight organic reply — speak() itself aborts whatever's running
      // before starting this one, so the candidate never hears two
      // overlapping examiner utterances. Callers (server.ts, via
      // voiceBackend.ts) pass PLAIN instruction text — the "[SYSTEM] "
      // wire-format prefix the prompt in examinerBrain.ts expects is added
      // here, not by the caller, so server.ts stays backend-agnostic.
      void speak({ type: "system", text: `[SYSTEM] ${text}` });
    },
    setStage(stage) { currentStage = stage; },
    close() {
      closed = true;
      if (organicDebounceTimer) clearTimeout(organicDebounceTimer);
      currentAbort?.abort();
      currentTtsHandle?.cancel();
      sttA?.close();
      sttB?.close();
      try { ttsConn.close(); } catch {}
    },
  };
}
