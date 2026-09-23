/**
 * server.ts — Room 2 audio relay. Persistent process (Fly.io), NOT the main
 * Vercel app. Each WebSocket connection is one student, scoped to one room.
 * When both participants of a room are connected, opens ONE shared voice
 * session for that room (via voiceBackend.ts — either Gemini Live, or
 * Claude + ElevenLabs v3, selected by MUENDLICH_VOICE_BACKEND) and bridges
 * audio both directions. This file itself doesn't know or care which
 * backend is active — see voiceBackend.ts for that switch.
 *
 * Also hosts a SEPARATE, additive `/tutor/:scenarioId` path for the 1:1 AI
 * Voice Tutor (free-conversation speaking practice) — see the "AI Voice
 * Tutor" sections below. It shares this process/port but has its own
 * session map, its own (always-Gemini-Live) session opener
 * (tutorGeminiLive.ts), and its own daily-cap RPCs; it never touches
 * `rooms`/`RoomSession` or any exam-only table/RPC.
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
 * Protocol, AI Voice Tutor (`/tutor/:scenarioId`) — a subset of the above
 * plus one new message type, no stage/intermission/repeat concepts (free-
 * flowing 1:1 chat has none):
 *   client -> relay: { type: "audio", data: "<base64 pcm16 16kHz>" }
 *                     { type: "ping", t }
 *   relay -> client: { type: "pong", t }
 *                     { type: "ready", sessionId }                (sessionId is voice_tutor_sessions.id — the client needs it to later call POST /api/muendlich/tutor-correction in the main app; the exam has no equivalent since its evaluation is triggered server-side)
 *                     { type: "cap_status", secondsRemaining }    (NEW — sent at session start and after each minute-tick; the exam has no equivalent since it hard-stops silently, but for money-metered practice time a visible, server-authoritative countdown is better UX)
 *                     { type: "nudge" }
 *                     { type: "audio", data: "<base64 pcm16 24kHz>" }
 *                     { type: "transcript", speaker: "tutor"|"student", text }
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
import { openTutorLiveSession, type TutorContext, type TutorLiveSession } from "./tutorGeminiLive.js";
import { generateMuendlichEvaluation } from "./muendlich-evaluator.js";
import { pickExamStart, pickTaskTransition, pickSectionTransition12, pickSectionTransition23 } from "./examinerPhrases.js";
import { checkCreditBudget, recordExamUsage } from "./voice/creditBudget.js";

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
// Only the vendor keys the ACTIVE 2-candidate-exam voice backend actually
// needs are conditionally required — MUENDLICH_VOICE_BACKEND=gemini
// (default) doesn't need ElevenLabs configured at all, and vice versa, so
// switching the EXAM's backend via env never requires provisioning both
// vendors' credentials at once. GEMINI_API_KEY is separately unconditional
// below because the AI Voice Tutor always talks to Gemini Live directly
// (tutorGeminiLive.ts never reads MUENDLICH_VOICE_BACKEND) regardless of
// which backend the exam room is currently configured to use.
const requiredEnv: Record<string, string | undefined> = { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY: process.env.GEMINI_API_KEY };
if (activeVoiceBackend() === "elevenlabs") {
  requiredEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  requiredEnv.ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
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

// --- AI Voice Tutor (1:1 speaking practice) constants ---------------------
// A free-flowing 1:1 conversation is closer to Teil 1's "candidate collecting
// their thoughts" tolerance than Teil 2/3's tighter exam thresholds, so this
// borrows Teil 1's own SILENCE_THRESHOLD_MS[1] value rather than introducing
// an unrelated number. CREDIT_TICK_MS, NUDGE_DEBOUNCE_MS, and
// HARD_IDLE_CLOSE_MS above are reused as-is for the tutor — same cadence,
// same "don't nag, but don't run unattended forever" reasoning applies.
const TUTOR_SILENCE_THRESHOLD_MS = Number(process.env.VOICE_TUTOR_SILENCE_MS ?? SILENCE_THRESHOLD_MS[1]);
const VOICE_TUTOR_DAILY_CAP_SECONDS = 2700; // 45 minutes — must match deduct_voice_tutor_seconds()'s hardcoded cap

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
  sessionId: string; // voice_tutor_sessions.id, created the moment the socket connects
  userId: string;
  accessToken: string;
  ws: WebSocket;
  live?: TutorLiveSession;
  level: "TELC_B1" | "TELC_B2";
  scenarioId: string;
  lastAudioAt: number;
  lastNudgeAt: number;
  creditTick?: NodeJS.Timeout;
  idleTick?: NodeJS.Timeout;
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
      console.log(`[room ${room.roomId}] credit deduction failed, hard-stopping:`, error.message);
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
        broadcast(room, { type: "terminated", reason: "insufficient_minutes" });
        endRoom(room, "insufficient_credits_mid_exam");
      }
    }
  }, CREDIT_TICK_MS);

  // Stage transitions + Teil-2 AI-takeover instruction + anti-silence nudges.
  room.mainTick = setInterval(() => tick(room, ctx), TICK_MS);
}

function tick(room: RoomSession, ctx: { aName: string; bName: string; teil1TopicA: string; teil1TopicATitle: string; teil1TopicB: string; teil1TopicBTitle: string; teil2Topic: string; teil3Topic: string }) {
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

function logTutorTranscript(session: TutorSession, speaker: "tutor" | "student", text: string) {
  send(session.ws, { type: "transcript", speaker, text });
  admin.from("voice_tutor_transcript_nodes").insert({
    session_id: session.sessionId, speaker, text, started_at: new Date().toISOString(),
  }).then(() => {});
}

function endTutorSession(session: TutorSession, endReason: string) {
  // Same re-entry guard as endRoom() — closing the socket below fires its own
  // "close" handler, which would otherwise call this a second time.
  if (session.ended) return;
  session.ended = true;

  // Same global-ledger recording pattern as endRoom() — this is the
  // platform-wide cost ceiling, separate from (and still necessary alongside)
  // the per-user daily-cap RPC already enforced by the credit tick below.
  if (session.liveSessionStartedAt) {
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - session.liveSessionStartedAt) / 60_000));
    admin.rpc("record_api_usage", { p_tokens: elapsedMinutes * GEMINI_AUDIO_TOKENS_PER_MINUTE }).then(({ error }) => {
      if (error) console.error(`[tutor ${session.sessionId}] failed to record API usage:`, error.message);
    });
  }

  session.live?.close();
  if (session.creditTick) clearInterval(session.creditTick);
  if (session.idleTick) clearInterval(session.idleTick);
  session.ws.close();

  admin.from("voice_tutor_sessions").update({
    ended_at: new Date().toISOString(), end_reason: endReason,
  }).eq("id", session.sessionId).then(() => {});

  tutorSessions.delete(session.sessionId);
}

/** Pre-flight-gates, opens the Gemini Live session, and wires the per-minute
 * daily-cap tick + a small silence/idle checker. Returns null (having already
 * closed the socket with a clear reason) if a pre-flight check fails or
 * session creation itself errors — the caller should just stop, not treat
 * that as an unexpected failure. */
async function startTutorSession(
  ws: WebSocket,
  userId: string,
  accessToken: string,
  scenario: { id: string; title: string; system_prompt_fragment: string },
  level: "TELC_B1" | "TELC_B2",
  studentName: string,
): Promise<TutorSession | null> {
  const asUser = await userScopedClient(accessToken);

  // Per-user daily cap, checked BEFORE any Gemini session opens — mirrors the
  // exam's own pre-flight-guard-before-any-cost pattern in startRoomIfReady().
  const { data: capRows, error: capError } = await asUser.rpc("get_my_voice_tutor_cap_status", { p_level: level });
  const capRow = Array.isArray(capRows) ? capRows[0] : capRows;
  if (capError || !capRow || capRow.seconds_remaining <= 0) {
    send(ws, { type: "terminated", reason: "daily_cap_exceeded" });
    ws.close(4009, "daily cap exceeded");
    return null;
  }

  // Same global platform-wide Gemini cost ceiling the exam room checks —
  // separate from, and still necessary alongside, the per-user cap above.
  const { data: usage } = await admin.rpc("get_today_api_usage");
  const dailyCap = Number(process.env.GEMINI_DAILY_TOKEN_CAP ?? Infinity);
  if (Number.isFinite(dailyCap) && typeof usage === "number" && usage >= dailyCap) {
    console.log(`[tutor] daily Gemini budget exceeded (${usage}/${dailyCap} tokens), refusing new session`);
    send(ws, { type: "terminated", reason: "budget_exceeded" });
    ws.close(4010, "budget exceeded");
    return null;
  }

  const { data: sessionRow, error: insertError } = await admin
    .from("voice_tutor_sessions")
    .insert({ user_id: userId, scenario_id: scenario.id, level })
    .select("id")
    .single();
  if (insertError || !sessionRow) {
    console.error("[tutor] failed to create voice_tutor_sessions row:", insertError?.message);
    ws.close(1011, "internal error");
    return null;
  }

  const session: TutorSession = {
    sessionId: sessionRow.id, userId, accessToken, ws,
    level, scenarioId: scenario.id,
    lastAudioAt: Date.now(), lastNudgeAt: 0,
    liveSessionStartedAt: null, ended: false, voiceBackendErrored: false,
  };
  tutorSessions.set(session.sessionId, session);

  const ctx: TutorContext = {
    studentName, level: level === "TELC_B1" ? "B1" : "B2",
    scenarioTitle: scenario.title, scenarioPromptFragment: scenario.system_prompt_fragment,
  };

  session.live = await openTutorLiveSession(ctx, {
    // NOTE: do not rely on session.live inside onOpen — verified live that
    // the underlying SDK's "open" event fires BEFORE ai.live.connect()'s own
    // promise resolves, so `session.live` is still undefined here (an
    // optional-chained `session.live?.foo()` call silently no-ops instead of
    // throwing, which is what made this easy to miss without a live test).
    // Anything needing session.live runs after the `await` below instead.
    onOpen: () => {},
    onAudioChunk: (b64) => send(ws, { type: "audio", data: b64 }),
    onOutputTranscript: (text) => logTutorTranscript(session, "tutor", text),
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

  // sessionId lets the client call the deferred correction API after the
  // conversation ends (POST /api/muendlich/tutor-correction) — the exam
  // protocol has no equivalent since its evaluation is triggered server-side
  // (finishExam), but the tutor's correction pass is a separate main-app API
  // call the CLIENT initiates, so it needs this id.
  send(ws, { type: "ready", sessionId: session.sessionId });
  send(ws, { type: "cap_status", secondsRemaining: capRow.seconds_remaining });
  // Gemini Live does not reliably speak first on its own without an explicit
  // trigger — same finding already documented for the exam room's Teil-1
  // opening (see startStage()'s comment there). Unlike the exam's formal,
  // exactly-scripted opening line, the tutor's casual tone doesn't need
  // verbatim phrasing, so a single [SYSTEM] instruction is enough.
  session.live.session.sendClientContent({
    turns: `[SYSTEM] Begrüße ${studentName} freundlich und kurz, und leite dann direkt zum heutigen Übungsthema "${scenario.title}" über.`,
    turnComplete: true,
  });

  // Per-minute daily-cap deduction — same cadence as the exam's CREDIT_TICK_MS.
  session.creditTick = setInterval(async () => {
    if (session.voiceBackendErrored || session.ended) return;
    const { error } = await asUser.rpc("deduct_voice_tutor_seconds", { p_seconds: 60, p_level: level });
    if (error) {
      console.log(`[tutor ${session.sessionId}] daily cap deduction failed, hard-stopping:`, error.message);
      send(ws, { type: "terminated", reason: "daily_cap_exceeded" });
      endTutorSession(session, "daily_cap_exceeded");
      return;
    }
    const { data: statusRows } = await asUser.rpc("get_my_voice_tutor_cap_status", { p_level: level });
    const status = Array.isArray(statusRows) ? statusRows[0] : statusRows;
    if (status) send(ws, { type: "cap_status", secondsRemaining: status.seconds_remaining });
  }, CREDIT_TICK_MS);

  // Much smaller than the exam's tick() — one lastAudioAt, one threshold, no
  // per-Teil/per-slot branching, no scheduled marks (a free-flowing 1:1 chat
  // has none) so there is no isLikelyMidSpeech()-style grace window to check
  // here — that helper only matters at a fixed scheduled moment, not a
  // floating silence threshold like this one.
  session.idleTick = setInterval(() => {
    if (session.ended) return;
    const now = Date.now();
    const silenceMs = now - session.lastAudioAt;

    if (silenceMs > HARD_IDLE_CLOSE_MS) {
      console.log(`[tutor ${session.sessionId}] hard idle-close: ${silenceMs}ms of silence`);
      send(ws, { type: "terminated", reason: "idle_timeout" });
      endTutorSession(session, "idle_timeout");
      return;
    }
    if (silenceMs > TUTOR_SILENCE_THRESHOLD_MS && now - session.lastNudgeAt > NUDGE_DEBOUNCE_MS) {
      session.lastNudgeAt = now;
      send(ws, { type: "nudge" });
      session.live?.session.sendClientContent({
        turns: "[SYSTEM] Der Student war eine Weile still — ermutigen Sie ihn freundlich, weiterzusprechen, zum Beispiel mit einer einfacheren oder konkreteren Frage zum heutigen Thema.",
        turnComplete: true,
      });
    }
  }, TICK_MS);

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
      const timer = setTimeout(() => {
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
    const scenarioId = url.pathname.split("/").filter(Boolean)[1]; // /tutor/<scenarioId>
    const token = url.searchParams.get("token");
    // Same "silent rejection is undebuggable from production logs alone"
    // fix as the /room path above — see its comment for the real incident
    // that motivated this.
    if (!scenarioId || !token) { console.warn(`[tutor] rejecting connection: missing scenario or token (url=${req.url})`); ws.close(4000, "missing scenario or token"); return; }

    const asUser = await userScopedClient(token);
    const { data: userData, error: authError } = await asUser.auth.getUser(token);
    if (authError || !userData?.user) { console.warn(`[tutor ${scenarioId}] rejecting connection: invalid token — ${authError?.message ?? "no user in response"}`); ws.close(4001, "invalid token"); return; }
    const userId = userData.user.id;

    // No muendlich_participants lookup — a 1:1 tutor session has no
    // participants table at all, unlike the exam's /room/:roomId path.
    const [{ data: scenario }, { data: profile }] = await Promise.all([
      admin.from("voice_tutor_scenarios").select("id, title, system_prompt_fragment").eq("id", scenarioId).eq("is_active", true).maybeSingle(),
      admin.from("profiles").select("full_name, level").eq("id", userId).maybeSingle(),
    ]);
    if (!scenario) { console.warn(`[tutor ${scenarioId}] rejecting connection: scenario not found or inactive`); ws.close(4004, "scenario not found"); return; }

    const level: "TELC_B1" | "TELC_B2" = String(profile?.level ?? "").toUpperCase().includes("B1") ? "TELC_B1" : "TELC_B2";
    const studentName = profile?.full_name || "Student";

    const session = await startTutorSession(ws, userId, token, scenario, level, studentName);
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
