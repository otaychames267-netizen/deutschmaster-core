/**
 * server.ts — Room 2 audio relay. Persistent process (Fly.io), NOT the main
 * Vercel app. Each WebSocket connection is one student, scoped to one room.
 * When both participants of a room are connected, opens ONE shared voice
 * session for that room (via voiceBackend.ts — either Gemini Live, or
 * Claude + ElevenLabs v3, selected by MUENDLICH_VOICE_BACKEND) and bridges
 * audio both directions. This file itself doesn't know or care which
 * backend is active — see voiceBackend.ts for that switch.
 *
 * Also hosts a SEPARATE, additive `/tutor/:sessionId` path for the 1:1 AI
 * Voice Tutor (structured Teil-1 speaking practice, examiner persona only in
 * this first build pass — see tutorVoiceSession.ts/tutorBrain.ts) — see the
 * "AI Voice Tutor" sections below. It shares this process/port but has its
 * own session map, its own session opener (always Claude+ElevenLabs, NOT
 * Gemini Live — tutorGeminiLive.ts is left in place unused as a fallback;
 * see tutorVoiceSession.ts's header for why), and its own daily-cap RPCs;
 * it never touches `rooms`/`RoomSession` or any exam-only table/RPC.
 *
 * Unlike the exam room (client creates a muendlich_rooms row, THEN connects),
 * the tutor's session row is created by the STUDENT'S OWN client the moment
 * their Teil 1 topic choice is locked in (voice_tutor_sessions, RLS insert-
 * own-row) — the relay only ever opens/updates a session that already
 * exists, it never creates one from a bare scenario id.
 *
 * Protocol (JSON text frames), exam room (`/room/:roomId`):
 *   client -> relay: { type: "audio", data: "<base64 pcm16 16kHz>" }
 *                     { type: "repeat" }                         ("Wie bitte?", capped at MAX_REPEAT_USES PER STAGE — resets each Teil, see startStage())
 *                     { type: "ping", t }                        (app-level latency probe, echoed straight back)
 *   relay -> client: { type: "pong", t }
 *                     { type: "ready" }
 *                     { type: "stage", stage: 1|2|3, seconds }
 *                     { type: "intermission", seconds }          (15s breather before the next stage / before finishing)
 *                     { type: "nudge" }                          (AI is taking over after a silence timeout — for a toast, not authoritative)
 *                     { type: "repeat_ack", remaining }
 *                     { type: "repeat_denied" }
 *                     { type: "audio", data: "<base64 pcm16 24kHz>" }
 *                     { type: "transcript", speaker: "examiner"|"A"|"B", text }
 *                     { type: "finished" }
 *                     { type: "terminated", reason }             (reason "insufficient_minutes" also covers the pre-flight matchmaking guard)
 *
 * Protocol, AI Voice Tutor (`/tutor/:sessionId`) — Teil 1 then Teil 2 in this
 * build (Teil 3, AI-as-study-partner, is a later pass): Teil 1 is the exam's
 * own deterministic presentation+Q&A spec (90s presentation, exactly 2
 * questions, 30s answer window each) for one student against an AI
 * examiner; Teil 2 hands off straight into examiner-led continuous Q&A on a
 * shared topic, time-boxed rather than a fixed question count:
 *   client -> relay: { type: "audio", data: "<base64 pcm16 16kHz>" }
 *                     { type: "ping", t }
 *   relay -> client: { type: "pong", t }
 *                     { type: "ready", sessionId }
 *                     { type: "cap_status", secondsRemaining }    (sent at session start and after each minute-tick — a visible, server-authoritative countdown for money-metered practice time; the exam has no equivalent since it hard-stops silently)
 *                     { type: "audio", data: "<base64 pcm16 24kHz>" }
 *                     { type: "transcript", speaker: "examiner"|"student", text }
 *                     { type: "teil1_complete" }                  (informational milestone only — the session keeps running, Teil 2 starts right after)
 *                     { type: "stage", stage: 2, seconds }         (Teil 2 begins — mirrors the exam's own stage message shape)
 *                     { type: "session_complete" }                 (Teil 2's time budget spent — the whole session ends here, cleanly, not an error)
 *                     { type: "terminated", reason }              (reason "daily_cap_exceeded" is tutor-specific; "budget_exceeded"/"ai_error"/"idle_timeout" are shared concepts with the exam)
 *
 * Exam stage timing mirrors Room 1's already-proven prep timer pattern
 * (timestamp + duration written to the DB, client syncs via clock offset) —
 * exam_stage/exam_stage_started_at/exam_stage_seconds on muendlich_rooms.
 * Teil 1 = 5 min (deterministic per-candidate: 90s presentation, hard-capped,
 * then EXACTLY 2 questions with a 30s answer window each — see
 * TEIL1_PRESENTATION_SECONDS/TEIL1_ANSWER_WINDOW_SECONDS below and the
 * 3-phase state machine in tick(), NOT the old single-handoff design this
 * comment used to describe); Teil 2 = 6 min (natural discussion for the
 * first ~4 min, then AI takeover to direct alternating questioning for the
 * rest); Teil 3 = 6 min (free joint planning for the first ~4 min, then the
 * AI becomes an active moderator for the rest).
 *
 * KNOWN SIMPLIFICATIONS (documented, not hidden — each needs real human audio
 * testing to tune correctly, which cannot be done blind):
 *   - Speaker attribution for input transcripts uses a "last sender before
 *     this transcript arrived" heuristic, not true diarization.
 *   - Reconnect grace window (30s) is implemented; the spec's "AI seamlessly
 *     plays both partner AND examiner" behavior on permanent disconnect is
 *     NOT implemented yet — deep prompt-engineering problem, needs live tuning.
 *   - No jitter buffer / crosstalk audio-bleed defense yet.
 *   - Anti-silence thresholds (4s Teil 2, 10s Teil 3) and the Teil-2 takeover
 *     instruction are implemented as designed, but how natural the AI's
 *     intervention actually feels can only be judged by real human testing.
 */
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { openVoiceBackend, activeVoiceBackend, type VoiceBackendSession } from "./voiceBackend.js";
import { openTutorVoiceSession, type TutorVoiceSession } from "./voice/tutorVoiceSession.js";
import type { TutorContext } from "./voice/tutorBrain.js";
import { generateMuendlichEvaluation } from "./muendlich-evaluator.js";
import { pickExamStart, pickTaskTransition, pickSectionTransition12, pickSectionTransition23, pickEarlyEnd } from "./examinerPhrases.js";
import { pickTeil1ToTeil2, pickTeil2ToTeil3, pickSessionEnd } from "./tutorPhrases.js";
import { checkCreditBudget, recordExamUsage, recordTutorUsage } from "./voice/creditBudget.js";

// Process-level safety net — real finding from a full failure-handling
// audit: no such handler existed anywhere in this package before, and a
// real, now-fixed bug (an unguarded async onVoiceError callback in
// muendlichVoiceSession.ts) could turn ONE room's transient ElevenLabs
// failure into an unhandled rejection that, by Node's default behavior,
// crashes the ENTIRE process — taking down every OTHER concurrent exam
// room on this relay instance, not just the failing one. That specific bug
// is fixed at its source; this is defense-in-depth for anything similar
// that isn't found yet. Logging and continuing is the correct, documented
// response for unhandledRejection specifically (unlike uncaughtException,
// which Node's own docs say leaves process state genuinely undefined —
// deliberately NOT swallowed here, only logged loudly, since blindly
// continuing after a synchronous crash risks worse, silent corruption
// across all rooms).
process.on("unhandledRejection", (reason) => {
  console.error("[server] UNHANDLED REJECTION (would have crashed the whole relay before this safety net existed):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] UNCAUGHT EXCEPTION — process state may now be inconsistent, but staying up rather than killing every concurrent exam room:", err);
});

const PORT = Number(process.env.PORT ?? 8787);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// The exam room's OWN backend is still switchable (MUENDLICH_VOICE_BACKEND) —
// GEMINI_API_KEY is only required when that's actually "gemini". The AI
// Voice Tutor, however, always talks to Claude+ElevenLabs regardless of that
// setting (see tutorVoiceSession.ts's header for why: Gemini Live is the
// currently-broken backend on this account), so ANTHROPIC_API_KEY/
// ELEVENLABS_API_KEY are unconditionally required now — the tutor needs them
// even on days the exam room itself is running on Gemini.
const requiredEnv: Record<string, string | undefined> = {
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
};
if (activeVoiceBackend() === "gemini") {
  requiredEnv.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
}
for (const [k, v] of Object.entries(requiredEnv)) {
  if (!v) throw new Error(`Missing required env var: ${k}`);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CREDIT_TICK_MS = 60_000; // deduct 1 minute per elapsed minute of Room 2 time
const RECONNECT_GRACE_MS = 30_000;
const TICK_MS = 1_000; // stage-timer + anti-silence check cadence
// Overridable via env for fast local/CI testing (real exam durations by
// default — do NOT change these in production without updating the spec).
// Teil 1 structure (explicit product spec, not a loose timer): each
// candidate gets a hard-capped 90s presentation, then EXACTLY 2 questions
// about it, each with a hard-capped 30s answer window — 90 + 30 + 30 = 150s
// per candidate, 300s (5 min) total for both. This REPLACES the previous
// "120s combined slot, 1-2 questions at the model's own judgment" design —
// deterministic and code-enforced, same pattern as Teil 2's takeover
// windows below, not just a prompt-level suggestion the model might not
// follow consistently (a real gap found in review: nothing previously
// verified the model actually asked only 1-2 questions or stayed within any
// per-candidate time budget at all).
const TEIL1_PRESENTATION_SECONDS = Number(process.env.MUENDLICH_TEIL1_PRESENTATION_SECONDS ?? 90);
const TEIL1_ANSWER_WINDOW_SECONDS = Number(process.env.MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS ?? 30);
const TEIL1_QUESTIONS_PER_CANDIDATE = 2;
const STAGE_SECONDS: Record<1 | 2 | 3, number> = {
  1: Number(process.env.MUENDLICH_STAGE1_SECONDS ?? 2 * (TEIL1_PRESENTATION_SECONDS + TEIL1_QUESTIONS_PER_CANDIDATE * TEIL1_ANSWER_WINDOW_SECONDS)), // 300s = 2 x (90 + 2x30)
  2: Number(process.env.MUENDLICH_STAGE2_SECONDS ?? 360), // ~4min natural dialogue + ~2min AI-facilitated takeover
  3: Number(process.env.MUENDLICH_STAGE3_SECONDS ?? 360), // ~3:30-4:00 natural planning + ~2min AI-moderated completion
};
const TEIL2_TAKEOVER_AT_SEC = Number(process.env.MUENDLICH_TEIL2_TAKEOVER_SEC ?? 240); // 4 minutes into Teil 2
// Once the scheduled takeover begins, each direct question gets a hard-capped
// response window — long enough for a real B2 answer, short enough that a
// silent or rambling candidate can't stall the whole segment.
const TEIL2_RESPONSE_WINDOW_MS = Number(process.env.MUENDLICH_TEIL2_RESPONSE_WINDOW_MS ?? 30_000);
// Teil 3 does NOT get a Teil-2-style structured takeover — candidates keep
// doing the actual planning throughout. This mark only fires a one-shot
// signal telling the AI to become a more actively involved moderator
// (identify unresolved points, work toward a real conclusion); it never
// hands over to a rigid alternating-turn interview like Teil 2's.
const TEIL3_COMPLETION_AT_SEC = Number(process.env.MUENDLICH_TEIL3_COMPLETION_SEC ?? 240); // ~4 minutes into Teil 3
// Both marks above are hard wall-clock cutoffs with no awareness of whether a
// candidate is mid-sentence right at that instant. Rather than build real
// speech-boundary detection, reuse the lastAudioAt tracking that already
// exists: if audio arrived recently, treat that as "still actively engaged"
// and hold a few more ticks for a natural pause instead of cutting someone
// off mid-word/mid-thought — but only up to a hard cap, so this can never
// meaningfully eat into the other candidate's own turn. The active-speech
// window is deliberately shorter than SILENCE_THRESHOLD_MS below (which
// tolerates a full thinking-pause as "not stalled") — otherwise the grace
// period would end up firing at its hard cap for almost every candidate
// instead of the rare one who's genuinely still mid-thought at the mark.
const HANDOFF_ACTIVE_SPEECH_MS = Number(process.env.MUENDLICH_HANDOFF_ACTIVE_SPEECH_MS ?? 4_000);
const HANDOFF_MAX_GRACE_MS = Number(process.env.MUENDLICH_HANDOFF_GRACE_MS ?? 15_000);
// Teil 1 gets a longer threshold than Teil 2 — a candidate collecting their
// thoughts mid-presentation is normal, unlike a stalled back-and-forth
// discussion. Teil 3's 5s is deliberately the tightest of the three (per
// explicit spec): dead air during a live joint-planning task reads as a
// stalled negotiation faster than during free discussion, and unlike Teil 2
// this same threshold stays the sole silence authority for the ENTIRE stage,
// including the post-completion-mark moderation phase — never suppressed.
const SILENCE_THRESHOLD_MS: Record<1 | 2 | 3, number> = { 1: 8_000, 2: 4_000, 3: 5_000 };
const NUDGE_DEBOUNCE_MS = 8_000;
const INTERMISSION_SECONDS = Number(process.env.MUENDLICH_INTERMISSION_SECONDS ?? 15);
const MAX_REPEAT_USES = 2;
// Hard idle-close: intentionally longer than every SILENCE_THRESHOLD_MS above,
// so the existing per-Teil nudge always gets a chance to re-engage the room
// first — this only fires if the nudge(s) themselves also go unanswered for
// the full window (both participants silent, not just one).
const HARD_IDLE_CLOSE_MS = Number(process.env.MUENDLICH_HARD_IDLE_MS ?? 45_000);
// Rough Gemini Live audio-token estimate for the global cost cap — the Live
// API doesn't expose per-request token counts the way REST generateContent
// calls do, so usage is approximated at session-end from elapsed minutes.
// This is an approximation, not exact billing telemetry.
const GEMINI_AUDIO_TOKENS_PER_MINUTE = Number(process.env.GEMINI_AUDIO_TOKENS_PER_MINUTE ?? 3840);

// AI Voice Tutor — its own spec, deliberately DIFFERENT from the real exam's
// (2/30s): a practice tool can afford to be more thorough per session than
// the actual timed exam has room for, per the owner's explicit numbers
// (2026-09-29). Reuses TEIL1_PRESENTATION_SECONDS (90s — same value) plus
// SILENCE_THRESHOLD_MS[1]/HANDOFF_ACTIVE_SPEECH_MS/HANDOFF_MAX_GRACE_MS/
// CREDIT_TICK_MS/TICK_MS directly from the exam's own constants (see
// tutorTick()) — those are generic timing/cadence knobs with no reason to
// diverge; the per-Teil question counts/answer windows below, and the
// tutor's own hard-idle-close margin further down, are genuinely
// tutor-specific.
const TUTOR_TEIL1_QUESTIONS = Number(process.env.MUENDLICH_TUTOR_TEIL1_QUESTIONS ?? 3);
const TUTOR_TEIL1_ANSWER_WINDOW_SECONDS = Number(process.env.MUENDLICH_TUTOR_TEIL1_ANSWER_WINDOW_SECONDS ?? 40);
// Teil 2 is a FIXED question count here (unlike the real exam's time-boxed
// candidate discussion + late takeover) — there's no second candidate to
// discuss with, so the examiner leads the whole thing, same structural
// pattern as Teil 1's exactly-N just with a bigger N.
const TUTOR_TEIL2_QUESTIONS = Number(process.env.MUENDLICH_TUTOR_TEIL2_QUESTIONS ?? 6);
const TUTOR_TEIL2_ANSWER_WINDOW_SECONDS = Number(process.env.MUENDLICH_TUTOR_TEIL2_ANSWER_WINDOW_SECONDS ?? 40);
// Teil 3: the AI plays an active study-partner role (see tutorBrain.ts's
// buildTeil3Prompt) for a fixed number of conversational turns, same pattern
// again. "Answer window" here bounds the STUDENT's response to each of the
// partner's turns, same mechanic as Teil 1/2 even though the content is a
// negotiation, not a formal question.
const TUTOR_TEIL3_TURNS = Number(process.env.MUENDLICH_TUTOR_TEIL3_TURNS ?? 5);
const TUTOR_TEIL3_ANSWER_WINDOW_SECONDS = Number(process.env.MUENDLICH_TUTOR_TEIL3_ANSWER_WINDOW_SECONDS ?? 40);
// Real bug found via live full-timing testing (2026-09-29): the exam's own
// HARD_IDLE_CLOSE_MS (45s) was tuned against ITS answer windows (30s — see
// TEIL1_ANSWER_WINDOW_SECONDS), leaving a comfortable 15s margin. The tutor's
// windows are 40s (owner spec), which shared the SAME 45s ceiling — only 5s
// of margin, too tight to survive normal TTS synthesis time for a long Teil
// 2/3 topic announcement (some muendlich_materials rows embed a full
// newspaper-article body_text, see MAX_ELEVENLABS_CHARS_PER_SESSION's
// comment) plus any brief network hiccup, let alone a student who
// legitimately takes close to the full window to respond. Own, more
// generous threshold instead of reusing the exam's.
const TUTOR_HARD_IDLE_CLOSE_MS = Number(process.env.MUENDLICH_TUTOR_HARD_IDLE_MS ?? 90_000);

interface Participant {
  userId: string;
  slot: "A" | "B";
  ws: WebSocket;
  accessToken: string;
}

interface RoomSession {
  roomId: string;
  participants: Map<string, Participant>; // userId -> participant
  live?: VoiceBackendSession;
  examSessionId?: string;
  lastSenderSlot: "A" | "B" | null;
  lastAudioAt: number; // room-wide: max(lastAudioAtBySlot.A, lastAudioAtBySlot.B) — silence-trigger condition unchanged
  // Per-candidate breakdown of the same signal — lets a stage-specific nudge
  // message name WHICH candidate has actually been quieter for longer,
  // instead of leaving that entirely to the model's own inference.
  lastAudioAtBySlot: Record<"A" | "B", number>;
  lastNudgeAt: number;
  examStage: 1 | 2 | 3 | null;
  examStageStartedAt: number;
  // Teil 1's full deterministic state machine: which candidate is currently
  // "up" and which sub-phase they're in. "presenting" = the 90s presentation
  // cap is running; "q1"/"q2" = a 30s answer-window is open for that
  // question number. Replaces the old single teil1HandoffSent boolean +
  // wall-clock-midpoint design (see TEIL1_PRESENTATION_SECONDS's comment).
  teil1Speaker: "A" | "B";
  teil1Phase: "presenting" | "q1" | "q2";
  teil1PhaseStartedAt: number;
  // QA tripwire, not exam logic: counts how many times openTeil1QuestionWindow
  // actually fired per candidate. The state machine's own phase enum
  // (presenting -> q1 -> q2, no other path) already makes >2 structurally
  // impossible today, but this catches it anyway the moment a future edit to
  // tick() ever breaks that invariant — cheap insurance, not a new
  // constraint, so it only ever logs, never blocks or alters scoring.
  teil1QuestionsAsked: Record<"A" | "B", number>;
  // Teil 2's candidate<->candidate discussion is the default; "takeover" is
  // the scheduled, code-driven, alternating direct-questioning phase entered
  // once near the ~4min mark (see tick()). This is deliberately separate from
  // the generic anti-silence nudge below, which still independently handles
  // an EARLY conversation stall (before the scheduled mark) as a lightweight,
  // one-shot re-engagement nudge — not a mode change — so it can naturally
  // step back once the candidates resume talking to each other.
  teil2Mode: "natural" | "takeover";
  teil2TakeoverTurn: "A" | "B" | null; // whose response window is currently open
  teil2TakeoverWindowOpenedAt: number;
  teil2TakeoverWindowEndsAt: number;
  // Teil 3 has no analogous "mode" — candidates keep planning throughout;
  // this just tracks whether the one-shot ~4min "be a more active moderator"
  // signal has already been sent, so it never fires twice.
  teil3CompletionSignalSent: boolean;
  repeatCount: number;
  intermissionUntil: number | null;
  pendingNextStage: 1 | 2 | 3 | null;
  creditTick?: NodeJS.Timeout;
  mainTick?: NodeJS.Timeout;
  disconnectTimers: Map<string, NodeJS.Timeout>;
  finishing: boolean;
  ended: boolean;
  // Set the instant a Gemini Live error fires — checked at the start of the
  // credit tick so a tick already scheduled can't charge for a minute the
  // session couldn't actually deliver.
  voiceBackendErrored: boolean;
  // When the Gemini Live session actually opened — used to approximate token
  // usage for the global cost-cap ledger at session end.
  liveSessionStartedAt: number | null;
  // Set once from fetchRoomContext() when the live session opens — reused at
  // finishExam() so the post-exam evaluator grades against the same CEFR
  // level the exam itself ran at, instead of a hardcoded standard.
  examLevel?: "B1" | "B2";
}

const rooms = new Map<string, RoomSession>();

// --- AI Voice Tutor session state ------------------------------------------
// Deliberately its OWN map/type, never RoomSession/rooms — a 1:1 tutor
// session has no slots, no participants Map, no Teil-stage machinery, and
// shoehorning it into RoomSession's 2-candidate shape would mean stubbing
// out most of that type's fields for no benefit. Nothing below touches
// `rooms` or any RoomSession field.
interface TutorSession {
  sessionId: string; // voice_tutor_sessions.id — created by the STUDENT'S OWN client before connecting, see the file header
  userId: string;
  accessToken: string;
  ws: WebSocket;
  live?: TutorVoiceSession;
  level: "TELC_B1" | "TELC_B2";
  lastAudioAt: number;
  // Which Teil is currently driving tutorTick() — see tutorTickTeil1()/
  // tutorTickTeil2() below. Starts at 1; startTutorTeil2() advances it once,
  // never back.
  teilStage: 1 | 2 | 3;
  // True for the whole (async, multi-await) duration of startTutorTeil2() —
  // a REAL race found via live testing: teilStage flips to 2 synchronously,
  // but teil2StartedAt/teil2QuestionStartedAt aren't set until AFTER the
  // scripted transition line finishes speaking (a real await, seconds
  // later). Without this guard, a tutorTick() firing in that window sees
  // teilStage===2 with teil2StartedAt still at its 0 init value —
  // `now - 0` reads as a multi-decade elapsed time, so Teil 2 (and the
  // whole session) was seen as instantly "overdue" and wrapped up before a
  // single question had actually been asked. Checked first in tutorTick(),
  // before either Teil's own logic runs.
  advancingStage: boolean;
  // Teil 1 only: whether we're still in the 90s presentation, or past it and
  // into the fixed-question phase. Teil 2/3 skip "presenting" entirely — they
  // start directly in the question/turn loop below.
  teil1Phase: "presenting" | "questions";
  // Generic across ALL THREE Teile once past Teil 1's presentation: which
  // question/turn number is currently open (1-based) and when ITS OWN answer
  // window started. Reset to 1/now at the start of each new Teil (see
  // startTutorTeil2()/startTutorTeil3()) — one shared pair instead of a
  // separate near-duplicate per Teil, since the "N fixed questions, each
  // with its own answer window" structure is now identical for all three,
  // just with different N/window-length constants (TUTOR_TEIL1_*/
  // TUTOR_TEIL2_*/TUTOR_TEIL3_*).
  questionIndex: number;
  phaseStartedAt: number;
  // Formatted like teil1Topic (set once, at connection time, from the
  // session's teil2_material_id/teil3_material_id — both required to
  // connect at all, since this build always runs Teil 1 -> 2 -> 3 straight
  // through).
  teil2Topic: string;
  teil3Topic: string;
  creditTick?: NodeJS.Timeout;
  mainTick?: NodeJS.Timeout; // Teil-1/2 phase machine + idle check, same TICK_MS cadence as the exam's tick()
  liveSessionStartedAt: number | null;
  ended: boolean;
  voiceBackendErrored: boolean;
}
const tutorSessions = new Map<string, TutorSession>(); // keyed by sessionId

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function broadcast(room: RoomSession, msg: unknown) {
  for (const p of room.participants.values()) send(p.ws, msg);
}

async function userScopedClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}

/** Selected-title -> "title (guiding points)" for the system prompt, so the
 * AI knows what a candidate's chosen topic is actually meant to cover — falls
 * back to the bare title if the material row (or its body_text) is missing.
 * Was Teil-1-only; Teil 2/3 previously reached the model as a bare title with
 * none of muendlich_materials' body_text guidance, which is exactly the
 * "know the exact active topic, not just its name" context Teil 2 in
 * particular needs to judge on-topic vs off-topic relevance well. */
function formatTopic(title: string | undefined, materials: { title: string; body_text: string | null }[] | null | undefined): string {
  if (!title) return "(kein Thema ausgewählt)";
  const m = materials?.find((x) => x.title === title);
  return m?.body_text ? `${title} (${m.body_text})` : title;
}

/** Pure resolution of raw muendlich_selections rows into the per-Teil topic
 * strings the exam prompt needs — pulled out of fetchRoomContext() so it can
 * be exercised directly by a test without a live Supabase round trip. Mirrors
 * exactly what the client's own preview panel does (title-string lookup
 * against muendlich_materials, no separate id/FK involved on either side). */
function resolveSelections(
  selections: { teil: number; slot: string | null; value: string }[] | null | undefined,
  materialsByTeil: Record<1 | 2 | 3, { title: string; body_text: string | null }[] | null | undefined>,
): { teil1TopicA: string; teil1TopicB: string; teil2Topic: string; teil3Topic: string; teil1TopicATitle: string; teil1TopicBTitle: string } {
  const teil1A = selections?.find((s) => s.teil === 1 && s.slot === "A")?.value;
  const teil1B = selections?.find((s) => s.teil === 1 && s.slot === "B")?.value;
  const teil2 = selections?.find((s) => s.teil === 2)?.value;
  const teil3 = selections?.find((s) => s.teil === 3)?.value;
  return {
    teil1TopicA: formatTopic(teil1A, materialsByTeil[1]),
    teil1TopicB: formatTopic(teil1B, materialsByTeil[1]),
    teil2Topic: formatTopic(teil2, materialsByTeil[2]),
    teil3Topic: formatTopic(teil3, materialsByTeil[3]),
    // Raw title (e.g. "Reise"), separate from the formatted display string
    // above (which appends body_text guidance in parens) — needed to look
    // up teil1Questions.ts's per-topic library pool, which is keyed on the
    // exact muendlich_materials.title strings, not the formatted string.
    teil1TopicATitle: teil1A ?? "",
    teil1TopicBTitle: teil1B ?? "",
  };
}

async function fetchRoomContext(roomId: string, participants: Participant[]) {
  const a = participants.find((p) => p.slot === "A")!;
  const b = participants.find((p) => p.slot === "B")!;

  const [profilesRes, selectionsRes, teil1MaterialsRes, teil2MaterialsRes, teil3MaterialsRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, level").in("id", [a.userId, b.userId]),
    admin.from("muendlich_selections").select("teil, slot, value").eq("room_id", roomId).in("teil", [1, 2, 3]),
    admin.from("muendlich_materials").select("title, body_text").eq("teil", 1).eq("category", "themen"),
    admin.from("muendlich_materials").select("title, body_text").eq("teil", 2).eq("category", "themen"),
    admin.from("muendlich_materials").select("title, body_text").eq("teil", 3).eq("category", "themen"),
  ]);

  const nameOf = (userId: string) => profilesRes.data?.find((p) => p.id === userId)?.full_name || "Kandidat";
  const topics = resolveSelections(selectionsRes.data, {
    1: teil1MaterialsRes.data, 2: teil2MaterialsRes.data, 3: teil3MaterialsRes.data,
  });

  // muendlich_rooms itself carries no level column — the room's level is
  // derived from its two participants' own profiles.level. Normal case: both
  // sides were matched within the same /b1|b2/ course and agree. If they
  // somehow don't (a matchmaking gap, not something this function should
  // paper over), fall back to B2 — the prior universal behavior — rather than
  // guessing which side is "right".
  const levelA = profilesRes.data?.find((p) => p.id === a.userId)?.level;
  const levelB = profilesRes.data?.find((p) => p.id === b.userId)?.level;
  const level: "B1" | "B2" = levelA && levelA === levelB && String(levelA).toUpperCase().includes("B1") ? "B1" : "B2";

  return {
    personAName: nameOf(a.userId), personBName: nameOf(b.userId),
    ...topics,
    aName: nameOf(a.userId), bName: nameOf(b.userId),
    level,
  };
}

/** True if audio arrived recently enough that the candidate is likely still
 * actively mid-utterance right now, rather than paused/finished. Pulled out
 * as a named, independently-testable function rather than an inline
 * condition — see muendlich-relay's own test suite for direct coverage. */
function isLikelyMidSpeech(lastAudioAt: number, now: number): boolean {
  return now - lastAudioAt < HANDOFF_ACTIVE_SPEECH_MS;
}

/** Teil 1's post-presentation Q&A: EXACTLY 2 questions per candidate, each
 * with a hard 30s answer window (TEIL1_ANSWER_WINDOW_SECONDS) — explicit
 * product spec, replacing the old "ask 1-2 questions, no enforced count or
 * per-answer time limit" prompt-only guidance. State (phase/timing) is
 * managed by the caller (tick()); this only crafts and sends the [SYSTEM]
 * cue — same division of labor as openTeil2TakeoverWindow below (question
 * WORDING stays with the live model, only WHO/WHEN is code-driven). */
function openTeil1QuestionWindow(room: RoomSession, speakerName: string, questionNumber: 1 | 2) {
  room.teil1QuestionsAsked[room.teil1Speaker]++; // QA tripwire — see the field's doc comment
  const framing = questionNumber === 1 ? `Die Präsentationszeit ist um.` : `Die Antwortzeit ist um.`;
  const instruction = questionNumber === 1
    ? `Stellen Sie ${speakerName} jetzt Ihre erste Frage zur Präsentation — konkret bezogen auf das, was ${speakerName} tatsächlich gesagt hat.`
    : `Stellen Sie ${speakerName} jetzt Ihre zweite und letzte Frage zur Präsentation — eine andere Art von Frage als die erste (z. B. Meinung, Grund, Beispiel oder Vergleich statt einer Wiederholung derselben Frageart), ebenfalls konkret auf das Gesagte bezogen.`;
  room.live?.sendSystemMessage(
    // Interpolated (not hardcoded "30") — matters whenever
    // MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS is overridden (e.g. shortened
    // for local/CI testing), so the model's own stated number always
    // matches what tick() actually enforces.
    `${framing} ${instruction} ${speakerName} hat maximal ${TEIL1_ANSWER_WINDOW_SECONDS} Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`,
  );
}

/** Opens (or re-opens, for the next candidate) a Teil 2 takeover response
 * window: updates room state deterministically (app-owned, per the spec's
 * "don't rely on the LLM prompt for timing" principle) and sends a single
 * instruction turn. Question WORDING and strategy stay entirely with the
 * live model — same division of labor already proven for Teil 1's grounded
 * follow-ups — this function only ever tells it WHO to ask and WHY now. */
function openTeil2TakeoverWindow(
  room: RoomSession,
  ctx: { aName: string; bName: string },
  candidate: "A" | "B",
  opts: { first: boolean; previousResponded: boolean },
) {
  const now = Date.now();
  room.teil2TakeoverTurn = candidate;
  room.teil2TakeoverWindowOpenedAt = now;
  room.teil2TakeoverWindowEndsAt = now + TEIL2_RESPONSE_WINDOW_MS;

  const targetName = candidate === "A" ? ctx.aName : ctx.bName;
  const otherName = candidate === "A" ? ctx.bName : ctx.aName;

  const framing = opts.first
    ? "Die Zeit für das freie Gespräch der Kandidaten ist um. Übernehmen Sie jetzt aktiv die Gesprächsführung."
    : opts.previousResponded
      ? "Bedanken Sie sich kurz für die Antwort und wechseln Sie dann höflich das Wort."
      : "Der vorherige Kandidat hat nicht geantwortet — wechseln Sie ohne Kommentar dazu direkt weiter.";

  room.live?.sendSystemMessage(
    `${framing} Stellen Sie ${targetName} jetzt eine direkte Frage zum Thema. Wählen Sie eine andere Art von Frage als beim letzten Mal (Meinung, Grund, Beispiel, Vergleich, Reaktion auf ${otherName}s Beitrag, Gegenargument oder Konsequenz), und gründen Sie die Frage nach Möglichkeit auf etwas, das tatsächlich bereits gesagt wurde. ${targetName} hat maximal 30 Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`,
  );
}

function logTranscript(room: RoomSession, speaker: string, teil: number, text: string) {
  broadcast(room, { type: "transcript", speaker, text });
  if (room.examSessionId) {
    admin.from("muendlich_transcript_nodes").insert({
      session_id: room.examSessionId, speaker, teil, text, started_at: new Date().toISOString(),
    }).then(() => {});
  }
}

async function startStage(room: RoomSession, stage: 1 | 2 | 3, ctx?: { aName: string; bName: string; teil1TopicA: string; teil1TopicATitle: string; teil2Topic: string; teil3Topic: string }) {
  room.examStage = stage;
  room.live?.setStage(stage);
  room.examStageStartedAt = Date.now();
  room.lastAudioAt = Date.now(); // reset so setup/connection latency doesn't eat into the anti-silence budget
  room.lastAudioAtBySlot = { A: Date.now(), B: Date.now() };
  room.teil2Mode = "natural";
  room.teil2TakeoverTurn = null;
  room.teil3CompletionSignalSent = false;
  // Real gap found in review: MAX_REPEAT_USES ("Wie bitte?") used to be a
  // single budget for the WHOLE exam — a candidate who used both repeats
  // during Teil 1 (e.g. mishearing the topic prompt) had zero left for Teil
  // 2 and Teil 3, penalizing the rest of the exam for something that
  // happened at the very start. Resetting per stage gives each Teil its own
  // fresh allowance instead.
  room.repeatCount = 0;
  broadcast(room, { type: "repeat_ack", remaining: MAX_REPEAT_USES });
  const seconds = STAGE_SECONDS[stage];
  await admin.from("muendlich_rooms").update({
    exam_stage: stage, exam_stage_started_at: new Date().toISOString(), exam_stage_seconds: seconds,
  }).eq("id", room.roomId);
  broadcast(room, { type: "stage", stage, seconds });

  // Stage 1's opening (welcome + invite Person A) previously relied purely on
  // the system instruction's "Beginne mit: ..." text with no explicit
  // trigger — unlike every other AI-initiated moment (Teil 2 takeover, Teil 1
  // handoff, anti-silence), which all explicitly push a sendClientContent.
  // Verified live: with a longer combined system instruction (after adding
  // the Teil 1 block), the model did not reliably speak first on its own —
  // it skipped straight past Person A's turn to whatever nudge fired next.
  // Explicit trigger here matches the one reliable pattern already proven
  // everywhere else in this file.
  // Opening: a fully fixed, pre-generated (or dynamically-synthesized
  // fallback) welcome, immediately followed by the exam_start sentence
  // (Person A's name + topic — inherently per-exam data, so it stays a
  // scripted dynamic-TTS line). Both SKIP Claude entirely: there is no
  // "what to say" decision left once the text is picked, so the old
  // "sendSystemMessage + hope Claude repeats it verbatim" round-trip was
  // pure overhead. See voice/phraseLibrary/ for the full design.
  if (stage === 1 && ctx) {
    const voiceId = room.live?.getVoiceId() ?? "gemini-default";
    await room.live?.playLibraryPhrase("welcome");
    await room.live?.speakScriptedText(pickExamStart({ aName: ctx.aName, topicA: ctx.teil1TopicA }, voiceId));
    // The actual presentation prompt — a real question from the 7-topic
    // library (teil1Questions.ts), not just a topic label. From here the
    // candidate does almost all of the talking; the examiner only speaks
    // again once the deterministic 90s cap/early-finish detection opens Q1
    // (openTeil1QuestionWindow) or the scheduled handoff below.
    await room.live?.playTeil1Question(ctx.teil1TopicATitle);
    // Presentation clock for Person A starts now (not at stage-start) — the
    // welcome + exam_start + question prompt above all take real wall-clock
    // seconds of TTS before the candidate can actually begin, and none of
    // that should eat into their 90s presentation budget.
    room.teil1Speaker = "A";
    room.teil1Phase = "presenting";
    room.teil1PhaseStartedAt = Date.now();
    room.teil1QuestionsAsked = { A: 0, B: 0 };
  }

  // Teil 1 -> Teil 2. Skips Claude for the same reason as above.
  if (stage === 2 && ctx) {
    const voiceId = room.live?.getVoiceId() ?? "gemini-default";
    await room.live?.speakScriptedText(pickSectionTransition12({ teil2Topic: ctx.teil2Topic }, voiceId));
  }

  // Teil 2 -> Teil 3. Skips Claude for the same reason as above.
  if (stage === 3 && ctx) {
    const voiceId = room.live?.getVoiceId() ?? "gemini-default";
    await room.live?.speakScriptedText(pickSectionTransition23({ teil3Topic: ctx.teil3Topic }, voiceId));
  }
}

async function startRoomIfReady(room: RoomSession) {
  if (room.participants.size !== 2 || room.live) return;
  const participants = [...room.participants.values()];

  // Pre-flight matchmaking credit guard: protect the paying participant from
  // ever starting a session the other side can't finish. The credit tick
  // below re-checks every 60s once the session is open, but that first tick
  // is a full minute away — this catches the common case before any Gemini
  // session (and its cost) is even opened.
  const [activeA, activeB, usage] = await Promise.all([
    admin.rpc("muendlich_is_active", { p_user_id: participants[0].userId }),
    admin.rpc("muendlich_is_active", { p_user_id: participants[1].userId }),
    admin.rpc("get_today_api_usage"),
  ]);
  if (!activeA.data || !activeB.data) {
    broadcast(room, { type: "terminated", reason: "insufficient_minutes" });
    endRoom(room, "insufficient_minutes_preflight");
    return;
  }

  // Per-user 60,000-credit ElevenLabs allowance — separate from (additive
  // to) the minutes check above, since it protects against a different
  // real cost: this specific vendor's per-character/per-minute billing.
  // Only relevant when this backend is actually the one making ElevenLabs
  // calls; the Gemini backend never touches this budget.
  if (activeVoiceBackend() === "elevenlabs") {
    const [budgetA, budgetB] = await Promise.all([
      checkCreditBudget(admin, participants[0].userId),
      checkCreditBudget(admin, participants[1].userId),
    ]);
    if (!budgetA.allowed || !budgetB.allowed) {
      console.log(`[room ${room.roomId}] ElevenLabs credit allowance exhausted (A: ${budgetA.creditsRemaining} remaining, B: ${budgetB.creditsRemaining} remaining), refusing new session`);
      broadcast(room, { type: "terminated", reason: "insufficient_minutes" });
      endRoom(room, "insufficient_credits_preflight");
      return;
    }
  }

  // Same env-configured cap + comparison pattern as essay-grader-gemini.ts's
  // isBudgetExceeded() — the SQL side only exposes raw usage (get_today_api_
  // usage), the cap itself stays adjustable via env without a migration.
  const dailyCap = Number(process.env.GEMINI_DAILY_TOKEN_CAP ?? Infinity);
  if (Number.isFinite(dailyCap) && typeof usage.data === "number" && usage.data >= dailyCap) {
    console.log(`[room ${room.roomId}] daily Gemini budget exceeded (${usage.data}/${dailyCap} tokens), refusing new session`);
    broadcast(room, { type: "terminated", reason: "budget_exceeded" });
    endRoom(room, "budget_exceeded_preflight");
    return;
  }

  const ctx = await fetchRoomContext(room.roomId, participants);
  room.examLevel = ctx.level;

  // Real fix, found during a full audit: nothing previously verified that
  // both candidates actually made every required topic selection before
  // the exam started. formatTopic() falls back to the literal string
  // "(kein Thema ausgewählt)" for anything missing, and — with no gate —
  // that fallback string would flow straight into the AI examiner's
  // spoken/system-prompt content (e.g. announcing a Teil-2 topic of
  // "(kein Thema ausgewählt)" out loud). Fails closed here instead, before
  // any Claude/ElevenLabs cost is incurred, with the same
  // broadcast+endRoom pattern as every other pre-flight guard above.
  const NO_TOPIC_SELECTED = "(kein Thema ausgewählt)";
  const missingTopics = [
    ["Teil 1 (A)", ctx.teil1TopicA], ["Teil 1 (B)", ctx.teil1TopicB],
    ["Teil 2", ctx.teil2Topic], ["Teil 3", ctx.teil3Topic],
  ].filter(([, value]) => value === NO_TOPIC_SELECTED).map(([label]) => label);
  if (missingTopics.length > 0) {
    console.log(`[room ${room.roomId}] missing topic selection(s): ${missingTopics.join(", ")} — refusing to start`);
    broadcast(room, { type: "terminated", reason: "missing_topic_selection" });
    endRoom(room, "missing_topic_selection_preflight");
    return;
  }

  const { data: sessionRow } = await admin
    .from("muendlich_exam_sessions")
    .insert({ room_id: room.roomId })
    .select("id")
    .single();
  room.examSessionId = sessionRow?.id;

  room.live = await openVoiceBackend(ctx, room.examSessionId!, {
    onOpen: async () => {
      broadcast(room, { type: "ready" });
      await startStage(room, 1, ctx);
    },
    onAudioChunk: (b64) => broadcast(room, { type: "audio", data: b64 }),
    onOutputTranscript: (text) => logTranscript(room, "examiner", room.examStage ?? 2, text),
    onInputTranscript: (text, slot) => logTranscript(room, slot, room.examStage ?? 2, text),
    onError: (message) => {
      console.error(`[room ${room.roomId}] voice backend error:`, message);
      // Set before broadcasting/ending — a credit tick already in flight
      // checks this flag first and skips charging for a minute the session
      // couldn't actually deliver.
      room.voiceBackendErrored = true;
      broadcast(room, { type: "terminated", reason: "ai_error" });
      // Real fix, found during a full audit: this used to call endRoom()
      // directly, skipping evaluation ENTIRELY — a transient TTS/Claude
      // hiccup near the end of an otherwise-complete exam meant both
      // candidates got zero score, no matter how much legitimate transcript
      // existed. Now attempts the same best-effort evaluation finishExam()
      // uses, sharing its own "too little transcript to grade" guard rather
      // than a bespoke one. room.finishing double-guards against a race
      // with a legitimate finishExam() call landing around the same time.
      if (room.finishing) return;
      room.finishing = true;
      attemptBestEffortEvaluation(room, "technical_issue")
        .catch((e) => console.error(`[room ${room.roomId}] best-effort evaluation on technical failure threw unexpectedly:`, e))
        .finally(() => endRoom(room, "technical_issue"));
    },
    onClose: (reason) => console.log(`[room ${room.roomId}] voice backend closed:`, reason),
  });
  room.liveSessionStartedAt = Date.now();

  // Atomic dual-deduction, one tick per elapsed minute — hard-stops the room
  // the instant either participant's balance/window can't cover it.
  room.creditTick = setInterval(async () => {
    if (room.voiceBackendErrored) return;
    const [pa, pb] = [participants[0], participants[1]];
    const asUser = await userScopedClient(pa.accessToken);
    const { error } = await asUser.rpc("deduct_muendlich_minutes_dual", {
      p_room_id: room.roomId, p_user_a: pa.userId, p_user_b: pb.userId, p_minutes: 1,
    });
    if (error) {
      // Real bug found via live testing (2026-09-29, discovered while
      // debugging the same pattern on the Voice Tutor's own credit tick): a
      // plain transient RPC failure (confirmed live: "TypeError: fetch
      // failed" — a network/Supabase blip, nothing to do with either
      // candidate's minutes) used to hard-stop the ENTIRE live exam for
      // BOTH real students, mislabeled as "window_expired" (that label was
      // really just the ELSE branch for "anything that isn't INSUFFICIENT",
      // not a real signal — deduct_muendlich_minutes_dual's only genuine
      // exhaustion exceptions are NO_ACTIVE_SUBSCRIPTION_A/B and
      // INSUFFICIENT_MINUTES_A/B, confirmed against its own migration).
      // Over a ~16+ minute exam with a tick every minute, that's a real,
      // repeated chance for one network hiccup to end a paying session
      // outright. Only one of those four genuine signals is fatal; anything
      // else (a validation bug that should never fire, or a transient
      // fetch/network failure) just skips this tick and retries next time.
      const isGenuineExhaustion = /INSUFFICIENT_MINUTES_|NO_ACTIVE_SUBSCRIPTION_/.test(error.message);
      if (!isGenuineExhaustion) {
        console.warn(`[room ${room.roomId}] credit deduction tick failed (not a real minutes/subscription signal — retrying next tick):`, error.message);
        return;
      }
      console.log(`[room ${room.roomId}] credit deduction genuinely exhausted, hard-stopping:`, error.message);
      // Speak a short closing line before cutting audio — previously this
      // path (and idle_timeout/partner_disconnected below) went dead silent
      // straight to the text-only "terminated" screen, unlike the natural
      // end-of-exam path (exam_end, above) which always got a spoken
      // goodbye. speakScriptedText already catches its own failures
      // internally (never throws), so no extra try/catch needed here. The
      // finishing guard matters here too: without it, live-testing showed
      // the NEXT tick (mainTick fires every TICK_MS, independent of this
      // interval) can re-enter another "ending" branch while this speak()
      // is still in flight, opening a second ElevenLabs generation that
      // supersedes this one before its own onOutputTranscript ever fires —
      // the closing line silently never reaches the client.
      if (room.finishing) return;
      room.finishing = true;
      await room.live?.speakScriptedText(pickEarlyEnd("time_up", room.live?.getVoiceId() ?? "gemini-default"));
      broadcast(room, { type: "terminated", reason: error.message.includes("INSUFFICIENT") ? "insufficient_minutes" : "window_expired" });
      endRoom(room, "expired_mid_exam");
      return;
    }

    // ElevenLabs credit hard cap — same cadence, additive to the minutes
    // check above. Persists the REAL running usage (real characters sent to
    // TTS, real audio-minutes sent to STT — see muendlichVoiceSession.ts's
    // getUsage()) for both participants every tick, so a mid-exam crash
    // still leaves an accurate partial record, and hard-stops the instant
    // either candidate's 60,000-credit allowance would be exceeded.
    if (activeVoiceBackend() === "elevenlabs" && room.live && room.examSessionId) {
      const usage = room.live.getUsage();
      await Promise.all([
        recordExamUsage(admin, pa.userId, room.examSessionId, usage),
        recordExamUsage(admin, pb.userId, room.examSessionId, usage),
      ]);
      const [budgetA, budgetB] = await Promise.all([
        checkCreditBudget(admin, pa.userId),
        checkCreditBudget(admin, pb.userId),
      ]);
      if (!budgetA.allowed || !budgetB.allowed) {
        console.log(`[room ${room.roomId}] ElevenLabs credit allowance exhausted mid-exam (A: ${budgetA.creditsRemaining}, B: ${budgetB.creditsRemaining}), hard-stopping`);
        await room.live?.speakScriptedText(pickEarlyEnd("time_up", room.live?.getVoiceId() ?? "gemini-default"));
        broadcast(room, { type: "terminated", reason: "insufficient_minutes" });
        endRoom(room, "insufficient_credits_mid_exam");
      }
    }
  }, CREDIT_TICK_MS);

  // Stage transitions + Teil-2 AI-takeover instruction + anti-silence nudges.
  room.mainTick = setInterval(() => tick(room, ctx), TICK_MS);
}

async function tick(room: RoomSession, ctx: { aName: string; bName: string; teil1TopicA: string; teil1TopicATitle: string; teil1TopicB: string; teil1TopicBTitle: string; teil2Topic: string; teil3Topic: string }) {
  if (room.finishing) return;

  // A stage's duration just elapsed -> we're on a 15s breather before the
  // next Teil (or before finishing). No takeover/anti-silence checks apply
  // during this window; reuses the same 1s mainTick interval rather than a
  // second timer.
  if (room.intermissionUntil !== null) {
    if (Date.now() >= room.intermissionUntil) {
      const next = room.pendingNextStage;
      room.intermissionUntil = null;
      room.pendingNextStage = null;
      if (next === null) finishExam(room);
      else startStage(room, next, ctx);
    }
    return;
  }

  if (!room.examStage) return;
  const elapsedMs = Date.now() - room.examStageStartedAt;
  const stageSeconds = STAGE_SECONDS[room.examStage];

  // Teil 1: deterministic 3-phase machine per candidate — presenting (90s
  // hard cap) -> q1 (30s answer window) -> q2 (30s answer window) -> either
  // hand off to the other candidate (after A) or end the Teil (after B).
  // Explicit product spec, replacing the old single wall-clock-midpoint
  // handoff (see TEIL1_PRESENTATION_SECONDS's comment for why).
  if (room.examStage === 1) {
    const now = Date.now();
    const phaseElapsedMs = now - room.teil1PhaseStartedAt;
    const speakerName = room.teil1Speaker === "A" ? ctx.aName : ctx.bName;

    if (room.teil1Phase === "presenting") {
      const capMs = TEIL1_PRESENTATION_SECONDS * 1000;
      const withinGraceCap = phaseElapsedMs < capMs + HANDOFF_MAX_GRACE_MS;
      const hitHardCap = phaseElapsedMs >= capMs && !(withinGraceCap && isLikelyMidSpeech(room.lastAudioAt, now));
      // Early-finish: candidate has spoken for a while, then gone quiet for
      // a normal "I'm done" pause — don't force them to sit out the rest of
      // their 90s in silence just because the clock hasn't hit the cap yet.
      // Requires at least 10s of the phase to have passed first, so the
      // brief pause right after the opening question (before they've said
      // anything) can never itself look like "finished."
      // Real bug found in review (pre-live-test): this used
      // HANDOFF_ACTIVE_SPEECH_MS (4s) here, the same threshold Teil 2's
      // quick Q&A turns use for "answer looks finished." But this file's
      // OWN documented design (see SILENCE_THRESHOLD_MS's comment above)
      // says Teil 1 needs a LONGER tolerance than Teil 2 specifically
      // because "a candidate collecting their thoughts mid-presentation is
      // normal" — a 4s thinking-pause happens constantly in a real 90s
      // presentation and would have cut candidates off mid-presentation
      // into Q1 far too eagerly. Uses SILENCE_THRESHOLD_MS[1] (8s) instead,
      // consistent with that existing principle.
      const finishedEarly = phaseElapsedMs >= 10_000 && room.lastAudioAt > room.teil1PhaseStartedAt && now - room.lastAudioAt >= SILENCE_THRESHOLD_MS[1];
      if (hitHardCap || finishedEarly) {
        console.log(`[room ${room.roomId}] Teil 1: ${room.teil1Speaker} presentation -> Q1 (${hitHardCap ? "hard cap" : "early finish"}, ${(phaseElapsedMs / 1000).toFixed(1)}s)`);
        room.teil1Phase = "q1";
        room.teil1PhaseStartedAt = now;
        openTeil1QuestionWindow(room, speakerName, 1);
      }
    } else {
      // q1 or q2 — a 30s answer window is open. Same "looks finished /
      // window expired" logic as Teil 2's takeover windows below.
      const windowMs = TEIL1_ANSWER_WINDOW_SECONDS * 1000;
      const hasResponded = room.lastAudioAt > room.teil1PhaseStartedAt && room.lastSenderSlot === room.teil1Speaker;
      const trailingSilenceMs = now - room.lastAudioAt;
      const looksFinished = hasResponded && trailingSilenceMs >= HANDOFF_ACTIVE_SPEECH_MS;
      const windowExpired = phaseElapsedMs >= windowMs;
      if (looksFinished || windowExpired) {
        const reason = looksFinished ? "looks finished" : "window expired";
        if (room.teil1Phase === "q1") {
          console.log(`[room ${room.roomId}] Teil 1: ${room.teil1Speaker} Q1 -> Q2 (${reason}, ${(phaseElapsedMs / 1000).toFixed(1)}s)`);
          room.teil1Phase = "q2";
          room.teil1PhaseStartedAt = now;
          openTeil1QuestionWindow(room, speakerName, 2);
        } else if (room.teil1Speaker === "A") {
          // A's presentation + 2 questions done -> hand off to B. Skips
          // Claude for the scripted transition, same reasoning as
          // startStage()'s comment above.
          console.log(`[room ${room.roomId}] Teil 1: A Q2 done (${reason}, ${(phaseElapsedMs / 1000).toFixed(1)}s) -> handing off to B`);
          room.teil1Speaker = "B";
          room.teil1Phase = "presenting";
          room.teil1PhaseStartedAt = now;
          const voiceId = room.live?.getVoiceId() ?? "gemini-default";
          // Chained via .then() (not awaited — tick() is sync) so the
          // handoff sentence finishes before the question starts: both
          // calls share the same generation-id supersession machinery,
          // firing them concurrently would let the question cancel the
          // handoff mid-word.
          void room.live?.speakScriptedText(pickTaskTransition({ bName: ctx.bName, topicB: ctx.teil1TopicB }, voiceId))
            .then(() => room.live?.playTeil1Question(ctx.teil1TopicBTitle));
        } else {
          // B's presentation + 2 questions done -> both candidates finished
          // -> Teil 1 is complete. Trigger the intermission directly here
          // (tighter/more accurate than waiting for the generic
          // elapsedMs>=stageSeconds check at the bottom of tick(), which
          // stays in place purely as a safety backstop in case this phase
          // machine ever gets stuck).
          console.log(`[room ${room.roomId}] Teil 1: B Q2 done (${reason}, ${(phaseElapsedMs / 1000).toFixed(1)}s) -> Teil 1 complete, advancing to Teil 2`);
          // QA tripwire (see teil1QuestionsAsked's doc comment): the phase
          // enum makes this structurally impossible today, so this should
          // never actually fire — it exists purely to catch a future tick()
          // edit that breaks that invariant, loudly, instead of silently
          // shortchanging or over-questioning a real candidate. Log-only —
          // never blocks the exam or touches scoring.
          if (room.teil1QuestionsAsked.A !== TEIL1_QUESTIONS_PER_CANDIDATE || room.teil1QuestionsAsked.B !== TEIL1_QUESTIONS_PER_CANDIDATE) {
            console.error(`[room ${room.roomId}] QA ANOMALY: Teil 1 ended with A=${room.teil1QuestionsAsked.A} B=${room.teil1QuestionsAsked.B} questions asked (expected exactly ${TEIL1_QUESTIONS_PER_CANDIDATE} each) — investigate this exam's transcript.`);
          }
          room.pendingNextStage = 2;
          room.intermissionUntil = now + INTERMISSION_SECONDS * 1000;
          broadcast(room, { type: "intermission", seconds: INTERMISSION_SECONDS });
        }
      }
    }
  }

  // Teil 2: candidates talk to each other by default ("natural" mode). Around
  // the ~4-minute mark the AI takes over as a structured, alternating
  // question-and-answer facilitator ("takeover" mode) for the rest of the
  // stage. This scheduled takeover is deliberately separate from the generic
  // anti-silence nudge below, which still independently handles an EARLY
  // stall (conversation dies before the 4-minute mark) as a lightweight,
  // one-shot re-engagement — not a mode change, so it naturally stops firing
  // (and never enters/needs an explicit "return to natural" transition) the
  // moment the candidates start talking to each other again.
  if (room.examStage === 2) {
    if (room.teil2Mode === "natural" && elapsedMs >= TEIL2_TAKEOVER_AT_SEC * 1000) {
      const withinGraceCap = elapsedMs < TEIL2_TAKEOVER_AT_SEC * 1000 + HANDOFF_MAX_GRACE_MS;
      // Same mid-speech grace as the Teil 1 handoff — interrupting an ongoing
      // discussion to redirect it is normal for this Teil, but shouldn't land
      // literally mid-word if avoidable.
      if (!(withinGraceCap && isLikelyMidSpeech(room.lastAudioAt, Date.now()))) {
        room.teil2Mode = "takeover";
        openTeil2TakeoverWindow(room, ctx, "A", { first: true, previousResponded: false });
      }
    } else if (room.teil2Mode === "takeover" && room.teil2TakeoverTurn) {
      const turn = room.teil2TakeoverTurn;
      const now = Date.now();
      // Has the addressed candidate actually spoken since this window opened?
      // (lastSenderSlot/lastAudioAt are the same signals the rest of this
      // file already relies on — no new speaker-detection mechanism.)
      const hasResponded = room.lastAudioAt > room.teil2TakeoverWindowOpenedAt && room.lastSenderSlot === turn;
      const trailingSilenceMs = now - room.lastAudioAt;
      // Reusing HANDOFF_ACTIVE_SPEECH_MS here too, inverted: there it means
      // "recent audio -> still mid-thought, don't interrupt"; here it means
      // "answered, then this many ms of silence -> the answer looks finished,
      // don't make them wait out the rest of the 30s for nothing."
      const looksFinished = hasResponded && trailingSilenceMs >= HANDOFF_ACTIVE_SPEECH_MS;
      const windowExpired = now >= room.teil2TakeoverWindowEndsAt;
      if (looksFinished || windowExpired) {
        const next = turn === "A" ? "B" : "A";
        openTeil2TakeoverWindow(room, ctx, next, { first: false, previousResponded: hasResponded });
      }
    }
  }

  // Teil 3: candidates plan together throughout — unlike Teil 2, there is no
  // structured turn-taking phase to enter. This is a single one-shot signal
  // around the ~4min mark telling the AI to become a more actively involved
  // moderator (identify unresolved points, work the discussion toward a real
  // joint decision) — NOT a takeover, and it does NOT touch the anti-silence
  // mechanism below, which keeps working exactly the same before and after
  // this point (5s threshold active for the entire stage, per spec).
  if (room.examStage === 3 && !room.teil3CompletionSignalSent && elapsedMs >= TEIL3_COMPLETION_AT_SEC * 1000) {
    const withinGraceCap = elapsedMs < TEIL3_COMPLETION_AT_SEC * 1000 + HANDOFF_MAX_GRACE_MS;
    // Same mid-speech grace as elsewhere — this is explicitly NOT meant to be
    // an abrupt takeover, so if they're actively mid-negotiation right at the
    // mark, let the moment pass rather than interrupting.
    if (!(withinGraceCap && isLikelyMidSpeech(room.lastAudioAt, Date.now()))) {
      room.teil3CompletionSignalSent = true;
      room.live?.sendSystemMessage(
        `Die geplante freie Planungszeit nähert sich dem Ende. Werden Sie ab jetzt aktiver als Moderatorin: Identifizieren Sie noch offene Planungspunkte und stellen Sie gezielte Fragen, damit die Kandidaten zu einer konkreten gemeinsamen Entscheidung kommen. Die Kandidaten sollen weiterhin selbst planen und entscheiden — Sie moderieren, Sie planen nicht für sie. Kein abruptes Eingreifen: Wenn gerade aktiv verhandelt wird, lassen Sie das laufen und steigen Sie beim nächsten passenden Moment ein.`,
      );
    }
  }

  // Anti-silence: nobody has sent audio in a while -> AI takes over. Skipped
  // during Teil 2's structured takeover above, which already owns silence
  // handling for that phase via its own 30s window — letting both fire
  // independently would risk two competing AI messages for the same gap
  // (exactly the duplicate-trigger failure mode this file works hard to avoid
  // everywhere else). Teil 3 has NO equivalent suppression — its 5s threshold
  // stays the sole, unsuppressed silence authority for the entire stage,
  // including after the completion signal above, exactly as specified.
  //
  // Real bug found in review (pre-live-test): Teil 1's new 3-phase machine
  // above is now ALWAYS active for the whole stage (unlike Teil 2, which
  // only enters its structured "takeover" mode partway through) but was
  // NOT included in this suppression — so a candidate who took >8s
  // (SILENCE_THRESHOLD_MS[1]) to start answering inside a perfectly valid
  // 30s q1/q2 window would ALSO trigger this generic nudge, which sends its
  // OWN unrelated "take over and ask a direct question" system message —
  // injecting a rogue 3rd/4th question into a flow the product spec
  // requires to be EXACTLY 2 questions per candidate. Teil 1 now suppresses
  // this generic path for its entire stage, the same way Teil 2 already
  // does for its takeover window — the phase machine is its own sole
  // silence authority throughout Teil 1 (presenting/q1/q2 each already
  // enforce their own hard cap + early-finish detection above).
  //
  // Also skipped while a participant is mid-reconnect (room.participants.size
  // < 2 the instant a socket closes, per the ws "close" handler below) — a
  // dropped WebSocket, not real candidate silence, would otherwise look
  // identical to genuine dead air to this room-wide check and fire a
  // nonsensical AI question at a candidate who currently can't hear it. This
  // guard is stage-agnostic and only changes behavior in that disconnect
  // edge case — the normal both-connected case (what Teil 1/2's already-
  // verified behavior was tested under) is completely unaffected.
  const silenceMs = Date.now() - room.lastAudioAt;
  const structuredPhaseOwnsSilence = room.examStage === 1 || (room.examStage === 2 && room.teil2Mode === "takeover");
  const bothConnected = room.participants.size === 2;
  if (bothConnected && !structuredPhaseOwnsSilence && silenceMs > SILENCE_THRESHOLD_MS[room.examStage] && Date.now() - room.lastNudgeAt > NUDGE_DEBOUNCE_MS) {
    room.lastNudgeAt = Date.now();
    broadcast(room, { type: "nudge" }); // surfaces the AI's takeover to the client as a toast
    // Teil 3 gets a candidate-aware variant: which of A/B has actually been
    // quieter for longer, computed from real per-slot audio-arrival state
    // (lastAudioAtBySlot) rather than left to the model's own inference.
    // Teil 1/2 keep the exact same generic message as before, unchanged.
    const turns = room.examStage === 3
      ? (() => {
          const now = Date.now();
          const aSilentMs = now - room.lastAudioAtBySlot.A;
          const bSilentMs = now - room.lastAudioAtBySlot.B;
          const quieterName = aSilentMs >= bSilentMs ? ctx.aName : ctx.bName;
          const quieterSilentSec = Math.round(Math.max(aSilentMs, bSilentMs) / 1000);
          return `Es herrscht seit mehreren Sekunden absolute Stille. ${quieterName} hat davon am längsten nichts mehr gesagt (seit etwa ${quieterSilentSec} Sekunden) — beziehen Sie ${quieterName} bevorzugt aktiv mit ein, gegründet auf den bisherigen Gesprächsverlauf. Stellen Sie eine konkrete, auf die Planung bezogene Frage; treffen Sie die Entscheidung nicht selbst.`;
        })()
      : `Es herrscht seit mehreren Sekunden absolute Stille. Übernehmen Sie sofort die Gesprächsführung: sprechen Sie einen Kandidaten namentlich an (${ctx.aName} oder ${ctx.bName}) und stellen Sie eine direkte, konkrete Frage.`;
    room.live?.sendSystemMessage(turns);
  }

  // Hard idle-close: even the AI's own takeover attempt(s) above got no
  // response for the full HARD_IDLE_CLOSE_MS window — end the session
  // outright to protect the API budget rather than let it run unattended.
  if (silenceMs > HARD_IDLE_CLOSE_MS) {
    console.log(`[room ${room.roomId}] hard idle-close: ${silenceMs}ms of silence`);
    // Guard against re-entry: tick() now awaits speakScriptedText() below,
    // and mainTick fires every TICK_MS regardless of whether the previous
    // invocation finished — without this, a second tick firing mid-speech
    // opens a second ElevenLabs generation that supersedes the first one
    // before its onOutputTranscript ever fires, so the closing line never
    // actually reaches the client (caught by live-testing, not inspection).
    if (room.finishing) return;
    room.finishing = true;
    await room.live?.speakScriptedText(pickEarlyEnd("idle_timeout", room.live?.getVoiceId() ?? "gemini-default"));
    broadcast(room, { type: "terminated", reason: "idle_timeout" });
    endRoom(room, "idle_timeout");
    return;
  }

  // Stage duration elapsed -> queue a 15s breather, then advance (or finish).
  if (elapsedMs >= stageSeconds * 1000) {
    room.pendingNextStage = room.examStage === 1 ? 2 : room.examStage === 2 ? 3 : null;
    room.intermissionUntil = Date.now() + INTERMISSION_SECONDS * 1000;
    broadcast(room, { type: "intermission", seconds: INTERMISSION_SECONDS });
    // Teil 3 just ended (no next stage) -> play the fixed exam_end phrase
    // during this same 15s breather, before finishExam() closes the
    // sockets. Fire-and-forget (tick() is sync); the 15s window gives it
    // time to finish. Previously there was NO spoken closing statement at
    // all — the room just went silent and ended.
    if (room.pendingNextStage === null) void room.live?.playLibraryPhrase("exam_end");
  }
}

// Minimum real candidate turns before attempting to grade a prematurely-
// ended exam — below this, there's genuinely nothing to evaluate, and
// running (and paying for) a Claude evaluation call against a near-empty
// transcript would be wasteful, not more helpful.
const MIN_TRANSCRIPT_NODES_FOR_BEST_EFFORT_EVALUATION = 4;

/** Shared by both the normal completion path (finishExam) and the
 * technical-failure path (voice-backend onError below) — a REAL fix found
 * during a full audit: a TTS/Claude failure used to skip evaluation
 * entirely via a direct endRoom() call, meaning both candidates got ZERO
 * score even after a mostly-complete, legitimately gradable exam. Now both
 * paths attempt a best-effort evaluation from whatever real transcript
 * exists, and only skip it if there's genuinely too little to grade. */
async function attemptBestEffortEvaluation(room: RoomSession, endReason: string) {
  const participants = [...room.participants.values()];
  const examSessionId = room.examSessionId;

  try {
    if (!examSessionId) throw new Error("no exam session id");
    const { data: nodes } = await admin
      .from("muendlich_transcript_nodes")
      .select("speaker, text, started_at")
      .eq("session_id", examSessionId)
      .order("started_at", { ascending: true });

    await admin.from("muendlich_exam_sessions").update({
      transcript: nodes ?? [], ended_at: new Date().toISOString(), end_reason: endReason,
    }).eq("id", examSessionId);

    if (!nodes || nodes.length < MIN_TRANSCRIPT_NODES_FOR_BEST_EFFORT_EVALUATION) {
      console.log(`[room ${room.roomId}] too little transcript (${nodes?.length ?? 0} nodes) to attempt an evaluation — skipping, not scoring an near-empty exam`);
      return;
    }

    const transcriptText = nodes
      .map((n) => `${n.speaker === "examiner" ? "Prüferin" : n.speaker === "A" ? "Person A" : "Person B"}: ${n.text}`)
      .join("\n");

    // Two independent, private evaluations — one per candidate.
    for (const label of ["Person A", "Person B"] as const) {
      const p = participants.find((x) => (label === "Person A" ? x.slot === "A" : x.slot === "B"));
      if (!p) continue;
      try {
        const evaluation = await generateMuendlichEvaluation(transcriptText, label, room.examLevel ?? "B2");
        await admin.from("muendlich_evaluations").insert({
          session_id: examSessionId, user_id: p.userId,
          teil1_score: evaluation.teil1_score, teil2_score: evaluation.teil2_score, teil3_score: evaluation.teil3_score,
          overall_score: evaluation.overall_score, passed: evaluation.passed, cefr_level: evaluation.cefr_level,
          feedback: evaluation.feedback, model: evaluation.model,
        });
      } catch (e) {
        console.error(`[room ${room.roomId}] evaluation generation failed for ${label}:`, e);
      }
    }
  } catch (e) {
    console.error(`[room ${room.roomId}] attemptBestEffortEvaluation failed:`, e);
  }
}

async function finishExam(room: RoomSession) {
  if (room.finishing) return;
  room.finishing = true;
  broadcast(room, { type: "finished" });
  await attemptBestEffortEvaluation(room, "completed");
  endRoom(room, "completed");
}

function endRoom(room: RoomSession, endReason: string) {
  // Guard against re-entry: closing the participants' sockets below fires
  // each socket's own "close" handler, which (without this guard) would call
  // endRoom() a second time with a generic "disconnect_timeout" reason and
  // clobber a correct "completed" status that was just written — caught by
  // actually running the full exam lifecycle end to end, not by inspection.
  if (room.ended) return;
  room.ended = true;

  // Approximate token usage for the global cost-cap ledger — see
  // GEMINI_AUDIO_TOKENS_PER_MINUTE's header comment for why this is an
  // estimate, not exact billing telemetry.
  if (room.liveSessionStartedAt) {
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - room.liveSessionStartedAt) / 60_000));
    admin.rpc("record_api_usage", { p_tokens: elapsedMinutes * GEMINI_AUDIO_TOKENS_PER_MINUTE }).then(({ error }) => {
      if (error) console.error(`[room ${room.roomId}] failed to record API usage:`, error.message);
    });
  }

  // Final ElevenLabs usage snapshot before closing — the periodic tick only
  // records every CREDIT_TICK_MS (60s), so without this, up to a minute of
  // real usage right before the exam ended would never get persisted.
  if (activeVoiceBackend() === "elevenlabs" && room.live && room.examSessionId) {
    const usage = room.live.getUsage();
    for (const p of room.participants.values()) {
      recordExamUsage(admin, p.userId, room.examSessionId, usage).catch(() => {});
    }
  }

  room.live?.close();
  if (room.creditTick) clearInterval(room.creditTick);
  if (room.mainTick) clearInterval(room.mainTick);
  for (const t of room.disconnectTimers.values()) clearTimeout(t);
  for (const p of room.participants.values()) p.ws.close();
  if (room.examSessionId && endReason !== "completed") {
    // "completed" already wrote its own ended_at/end_reason inside finishExam
    // with the full transcript snapshot — don't clobber that here.
    admin.from("muendlich_exam_sessions").update({ ended_at: new Date().toISOString(), end_reason: endReason }).eq("id", room.examSessionId).then(() => {});
  }
  rooms.delete(room.roomId);
}

// ============================================================
// AI Voice Tutor (1:1 speaking practice) — session lifecycle. Additive only:
// nothing here reads or writes `rooms`, `RoomSession`, or any exam-only RPC.
// ============================================================

function logTutorTranscript(session: TutorSession, speaker: "examiner" | "partner" | "student", text: string) {
  send(session.ws, { type: "transcript", speaker, text });
  admin.from("voice_tutor_transcript_nodes").insert({
    // teil = session.teilStage, not a hardcoded 1 — a real gap from the
    // Teil-1-only build: every node was logged as teil 1 regardless of
    // which Teil was actually active, which would have silently mislabeled
    // every Teil 2/3 transcript node once those existed.
    session_id: session.sessionId, speaker, teil: session.teilStage, text, started_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error(`[tutor ${session.sessionId}] transcript insert failed:`, error.message);
  });
}

function endTutorSession(session: TutorSession, endReason: string) {
  // Same re-entry guard as endRoom() — closing the socket below fires its own
  // "close" handler, which would otherwise call this a second time.
  if (session.ended) return;
  session.ended = true;

  // Same global-ledger recording pattern as endRoom() — this is the
  // platform-wide cost ceiling, separate from (and still necessary alongside)
  // the per-user daily-cap RPC already enforced by the credit tick below.
  // Reuses GEMINI_AUDIO_TOKENS_PER_MINUTE as a rough per-minute estimate even
  // though the tutor never actually calls Gemini — record_api_usage is the
  // one shared, platform-wide ledger both backends report into, and this
  // keeps that estimate consistent regardless of which backend produced it.
  if (session.liveSessionStartedAt) {
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - session.liveSessionStartedAt) / 60_000));
    admin.rpc("record_api_usage", { p_tokens: elapsedMinutes * GEMINI_AUDIO_TOKENS_PER_MINUTE }).then(({ error }) => {
      if (error) console.error(`[tutor ${session.sessionId}] failed to record API usage:`, error.message);
    });
  }

  // Final ElevenLabs usage snapshot before closing — same reasoning as
  // endRoom()'s identical block: the per-minute credit tick only records
  // every CREDIT_TICK_MS, so without this, up to a minute of real usage
  // right before the session ended would never get persisted.
  if (session.live) {
    const usage = session.live.getUsage();
    recordTutorUsage(admin, session.userId, session.sessionId, usage).catch(() => {});
  }

  session.live?.close();
  if (session.creditTick) clearInterval(session.creditTick);
  if (session.mainTick) clearInterval(session.mainTick);
  session.ws.close();

  admin.from("voice_tutor_sessions").update({
    ended_at: new Date().toISOString(), end_reason: endReason,
  }).eq("id", session.sessionId).then(() => {});

  tutorSessions.delete(session.sessionId);
}

// Small lookup, not a real ordinal-formatting dependency — this codebase
// only ever needs up to a handful of German ordinals (Teil 1's question
// count), so a table is simpler and clearer than pulling in a library.
const GERMAN_ORDINALS = ["erste", "zweite", "dritte", "vierte", "fünfte", "sechste", "siebte", "achte"];
function germanOrdinal(n: number): string {
  return GERMAN_ORDINALS[n - 1] ?? `${n}.`;
}

/** Teil 1's post-presentation Q&A for the tutor — GENAU TUTOR_TEIL1_QUESTIONS
 * questions (owner spec: 3, not the exam's 2), each with its own
 * TUTOR_TEIL1_ANSWER_WINDOW_SECONDS window (40s, not the exam's 30s). */
function openTutorTeil1Question(session: TutorSession, ctx: TutorContext) {
  const isFirst = session.questionIndex === 1;
  const isLast = session.questionIndex === TUTOR_TEIL1_QUESTIONS;
  const framing = isFirst ? `Die Präsentationszeit ist um.` : `Die Antwortzeit ist um.`;
  const ordinal = germanOrdinal(session.questionIndex);
  const instruction = isLast
    ? `Stellen Sie ${ctx.studentName} jetzt Ihre ${ordinal} und letzte Frage zur Präsentation — eine andere Art von Frage als die vorherigen, konkret bezogen auf das, was ${ctx.studentName} tatsächlich gesagt hat.`
    : `Stellen Sie ${ctx.studentName} jetzt Ihre ${ordinal} Frage zur Präsentation — konkret bezogen auf das, was ${ctx.studentName} tatsächlich gesagt hat${isFirst ? "" : ", und eine andere Art von Frage als die vorherige"}.`;
  session.live?.sendSystemMessage(
    `${framing} ${instruction} ${ctx.studentName} hat maximal ${TUTOR_TEIL1_ANSWER_WINDOW_SECONDS} Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`,
  );
}

/** Teil 2's question-asking instruction — GENAU TUTOR_TEIL2_QUESTIONS
 * questions (fixed count, not time-boxed — see tutorTickTeil2()). */
function openTutorTeil2Question(session: TutorSession, ctx: TutorContext) {
  session.live?.sendSystemMessage(
    `Stellen Sie ${ctx.studentName} jetzt die nächste Frage zum Thema (Frage ${session.questionIndex} von ${TUTOR_TEIL2_QUESTIONS}) — eine andere Art von Frage als zuletzt, nach Möglichkeit auf das bisher Gesagte bezogen. ${ctx.studentName} hat maximal ${TUTOR_TEIL2_ANSWER_WINDOW_SECONDS} Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`,
  );
}

/** Teil 3's turn-taking instruction — the AI is now the PARTNER (see
 * tutorBrain.ts's buildTeil3Prompt), GENAU TUTOR_TEIL3_TURNS turns. */
function openTutorTeil3Turn(session: TutorSession, ctx: TutorContext) {
  session.live?.sendSystemMessage(
    `Bringen Sie jetzt Ihren nächsten Gesprächsbeitrag zur gemeinsamen Planung (Beitrag ${session.questionIndex} von ${TUTOR_TEIL3_TURNS}) — als Partner, nicht als Prüfer. ${ctx.studentName} hat maximal ${TUTOR_TEIL3_ANSWER_WINDOW_SECONDS} Sekunden Zeit zu reagieren — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`,
  );
}

/** Teil 1 complete -> Teil 2 begins: scripted transition (tutorPhrases.ts's
 * own pool — see that file's header for why the exam's pickSectionTransition12
 * isn't reused here) + the shared topic announcement, then the first
 * question. Not folded into tutorTick() itself since it's a one-shot async
 * sequence (awaiting the spoken line) rather than a per-tick check. */
async function startTutorTeil2(session: TutorSession, ctx: TutorContext) {
  session.teilStage = 2;
  session.live?.setStage(2, session.teil2Topic);
  send(session.ws, { type: "stage", stage: 2 });
  const voiceId = session.live?.getVoiceId() ?? "tutor-default";
  const transitionText = pickTeil1ToTeil2({ teil2Topic: session.teil2Topic }, voiceId);
  await session.live?.speakScriptedText(transitionText);
  if (session.ended) return; // session could have been ended (cap/error) while the transition line was still playing
  session.lastAudioAt = Date.now(); // reset so this line's own synthesis time (it embeds the full Teil 2 topic text, sometimes a long article — see MAX_ELEVENLABS_CHARS_PER_SESSION's comment) doesn't eat into Q1's idle budget, same reasoning as the session-opening line's identical reset
  session.questionIndex = 1;
  session.phaseStartedAt = Date.now();
  session.advancingStage = false; // only now is it safe for tutorTick() to evaluate Teil 2's timing — see the field's doc comment
  openTutorTeil2Question(session, ctx);
}

/** Teil 2 complete -> Teil 3 begins: scripted transition line, spoken AS
 * THE EXAMINER (getVoiceId(), not the partner voice — the persona hasn't
 * switched yet), explicitly announcing the switch. ONLY AFTER that line
 * finishes does setPartnerStage() actually flip the voice/persona — see
 * that method's own doc comment for why the order matters. */
async function startTutorTeil3(session: TutorSession, ctx: TutorContext) {
  const voiceId = session.live?.getVoiceId() ?? "tutor-default";
  const transitionText = pickTeil2ToTeil3({ teil3Topic: session.teil3Topic }, voiceId);
  await session.live?.speakScriptedText(transitionText);
  if (session.ended) return;
  session.lastAudioAt = Date.now(); // reset so this line's own synthesis time doesn't eat into turn 1's idle budget — same reasoning as startTutorTeil2's identical reset
  await session.live?.setPartnerStage(session.teil3Topic);
  session.teilStage = 3;
  send(session.ws, { type: "stage", stage: 3 });
  session.questionIndex = 1;
  session.phaseStartedAt = Date.now();
  session.advancingStage = false;
  openTutorTeil3Turn(session, ctx);
}

/** Teil 1's deterministic phase machine for ONE student — presenting (90s
 * hard cap) -> GENAU TUTOR_TEIL1_QUESTIONS questions -> Teil 2 begins. Direct
 * adaptation of tick()'s Teil-1 branch for RoomSession, minus the A/B
 * handoff (there is no second candidate to hand off to — this build hands
 * off to Teil 2 instead of ending). */
function tutorTickTeil1(session: TutorSession, ctx: TutorContext, now: number) {
  const phaseElapsedMs = now - session.phaseStartedAt;

  if (session.teil1Phase === "presenting") {
    const capMs = TEIL1_PRESENTATION_SECONDS * 1000;
    const withinGraceCap = phaseElapsedMs < capMs + HANDOFF_MAX_GRACE_MS;
    const hitHardCap = phaseElapsedMs >= capMs && !(withinGraceCap && isLikelyMidSpeech(session.lastAudioAt, now));
    // Early-finish: same 10s-minimum + SILENCE_THRESHOLD_MS[1] (8s) tolerance
    // as the exam's own Teil 1 — see tick()'s identical check for why this
    // (not the shorter 4s Teil-2-style threshold) is the right one here.
    const finishedEarly = phaseElapsedMs >= 10_000 && session.lastAudioAt > session.phaseStartedAt && now - session.lastAudioAt >= SILENCE_THRESHOLD_MS[1];
    if (hitHardCap || finishedEarly) {
      console.log(`[tutor ${session.sessionId}] Teil 1: presentation -> Q1 (${hitHardCap ? "hard cap" : "early finish"}, ${(phaseElapsedMs / 1000).toFixed(1)}s)`);
      session.teil1Phase = "questions";
      session.questionIndex = 1;
      session.phaseStartedAt = now;
      openTutorTeil1Question(session, ctx);
    }
    return;
  }

  // "questions" phase — the current question's own answer window is open.
  const windowMs = TUTOR_TEIL1_ANSWER_WINDOW_SECONDS * 1000;
  const hasResponded = session.lastAudioAt > session.phaseStartedAt;
  const trailingSilenceMs = now - session.lastAudioAt;
  const looksFinished = hasResponded && trailingSilenceMs >= HANDOFF_ACTIVE_SPEECH_MS;
  const windowExpired = phaseElapsedMs >= windowMs;
  if (!looksFinished && !windowExpired) return;
  const reason = looksFinished ? "looks finished" : "window expired";

  if (session.questionIndex < TUTOR_TEIL1_QUESTIONS) {
    console.log(`[tutor ${session.sessionId}] Teil 1: Q${session.questionIndex} -> Q${session.questionIndex + 1} (${reason}, ${(phaseElapsedMs / 1000).toFixed(1)}s)`);
    session.questionIndex++;
    session.phaseStartedAt = now;
    openTutorTeil1Question(session, ctx);
    return;
  }

  console.log(`[tutor ${session.sessionId}] Teil 1: Q${session.questionIndex} done (${reason}, ${(phaseElapsedMs / 1000).toFixed(1)}s) -> Teil 2`);
  send(session.ws, { type: "teil1_complete" });
  session.advancingStage = true; // see the field's doc comment — blocks tutorTick() until startTutorTeil2()'s own awaits settle
  void startTutorTeil2(session, ctx);
}

/** Teil 2's examiner-led Q&A loop for ONE student — GENAU TUTOR_TEIL2_QUESTIONS
 * questions (a fixed count, unlike the exam's time-boxed candidate
 * discussion), each checked only at a natural answer-pause point (same
 * moment a new question would otherwise fire), so a question is never cut
 * off mid-answer. Hands off to Teil 3 once done. */
function tutorTickTeil2(session: TutorSession, ctx: TutorContext, now: number) {
  const phaseElapsedMs = now - session.phaseStartedAt;
  const hasResponded = session.lastAudioAt > session.phaseStartedAt;
  const trailingSilenceMs = now - session.lastAudioAt;
  const looksFinished = hasResponded && trailingSilenceMs >= HANDOFF_ACTIVE_SPEECH_MS;
  const windowExpired = phaseElapsedMs >= TUTOR_TEIL2_ANSWER_WINDOW_SECONDS * 1000;
  if (!looksFinished && !windowExpired) return;
  const reason = looksFinished ? "looks finished" : "window expired";

  if (session.questionIndex < TUTOR_TEIL2_QUESTIONS) {
    console.log(`[tutor ${session.sessionId}] Teil 2: Q${session.questionIndex} -> Q${session.questionIndex + 1} (${reason}, ${(phaseElapsedMs / 1000).toFixed(1)}s)`);
    session.questionIndex++;
    session.phaseStartedAt = now;
    openTutorTeil2Question(session, ctx);
    return;
  }

  console.log(`[tutor ${session.sessionId}] Teil 2: Q${session.questionIndex} done (${reason}) -> Teil 3`);
  send(session.ws, { type: "teil2_complete" });
  session.advancingStage = true; // see the field's doc comment — blocks tutorTick() until startTutorTeil3()'s own awaits settle
  void startTutorTeil3(session, ctx);
}

/** Teil 3's partner-mode turn loop for ONE student — GENAU TUTOR_TEIL3_TURNS
 * turns from the AI-as-partner (see tutorBrain.ts's buildTeil3Prompt), same
 * fixed-count/natural-pause-checked structure as Teil 1/2. Ends the WHOLE
 * session once done — this is the last Teil. */
function tutorTickTeil3(session: TutorSession, ctx: TutorContext, now: number) {
  const phaseElapsedMs = now - session.phaseStartedAt;
  const hasResponded = session.lastAudioAt > session.phaseStartedAt;
  const trailingSilenceMs = now - session.lastAudioAt;
  const looksFinished = hasResponded && trailingSilenceMs >= HANDOFF_ACTIVE_SPEECH_MS;
  const windowExpired = phaseElapsedMs >= TUTOR_TEIL3_ANSWER_WINDOW_SECONDS * 1000;
  if (!looksFinished && !windowExpired) return;
  const reason = looksFinished ? "looks finished" : "window expired";

  if (session.questionIndex < TUTOR_TEIL3_TURNS) {
    console.log(`[tutor ${session.sessionId}] Teil 3: turn ${session.questionIndex} -> ${session.questionIndex + 1} (${reason}, ${(phaseElapsedMs / 1000).toFixed(1)}s)`);
    session.questionIndex++;
    session.phaseStartedAt = now;
    openTutorTeil3Turn(session, ctx);
    return;
  }

  console.log(`[tutor ${session.sessionId}] Teil 3: turn ${session.questionIndex} done (${reason}) -> session complete`);
  // Spoken by the partner (the persona that's been active for all of Teil 3),
  // not the examiner reappearing out of nowhere at the very end.
  const voiceId = session.live?.getPartnerVoiceId() ?? session.live?.getVoiceId() ?? "tutor-default";
  void session.live?.speakScriptedText(pickSessionEnd({ studentName: ctx.studentName }, voiceId))
    .finally(() => {
      send(session.ws, { type: "session_complete" });
      endTutorSession(session, "completed_by_user");
    });
}

/** Dispatches to the current Teil's own tick function, plus the tutor's own
 * hard-idle-close safety net (merged here rather than a separate timer,
 * since it applies identically regardless of which Teil is active) — see
 * TUTOR_HARD_IDLE_CLOSE_MS's own comment for why this is a separate,
 * more generous threshold than the exam's HARD_IDLE_CLOSE_MS. */
function tutorTick(session: TutorSession, ctx: TutorContext) {
  if (session.ended) return;
  if (session.advancingStage) return; // a Teil handoff is in flight — see the field's doc comment
  const now = Date.now();

  const idleSilenceMs = now - session.lastAudioAt;
  if (idleSilenceMs > TUTOR_HARD_IDLE_CLOSE_MS) {
    console.log(`[tutor ${session.sessionId}] hard idle-close: ${idleSilenceMs}ms of silence`);
    send(session.ws, { type: "terminated", reason: "idle_timeout" });
    endTutorSession(session, "idle_timeout");
    return;
  }

  if (session.teilStage === 1) tutorTickTeil1(session, ctx, now);
  else if (session.teilStage === 2) tutorTickTeil2(session, ctx, now);
  else tutorTickTeil3(session, ctx, now);
}

/** Pre-flight-gates, opens the ElevenLabs+Claude tutor voice session, and
 * wires the per-minute daily-cap tick + the Teil-1 phase machine. Returns
 * null (having already closed the socket with a clear reason) if a
 * pre-flight check fails or session creation itself errors — the caller
 * should just stop, not treat that as an unexpected failure. */
async function startTutorSession(
  ws: WebSocket,
  userId: string,
  accessToken: string,
  sessionRow: {
    id: string;
    teil1MaterialTitle: string; teil1MaterialBodyText: string | null;
    teil2MaterialTitle: string; teil2MaterialBodyText: string | null;
    teil3MaterialTitle: string; teil3MaterialBodyText: string | null;
  },
  level: "TELC_B1" | "TELC_B2",
  studentName: string,
): Promise<TutorSession | null> {
  const asUser = await userScopedClient(accessToken);

  // Per-user daily cap, checked BEFORE any ElevenLabs/Claude session opens —
  // mirrors the exam's own pre-flight-guard-before-any-cost pattern in
  // startRoomIfReady().
  const { data: capRows, error: capError } = await asUser.rpc("get_my_voice_tutor_cap_status", { p_level: level });
  const capRow = Array.isArray(capRows) ? capRows[0] : capRows;
  if (capError || !capRow || capRow.seconds_remaining <= 0) {
    send(ws, { type: "terminated", reason: "daily_cap_exceeded" });
    ws.close(4009, "daily cap exceeded");
    return null;
  }

  // Per-user ElevenLabs credit allowance — same guard as the exam's own
  // startRoomIfReady(), since the tutor always runs on this backend now.
  const budget = await checkCreditBudget(admin, userId);
  if (!budget.allowed) {
    console.log(`[tutor] ElevenLabs credit allowance exhausted (${budget.creditsRemaining} remaining) for user ${userId}, refusing new session`);
    send(ws, { type: "terminated", reason: "insufficient_minutes" });
    ws.close(4011, "insufficient credits");
    return null;
  }

  const teil2Topic = formatTopic(sessionRow.teil2MaterialTitle, [{ title: sessionRow.teil2MaterialTitle, body_text: sessionRow.teil2MaterialBodyText }]);
  const teil3Topic = formatTopic(sessionRow.teil3MaterialTitle, [{ title: sessionRow.teil3MaterialTitle, body_text: sessionRow.teil3MaterialBodyText }]);

  const session: TutorSession = {
    sessionId: sessionRow.id, userId, accessToken, ws,
    level, lastAudioAt: Date.now(), teilStage: 1, advancingStage: false,
    teil1Phase: "presenting", questionIndex: 0, phaseStartedAt: 0,
    teil2Topic, teil3Topic,
    liveSessionStartedAt: null, ended: false, voiceBackendErrored: false,
  };
  tutorSessions.set(session.sessionId, session);

  const teil1Topic = formatTopic(sessionRow.teil1MaterialTitle, [{ title: sessionRow.teil1MaterialTitle, body_text: sessionRow.teil1MaterialBodyText }]);
  const ctx: TutorContext = { studentName, level: level === "TELC_B1" ? "B1" : "B2", teil1Topic, stage: 1 };

  session.live = await openTutorVoiceSession(ctx, session.sessionId, {
    onOpen: () => {},
    onAudioChunk: (b64) => send(ws, { type: "audio", data: b64 }),
    // Deterministic from teilStage alone: Teil 1/2 are always the examiner,
    // Teil 3 is always the partner (see tutorVoiceSession.ts's own identical
    // speakingIsPartner check for why this mapping holds for every call site
    // including the Teil2->3 transition line itself, spoken while teilStage
    // is still 2/examiner).
    onOutputTranscript: (text) => logTutorTranscript(session, session.teilStage === 3 ? "partner" : "examiner", text),
    onInputTranscript: (text) => logTutorTranscript(session, "student", text),
    onError: (message) => {
      console.error(`[tutor ${session.sessionId}] voice backend error:`, message);
      session.voiceBackendErrored = true;
      send(ws, { type: "terminated", reason: "ai_error" });
      endTutorSession(session, "technical_issue");
    },
    onClose: (reason) => console.log(`[tutor ${session.sessionId}] voice backend closed:`, reason),
  });
  session.liveSessionStartedAt = Date.now();

  send(ws, { type: "ready", sessionId: session.sessionId });
  send(ws, { type: "cap_status", secondsRemaining: capRow.seconds_remaining });

  // Opening: a plain scripted welcome + topic announcement, skipping Claude
  // entirely — same reasoning as the exam's startStage() stage-1 opening
  // (there is no "what to say" decision left once the text is picked). No
  // pre-generated phrase library for the tutor yet (unlike the exam's
  // playLibraryPhrase/playTeil1Question) — every session pays this one
  // opening utterance's real ElevenLabs cost; a fixed-phrase library for the
  // tutor is a reasonable later optimization, not needed for this build.
  await session.live.speakScriptedText(
    `Hallo ${studentName}, willkommen zu Ihrer Übung für Teil 1 der mündlichen Prüfung. Ihr Thema lautet: ${teil1Topic}. Sie haben etwa anderthalb Minuten Zeit — bitte beginnen Sie, wenn Sie bereit sind.`,
  );
  session.lastAudioAt = Date.now(); // reset so the opening's own TTS playback time doesn't eat into the 90s presentation budget
  session.phaseStartedAt = Date.now();

  // Per-minute daily-cap deduction — same cadence as the exam's CREDIT_TICK_MS.
  session.creditTick = setInterval(async () => {
    if (session.voiceBackendErrored || session.ended) return;
    const { error } = await asUser.rpc("deduct_voice_tutor_seconds", { p_seconds: 60, p_level: level });
    if (error) {
      // Real bug found via live testing (2026-09-29): this used to treat ANY
      // RPC failure as "the student hit their daily cap" and end the session
      // — but deduct_voice_tutor_seconds() can ALSO fail for reasons that
      // have nothing to do with the cap (a transient network/Supabase blip
      // surfaces here as a plain "TypeError: fetch failed", confirmed live).
      // Ending the session and telling the student they're out of practice
      // time for a one-off network hiccup is both wrong and needlessly
      // destructive — same "don't kill the session over a transient error"
      // principle already applied to the ElevenLabs voice path. Only the
      // RPC's own genuine 'DAILY_CAP_EXCEEDED' exception is treated as fatal;
      // anything else just skips this tick's deduction and retries next time.
      if (!error.message?.includes("DAILY_CAP_EXCEEDED")) {
        console.warn(`[tutor ${session.sessionId}] daily cap deduction tick failed (not an actual cap-exceeded — retrying next tick):`, error.message);
        return;
      }
      console.log(`[tutor ${session.sessionId}] daily cap genuinely exceeded, hard-stopping:`, error.message);
      send(ws, { type: "terminated", reason: "daily_cap_exceeded" });
      endTutorSession(session, "daily_cap_exceeded");
      return;
    }
    const { data: statusRows } = await asUser.rpc("get_my_voice_tutor_cap_status", { p_level: level });
    const status = Array.isArray(statusRows) ? statusRows[0] : statusRows;
    if (status) send(ws, { type: "cap_status", secondsRemaining: status.seconds_remaining });
  }, CREDIT_TICK_MS);

  // Teil-1 phase machine + idle safety net, same TICK_MS cadence as the
  // exam's own mainTick.
  session.mainTick = setInterval(() => tutorTick(session, ctx), TICK_MS);

  return session;
}

const httpServer = createServer((_req, res) => { res.writeHead(200); res.end("muendlich-relay ok"); });
// noServer:true on BOTH WebSocketServers below — `{ server: httpServer }`
// would make `ws` auto-attach its own "upgrade" listener that intercepts
// EVERY path on this http server (path filtering only happens later, inside
// each server's own "connection" handler, not at the upgrade stage), which
// collides with a second WebSocketServer's own upgrade listener on the same
// httpServer ("handleUpgrade() was called more than once with the same
// socket" — caught by actually running a live connection, not by
// inspection). Routing every upgrade through one dispatcher below, keyed on
// path, is the standard `ws`-documented way to host multiple WebSocketServers
// on one HTTP server.
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (ws, req) => {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const roomId = url.pathname.split("/").filter(Boolean)[1]; // /room/<roomId>
    const token = url.searchParams.get("token");
    // Real gap found in review: every early-rejection branch below used to
    // close the socket with ZERO console output — indistinguishable, from
    // the server's own logs, between "a client sent a malformed request"
    // and "a systemic auth/RLS regression is rejecting every real
    // candidate." Diagnosing the plan-access RLS bug this Teil 1 live-test
    // actually hit (a real subscriber has plan access; this test's
    // disposable accounts didn't) required a whole separate ad-hoc script
    // BECAUSE these paths were silent. One line per rejection reason below
    // — cheap, and the only way an operator could ever notice this class of
    // problem from Fly.io logs alone.
    if (!roomId || !token) { console.warn(`[room] rejecting connection: missing room or token (url=${req.url})`); ws.close(4000, "missing room or token"); return; }

    const asUser = await userScopedClient(token);
    const { data: userData, error: authError } = await asUser.auth.getUser(token);
    if (authError || !userData?.user) { console.warn(`[room ${roomId}] rejecting connection: invalid token — ${authError?.message ?? "no user in response"}`); ws.close(4001, "invalid token"); return; }
    const userId = userData.user.id;

    const { data: participantRow, error: participantError } = await asUser
      .from("muendlich_participants").select("slot").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
    if (!participantRow) {
      console.warn(`[room ${roomId}] rejecting connection: user ${userId} not a participant${participantError ? ` (query error: ${participantError.message})` : " (no matching row visible under this user's RLS — check plan-access policy if this user should legitimately be a participant)"}`);
      ws.close(4003, "not a participant of this room");
      return;
    }

    let room = rooms.get(roomId);
    if (!room) {
      room = {
        roomId, participants: new Map(), lastSenderSlot: null, lastAudioAt: Date.now(),
        lastAudioAtBySlot: { A: Date.now(), B: Date.now() }, lastNudgeAt: 0,
        examStage: null, examStageStartedAt: 0, teil1Speaker: "A", teil1Phase: "presenting", teil1PhaseStartedAt: 0,
        teil1QuestionsAsked: { A: 0, B: 0 },
        teil2Mode: "natural", teil2TakeoverTurn: null, teil2TakeoverWindowOpenedAt: 0, teil2TakeoverWindowEndsAt: 0,
        teil3CompletionSignalSent: false,
        repeatCount: 0,
        intermissionUntil: null, pendingNextStage: null,
        disconnectTimers: new Map(), finishing: false, ended: false,
        voiceBackendErrored: false, liveSessionStartedAt: null,
      };
      rooms.set(roomId, room);
    }

    // Reconnect grace: cancel any pending "treat as abandoned" timer for this user.
    const pendingTimer = room.disconnectTimers.get(userId);
    if (pendingTimer) { clearTimeout(pendingTimer); room.disconnectTimers.delete(userId); }

    room.participants.set(userId, { userId, slot: participantRow.slot as "A" | "B", ws, accessToken: token });
    await startRoomIfReady(room);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          send(ws, { type: "pong", t: msg.t });
        } else if (msg.type === "audio" && room!.live) {
          room!.lastSenderSlot = participantRow.slot as "A" | "B";
          room!.lastAudioAt = Date.now();
          room!.lastAudioAtBySlot[participantRow.slot as "A" | "B"] = Date.now();
          // Don't forward mic audio to Gemini during the 15s inter-stage
          // breather — candidates chatting between Teile ("was kommt jetzt?")
          // would otherwise still reach Gemini's own VAD and could trigger an
          // unsolicited spoken response mid-breather. lastAudioAt above still
          // updates regardless, so the anti-silence bookkeeping stays accurate
          // the moment the next stage actually starts.
          if (!room!.intermissionUntil) room!.live.sendAudioChunk(participantRow.slot as "A" | "B", msg.data);
        } else if (msg.type === "repeat" && room!.live) {
          // "Wie bitte?" — capped at MAX_REPEAT_USES per STAGE (reset in
          // startStage(), see its comment) so it can't be used to spam the
          // session, while not letting a mishap early in Teil 1 cost the
          // candidate their repeat allowance for the rest of the exam.
          // Doesn't touch the score/credit logic.
          if (room!.repeatCount >= MAX_REPEAT_USES) {
            send(ws, { type: "repeat_denied" });
          } else {
            room!.repeatCount++;
            room!.live.sendSystemMessage(
              `Der Kandidat hat um Wiederholung gebeten. Wiederholen Sie freundlich und knapp nur Ihre letzte Aussage bzw. Frage, ohne eine neue Frage zu stellen.`,
            );
            broadcast(room!, { type: "repeat_ack", remaining: MAX_REPEAT_USES - room!.repeatCount });
          }
        }
      } catch (e) { console.error(`[room ${roomId}] bad client message:`, e); }
    });

    ws.on("close", () => {
      room!.participants.delete(userId);
      // Once finishExam() has started, it owns ending the room (it needs to
      // finish writing the transcript + generating both evaluations first).
      // Without this check, a participant's socket closing during that window
      // — even just the client tearing down after seeing "finished" — races
      // finishExam()'s own endRoom("completed") call and can win with a wrong
      // "disconnect_timeout" reason, clobbering the correct one. Caught by
      // actually running the full exam lifecycle, not by inspection.
      if (room!.finishing) return;
      // Real fix, found during a full audit: this used to end the room
      // IMMEDIATELY with zero grace period the instant BOTH participants'
      // sockets happened to close close together (e.g. a shared network
      // blip, or both tabs backgrounded at once) — each socket's "close"
      // handler fires independently and isn't coordinated, so the SECOND
      // one to fire always saw participants.size===0 and ended the room on
      // the spot, silently clearing whatever grace timer the first
      // disconnect had already scheduled. Neither candidate got any
      // chance to reconnect in that case, unlike a single-candidate
      // disconnect. Now both cases get the identical RECONNECT_GRACE_MS
      // window — symmetric treatment, same broadcast/reason once it
      // actually expires. (Spec's "AI pivots to play both roles" for a
      // remaining student is still NOT implemented — see file header.)
      const timer = setTimeout(async () => {
        // Both sides' sockets schedule their own identical timer (see the
        // comment above), so both can fire here — guard the same way as the
        // other early-end paths so only the first one actually speaks/ends.
        if (room!.finishing) return;
        room!.finishing = true;
        await room!.live?.speakScriptedText(pickEarlyEnd("partner_disconnected", room!.live?.getVoiceId() ?? "gemini-default"));
        broadcast(room!, { type: "terminated", reason: "partner_disconnected" });
        endRoom(room!, "disconnect_timeout");
      }, RECONNECT_GRACE_MS);
      room!.disconnectTimers.set(userId, timer);
    });
  } catch (e) {
    console.error("connection setup failed:", e);
    ws.close(1011, "internal error");
  }
});

// ============================================================
// Shared upgrade dispatcher for BOTH WebSocketServers (see the noServer:true
// comment above) — routes purely by path prefix, `/room/` to the existing
// exam `wss` (its own connection logic below is completely unchanged) and
// `/tutor/` to the new `tutorWss`.
// ============================================================
const tutorWss = new WebSocketServer({ noServer: true });
httpServer.on("upgrade", (req, socket, head) => {
  const pathname = new URL(req.url ?? "", "http://localhost").pathname;
  if (pathname.startsWith("/tutor/")) {
    tutorWss.handleUpgrade(req, socket, head, (ws) => tutorWss.emit("connection", ws, req));
  } else {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  }
});

tutorWss.on("connection", async (ws, req) => {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const sessionId = url.pathname.split("/").filter(Boolean)[1]; // /tutor/<sessionId> — voice_tutor_sessions.id, created by the student's OWN client before connecting (see file header)
    const token = url.searchParams.get("token");
    // Same "silent rejection is undebuggable from production logs alone"
    // fix as the /room path above — see its comment for the real incident
    // that motivated this.
    if (!sessionId || !token) { console.warn(`[tutor] rejecting connection: missing session or token (url=${req.url})`); ws.close(4000, "missing session or token"); return; }

    const asUser = await userScopedClient(token);
    const { data: userData, error: authError } = await asUser.auth.getUser(token);
    if (authError || !userData?.user) { console.warn(`[tutor ${sessionId}] rejecting connection: invalid token — ${authError?.message ?? "no user in response"}`); ws.close(4001, "invalid token"); return; }
    const userId = userData.user.id;

    // asUser (not admin) so voice_tutor_sessions' own "select own or admin"
    // RLS policy does the ownership check for us — a stranger's sessionId
    // simply returns no row here, exactly like a wrong/foreign roomId does
    // on the exam's /room path. No muendlich_participants-style lookup
    // needed — a 1:1 tutor session has no participants table at all.
    const { data: sessionRow, error: sessionError } = await asUser
      .from("voice_tutor_sessions")
      .select("id, level, ended_at, teil1_material_id, teil2_material_id, teil3_material_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!sessionRow) { console.warn(`[tutor ${sessionId}] rejecting connection: session not found or not owned by this user${sessionError ? ` (query error: ${sessionError.message})` : ""}`); ws.close(4004, "session not found"); return; }
    if (sessionRow.ended_at) { console.warn(`[tutor ${sessionId}] rejecting connection: session already ended`); ws.close(4005, "session already ended"); return; }
    // All three Teil topics are required, not just Teil 1 — this build
    // always runs Teil 1 -> 2 -> 3 straight through (see tutorTickTeil1/2's
    // handoffs), so a session missing any one of them would hit a later Teil
    // having nothing to talk about. The picker route enforces this at
    // selection time; this is the server-side backstop.
    if (!sessionRow.teil1_material_id) { console.warn(`[tutor ${sessionId}] rejecting connection: no Teil 1 topic selected`); ws.close(4006, "missing topic selection"); return; }
    if (!sessionRow.teil2_material_id) { console.warn(`[tutor ${sessionId}] rejecting connection: no Teil 2 topic selected`); ws.close(4006, "missing topic selection"); return; }
    if (!sessionRow.teil3_material_id) { console.warn(`[tutor ${sessionId}] rejecting connection: no Teil 3 topic selected`); ws.close(4006, "missing topic selection"); return; }

    const [{ data: material1 }, { data: material2 }, { data: material3 }, { data: profile }] = await Promise.all([
      admin.from("muendlich_materials").select("title, body_text").eq("id", sessionRow.teil1_material_id).maybeSingle(),
      admin.from("muendlich_materials").select("title, body_text").eq("id", sessionRow.teil2_material_id).maybeSingle(),
      admin.from("muendlich_materials").select("title, body_text").eq("id", sessionRow.teil3_material_id).maybeSingle(),
      admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);
    if (!material1) { console.warn(`[tutor ${sessionId}] rejecting connection: referenced Teil 1 material row no longer exists`); ws.close(4007, "topic not found"); return; }
    if (!material2) { console.warn(`[tutor ${sessionId}] rejecting connection: referenced Teil 2 material row no longer exists`); ws.close(4007, "topic not found"); return; }
    if (!material3) { console.warn(`[tutor ${sessionId}] rejecting connection: referenced Teil 3 material row no longer exists`); ws.close(4007, "topic not found"); return; }

    const studentName = profile?.full_name || "Student";

    const session = await startTutorSession(ws, userId, token, {
      id: sessionRow.id,
      teil1MaterialTitle: material1.title, teil1MaterialBodyText: material1.body_text,
      teil2MaterialTitle: material2.title, teil2MaterialBodyText: material2.body_text,
      teil3MaterialTitle: material3.title, teil3MaterialBodyText: material3.body_text,
    }, sessionRow.level as "TELC_B1" | "TELC_B2", studentName);
    if (!session) return; // startTutorSession already closed the socket with a clear reason

    ws.on("message", (raw) => {
      if (session.ended) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          send(ws, { type: "pong", t: msg.t });
        } else if (msg.type === "audio" && session.live) {
          session.lastAudioAt = Date.now();
          session.live.sendAudioChunk(msg.data);
        }
      } catch (e) { console.error(`[tutor ${session.sessionId}] bad client message:`, e); }
    });

    ws.on("close", () => {
      if (!session.ended) endTutorSession(session, "completed_by_user");
    });
  } catch (e) {
    console.error("[tutor] connection setup failed:", e);
    ws.close(1011, "internal error");
  }
});

httpServer.listen(PORT, () => console.log(`muendlich-relay listening on :${PORT}`));
