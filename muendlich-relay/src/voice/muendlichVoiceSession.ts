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
 *   chunks -> each chunk is appended to a FRESH, per-utterance ElevenLabs
 *   Flash v2.5 streaming connection (opened just for this one reply, closed
 *   right after) -> audio chunks stream back out through onAudioChunk as
 *   they arrive (progressive playback, not wait-for-the-whole-reply).
 *
 *   Deliberately NOT one persistent connection reused across the whole
 *   exam (that was the original design, and a real bug): ElevenLabs'
 *   /stream-input endpoint's "isFinal" completion signal is delivered on
 *   the shared socket with no request id, so when a call is superseded
 *   (a newer trigger arrives before the previous one's TTS finished — the
 *   normal case in a live exam) its late-arriving isFinal could be
 *   misattributed to whichever NEWER call's listener happened to be
 *   attached at that moment, silently corrupting that unrelated call's
 *   own completion signal and making the examiner go silent for the rest
 *   of the exam. Opening a dedicated socket per utterance makes that
 *   misattribution structurally impossible — a stray message can only
 *   ever reach the listener for the utterance that owns that socket. The
 *   cost is one extra WebSocket handshake per utterance (roughly once
 *   every 20-90s during an exam), which is a non-issue at this cadence.
 *
 * Organic triggers (Teil-1 presentation follow-ups) are driven by the
 * per-slot ElevenLabs STT streams' committed_transcript events — see this
 * file's header note in examinerBrain.ts for why this exists and what it
 * approximates.
 */
import { readFile } from "node:fs/promises";
import { openRealtimeStt, type SttSession } from "./elevenLabsStt.js";
import { openWhisperStt } from "./whisperStt.js";
import { openGroqStt } from "./groqStt.js";
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
  /** Cumulative committed-STT character count for one slot, since the
   * session began — server.ts snapshots this at a window's start and diffs
   * at its end to detect "this candidate said (almost) nothing real this
   * turn," rather than assuming content exists. See spokenChars's own
   * comment for why room.lastAudioAt can't be used for this instead. */
  getSpokenChars(slot: "A" | "B"): number;
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

  const history: HistoryTurn[] = [];
  // Cumulative committed-STT character count per slot — lets server.ts
  // detect "this candidate's turn produced no real transcribed speech"
  // (snapshot at a window's start, diff at its end) WITHOUT relying on
  // room.lastAudioAt/lastSenderSlot, which update unconditionally on every
  // raw "audio" websocket message (server.ts's own handler) regardless of
  // whether the frame contains real speech or silence — a continuously-
  // streaming mic (the real client's normal behavior) means that signal
  // can't distinguish "spoke the whole time" from "silent the whole time."
  // Real bug found 2026-10-04: without this, openTeil1QuestionWindow()
  // unconditionally told Claude to ask "based on what they actually said"
  // even for a candidate with zero committed transcript, and Claude
  // fabricated plausible-sounding content rather than noticing the gap.
  const spokenChars: Record<"A" | "B", number> = { A: 0, B: 0 };
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
  // Real gap found via a professional-experience audit (2026-10-03): this
  // flag used to be called currentlyPlayingLibrary and was set/cleared
  // correctly by playPcmFile(), but had ZERO readers anywhere in this file —
  // the "organic-trigger busy-check" its own comment referenced was removed
  // in an earlier round (2026-09-22/23's Teil 1 redesign, see memory) and
  // this flag was simply never cleaned up or reconnected to anything new.
  // Net effect: there was no mechanism at all suppressing a candidate's mic
  // audio from reaching STT while the examiner's own voice is actively
  // playing through their speakers — relying ENTIRELY on the browser's own
  // getUserMedia echoCancellation (useRelayAudio.ts) to stop the AI's own
  // voice from being picked back up by the candidate's mic and treated as
  // their speech. Browser-level AEC is good but never perfect (especially
  // without headphones) — this is the server-side second layer of defense.
  // Renamed + generalized to cover every speech source (speak/
  // speakScriptedText/playPcmFile — live TTS, scripted TTS, AND library
  // playback all set it), consumed by shouldForwardToStt below.
  let aiSpeaking = false;
  let aiSpeechEndedAt = 0;
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
  // Short post-speech grace window — room acoustics/speaker decay can leave
  // a faint tail of the examiner's own voice audible for a moment after
  // playback technically ends, even with echoCancellation on. Same
  // order-of-magnitude as SILENCE_HANGOVER_MS above, not a separate design.
  const AI_SPEECH_ECHO_HANGOVER_MS = 500;

  /** true = forward this frame to Scribe; false = drop it — either genuine
   * long-silence suppression (past the hangover window) or, more
   * importantly, because the examiner is CURRENTLY speaking (or just
   * finished): never let the candidate's own mic feed the AI's own voice
   * back into STT as if it were their speech. */
  // Logged only on state CHANGE (never per-frame) — cheap enough to keep
  // permanently, and useful for confirming this new mechanism is actually
  // engaging during a real exam if its behavior is ever in question later.
  let lastSuppressLogState = false;
  function shouldForwardToStt(slot: "A" | "B", base64: string): boolean {
    const now = Date.now();
    if (aiSpeaking || now - aiSpeechEndedAt < AI_SPEECH_ECHO_HANGOVER_MS) {
      if (!lastSuppressLogState) { console.log(`[echo-suppress] session ${examSessionId}: suppressing mic input while examiner speaks`); lastSuppressLogState = true; }
      return false;
    }
    if (lastSuppressLogState) { console.log(`[echo-suppress] session ${examSessionId}: resumed forwarding mic input`); lastSuppressLogState = false; }
    if (frameRms(base64) > SILENCE_RMS_THRESHOLD) { lastActiveAt[slot] = now; return true; }
    return now - lastActiveAt[slot] < SILENCE_HANGOVER_MS;
  }
  // Tracked at this outer scope (not just local to speak()) so a new
  // speak() call can cancel the PREVIOUS handle synchronously, before it
  // creates its own. Relying solely on AbortSignal for this would leave a
  // real race: the old generateExaminerReply() only notices abortSignal at
  // specific await points, so between currentAbort.abort() and the old call
  // actually throwing, the old ttsHandle could still emit audio/errors —
  // synchronous cancel() (and closing its own socket, see currentTtsConn
  // below) here stops it immediately instead of waiting for that.
  let currentTtsHandle: ReturnType<typeof startStreamingSynthesis> | null = null;
  // The CURRENT utterance's own dedicated ElevenLabs socket — see this
  // file's header comment for why this is opened fresh per call instead of
  // being one persistent, session-wide connection. Closed unconditionally
  // by whichever call opened it (in that call's own finally block) the
  // moment that utterance is done, canceled, or superseded — so a stray
  // late message from a finished/canceled utterance has no socket left to
  // arrive on, let alone a listener to misfire.
  let currentTtsConn: StreamConnection | null = null;

  async function speak(trigger: Parameters<typeof generateExaminerReply>[2]) {
    if (closed) return;
    currentAbort?.abort(); // supersede whatever's in flight
    currentTtsHandle?.cancel();
    try { currentTtsConn?.close(); } catch {}
    const myId = ++currentGenerationId;
    aiSpeaking = true; // see its own declaration comment — suppresses candidate mic forwarding for the whole duration of this call
    const abortCtrl = new AbortController();
    currentAbort = abortCtrl;
    let conn: StreamConnection | null = null;

    try {
      conn = await openStreamingConnection(voice.voiceId);
    } catch (e) {
      // Real bug found via live-testing this exact fix (2026-09-30): a
      // connection-level failure here — including a handshake timeout, see
      // elevenLabsTts.ts's CONNECT_TIMEOUT_MS — used to fall through to the
      // outer catch below and call callbacks.onError, which server.ts wires
      // to a FATAL path ending the exam for BOTH real candidates. This exact
      // "transient network blip = fatal" pattern was already fixed in the
      // sibling tutorVoiceSession.ts on 2026-09-29 but never ported here —
      // the live exam room, unlike the tutor, kept the fatal behavior this
      // whole time. Treated the same way now: a recoverable, per-utterance
      // blip, not a reason to end an otherwise-fine paying exam.
      console.warn(`[voice] connection failed for session ${examSessionId}, skipping this utterance:`, e instanceof Error ? e.message : e);
      if (myId === currentGenerationId) { currentAbort = null; aiSpeaking = false; aiSpeechEndedAt = Date.now(); }
      return;
    }

    try {
      if (closed || myId !== currentGenerationId) { try { conn.close(); } catch {} return; } // session closed or superseded while connecting
      currentTtsConn = conn;
      const ttsHandle = startStreamingSynthesis(conn, {
        onAudioChunk: (b64) => { if (myId === currentGenerationId) callbacks.onAudioChunk?.(b64); },
        onVoiceError: async (message) => {
          console.error(`[voice] TTS error for session ${examSessionId}:`, message);
          // Real voice-level failure (invalid/unavailable voice) — fall back
          // to a different voice for every FUTURE utterance, rather than
          // let one bad voice id break the whole exam. This utterance's own
          // connection is already doomed either way; there's nothing to
          // reconnect here since each call owns (and closes) only its own
          // socket now.
          //
          // Wrapped in try/catch — a REAL, found bug: it used to run
          // unguarded, called fire-and-forget from elevenLabsTts.ts's
          // message handler with no .catch() anywhere in the chain. If the
          // await below threw (e.g. reassignAfterFailure() throwing "no
          // available voices in pool" once every voice has failed during a
          // broader outage), it became a genuine unhandled promise
          // rejection — which crashes the ENTIRE Node process by default
          // (verified: no process.on("unhandledRejection") handler existed
          // anywhere in this package), taking down every OTHER concurrent
          // exam room on the relay, not just this one. Caught during a full
          // audit, fixed before it could happen live.
          try {
            const fresh = await voiceManager.reassignAfterFailure(examSessionId, EXAMINER_POOL, voice.voiceId);
            voice = fresh;
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
      // Same reasoning as the connection-open failure branch above: a post-
      // connection TTS failure is a recoverable per-utterance blip, not a
      // reason to end the whole exam. Reserve escalation to callbacks.onError
      // for a genuinely unrecoverable case (onVoiceError's own recovery
      // attempt failing, handled separately above) rather than every
      // single-utterance error.
      console.error(`[voice] speak() failed for session ${examSessionId}, skipping this utterance:`, e);
    } finally {
      // Always close the connection THIS call opened, whether it finished,
      // errored, or was superseded — it's this call's alone, never shared.
      if (conn) { try { conn.close(); } catch {} }
      // Only clear the shared "current" pointers if nothing newer has
      // already taken over (a superseding call already reset these to its
      // own objects before this call's awaits ever settled).
      if (myId === currentGenerationId) { currentAbort = null; currentTtsHandle = null; currentTtsConn = null; aiSpeaking = false; aiSpeechEndedAt = Date.now(); }
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
    // grammatically-complete scripted text. CORRECTED 2026-10-03: the old
    // "~2,467 chars/exam, well under this ceiling" estimate here was based
    // on simulateFullExam.mjs's synthetic short test topics, not real
    // muendlich_materials rows — Teil 2's real body_text alone measures up
    // to ~2,900 chars (DB-verified). That specific risk is now closed
    // (server.ts's section-transition calls speak the material TITLE only,
    // never body_text), but this ceiling check stays unconditional rather
    // than relying on any specific "typical" usage figure.
    if (text.length > elevenLabsCharBudgetRemaining()) {
      console.warn(`[voice] ElevenLabs ${MAX_ELEVENLABS_CHARS_PER_EXAM_ROOM}-char/exam ceiling reached for session ${examSessionId} — skipping scripted utterance ("${text.slice(0, 40)}...") rather than exceeding it`);
      history.push({ speaker: "examiner", text });
      callbacks.onOutputTranscript?.(text);
      return;
    }
    currentAbort?.abort();
    currentTtsHandle?.cancel();
    try { currentTtsConn?.close(); } catch {}
    const myId = ++currentGenerationId;
    aiSpeaking = true; // see its own declaration comment — suppresses candidate mic forwarding for the whole duration of this call
    let conn: StreamConnection | null = null;

    try {
      conn = await openStreamingConnection(voice.voiceId);
    } catch (e) {
      // Same reasoning as speak()'s identical connection-failure branch — a
      // recoverable, per-utterance blip (including a handshake timeout), not
      // a fatal session error. Unlike speak(), we already know the exact
      // text here, so it's still recorded to the transcript (audio just
      // didn't make it this time) — same convention as the char-budget-
      // ceiling branch above.
      console.warn(`[voice] connection failed for session ${examSessionId}, skipping this scripted utterance's audio:`, e instanceof Error ? e.message : e);
      if (myId === currentGenerationId) {
        currentAbort = null;
        aiSpeaking = false; aiSpeechEndedAt = Date.now();
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
          console.error(`[voice] TTS error (scripted) for session ${examSessionId}:`, message);
          // Wrapped in try/catch — see speak()'s identical onVoiceError
          // comment above for the real unhandled-rejection/process-crash
          // bug this fixes.
          try {
            const fresh = await voiceManager.reassignAfterFailure(examSessionId, EXAMINER_POOL, voice.voiceId);
            voice = fresh;
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
      // Same fix as speak()'s identical catch block, same reasoning — a
      // post-connection TTS failure is a recoverable per-utterance blip, not
      // a reason to end the whole exam. We already know the exact text here,
      // so it's still recorded to the transcript (audio just didn't make it
      // this time) — same convention as the connection-failure branch above.
      console.error(`[voice] speakScriptedText() failed for session ${examSessionId}, skipping this utterance's audio:`, e);
      if (myId === currentGenerationId) {
        history.push({ speaker: "examiner", text });
        callbacks.onOutputTranscript?.(text);
      }
    } finally {
      if (conn) { try { conn.close(); } catch {} }
      if (myId === currentGenerationId) { currentAbort = null; currentTtsHandle = null; currentTtsConn = null; aiSpeaking = false; aiSpeechEndedAt = Date.now(); }
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
    try { currentTtsConn?.close(); } catch {}
    currentTtsConn = null;
    const myId = ++currentGenerationId;
    aiSpeaking = true; // see its own declaration comment — suppresses candidate mic forwarding for the whole duration of this call
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
      // Same "one utterance's failure shouldn't end the exam" philosophy as
      // speak()/speakScriptedText() above — a local pre-generated audio file
      // failing to read (missing/corrupted asset) is rare, but still just
      // one line's audio, not a reason to end an otherwise-fine paying exam.
      console.error(`[voice] ${logLabel} failed for session ${examSessionId}, skipping this utterance's audio:`, e);
    } finally {
      if (myId === currentGenerationId) { aiSpeaking = false; aiSpeechEndedAt = Date.now(); }
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
    spokenChars[slot] += text.trim().length;
    callbacks.onInputTranscript?.(text, slot);

    // Organic follow-up trigger: PERMANENTLY DISABLED as of the Teil 1
    // redesign (deterministic 90s presentation cap -> EXACTLY 2 questions ->
    // 30s answer window each, code-driven via server.ts's tick()/
    // openTeil1QuestionWindow). This used to be Teil 1's ONLY question-
    // asking mechanism ("Teil 1 only", gated on currentStage===1) — asking
    // Claude, on every committed transcript segment, whether now looks like
    // a good moment for a follow-up. That is now a direct conflict, not just
    // a redundancy: currentStage stays 1 through Teil 1's new q1/q2 answer
    // windows too (this module has no visibility into server.ts's finer-
    // grained presenting/q1/q2 phase), so the old gate would have ALSO fired
    // while a candidate was mid-ANSWER to the code-driven Q1/Q2 — a real bug
    // caught in review before ever running live: Claude could have asked a
    // 3rd/4th organic question on top of the mandated exactly-2. Gemini
    // Live's equivalent never had this risk (a plain system-prompt paragraph
    // telling it to only react to [SYSTEM] cues, no separate STT-driven
    // trigger of its own). Teil 1 no longer has ANY phase where "listen and
    // decide for yourself" is correct — every question is now explicitly
    // cued by openTeil1QuestionWindow() — so this is disabled outright
    // rather than re-scoped. ExaminerTrigger's "organic" variant and
    // SILENCE_TOKEN in examinerBrain.ts are now unreachable dead code, left
    // in place rather than removed across both files in this same pass.
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
      // MUENDLICH_STT_BACKEND=groq: Groq-hosted Whisper (~$0.04/hr) — the
      // cheapest STT that needs no GPU infra of our own; see groqStt.ts.
      if (process.env.MUENDLICH_STT_BACKEND === "groq") {
        return await openGroqStt(sttCallbacks);
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
      const sttBackend = process.env.MUENDLICH_STT_BACKEND;
      const usingWhisper = sttBackend === "whisper";
      const usingGroq = sttBackend === "groq";
      return {
        ttsCharacters,
        sttMinutes: usingWhisper || usingGroq ? 0 : sttMinutesTotal,
        selfHostedSttMinutes: usingWhisper ? sttMinutesTotal : 0,
        groqSttMinutes: usingGroq ? sttMinutesTotal : 0,
        claudeInputTokens, claudeOutputTokens,
        claudeCacheCreationInputTokens, claudeCacheReadInputTokens,
      };
    },
    getVoiceId() {
      return voice.voiceId;
    },
    getSpokenChars(slot) {
      return spokenChars[slot];
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
      //
      // Utterance-buffering STT backends (Groq/Whisper) hold up to ~12s of the
      // candidate's most recent speech un-transcribed; flush it first so the
      // examiner's reply is grounded on what was JUST said (typically ~0.5-1s
      // extra). Streaming ElevenLabs STT has no flush(), so that path stays
      // synchronous exactly as before.
      const pendingFlushes = [sttA, sttB].map((s) => s?.flush?.()).filter((f): f is Promise<void> => !!f);
      const sendIt = () => { void speak({ type: "system", text: `[SYSTEM] ${text}` }); };
      if (pendingFlushes.length === 0) sendIt();
      else void Promise.allSettled(pendingFlushes).then(sendIt);
    },
    setStage(stage) { currentStage = stage; },
    close() {
      closed = true;
      if (organicDebounceTimer) clearTimeout(organicDebounceTimer);
      currentAbort?.abort();
      currentTtsHandle?.cancel();
      sttA?.close();
      sttB?.close();
      try { currentTtsConn?.close(); } catch {}
    },
  };
}
