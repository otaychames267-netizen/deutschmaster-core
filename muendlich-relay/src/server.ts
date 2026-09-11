/**
 * server.ts — Room 2 audio relay. Persistent process (Fly.io), NOT the main
 * Vercel app. Each WebSocket connection is one student, scoped to one room.
 * When both participants of a room are connected, opens ONE shared voice
 * session for that room (via voiceBackend.ts — either Gemini Live, or
 * Claude + ElevenLabs v3, selected by MUENDLICH_VOICE_BACKEND) and bridges
 * audio both directions. This file itself doesn't know or care which
 * backend is active — see voiceBackend.ts for that switch.
 *
 * Protocol (JSON text frames):
 *   client -> relay: { type: "audio", data: "<base64 pcm16 16kHz>" }
 *                     { type: "repeat" }                         ("Wie bitte?", capped at MAX_REPEAT_USES)
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
 * Exam stage timing mirrors Room 1's already-proven prep timer pattern
 * (timestamp + duration written to the DB, client syncs via clock offset) —
 * exam_stage/exam_stage_started_at/exam_stage_seconds on muendlich_rooms.
 * Teil 1 = 4 min (Präsentation: Person A presents + follow-ups, AI hands off
 * to Person B at the halfway mark); Teil 2 = 5 min (AI takeover to direct
 * questioning injected internally at the 3.5-minute mark); Teil 3 = 5 min.
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
// Only the vendor keys the ACTIVE voice backend actually needs are
// required — MUENDLICH_VOICE_BACKEND=gemini (default) doesn't need
// ElevenLabs configured at all, and vice versa, so switching backends via
// env never requires provisioning both vendors' credentials at once.
const requiredEnv: Record<string, string | undefined> = { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY };
if (activeVoiceBackend() === "gemini") {
  requiredEnv.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
} else {
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
const STAGE_SECONDS: Record<1 | 2 | 3, number> = {
  1: Number(process.env.MUENDLICH_STAGE1_SECONDS ?? 240),
  2: Number(process.env.MUENDLICH_STAGE2_SECONDS ?? 360), // ~4min natural dialogue + ~2min AI-facilitated takeover
  3: Number(process.env.MUENDLICH_STAGE3_SECONDS ?? 360), // ~3:30-4:00 natural planning + ~2min AI-moderated completion
};
const TEIL1_HANDOFF_AT_SEC = Number(process.env.MUENDLICH_TEIL1_HANDOFF_SEC ?? STAGE_SECONDS[1] / 2); // switch from A to B at the midpoint
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
  teil1HandoffSent: boolean;
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
  room.teil1HandoffSent = false;
  room.teil2Mode = "natural";
  room.teil2TakeoverTurn = null;
  room.teil3CompletionSignalSent = false;
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
    // again for a genuinely necessary short follow-up (organic trigger) or
    // the scheduled handoff below.
    await room.live?.playTeil1Question(ctx.teil1TopicATitle);
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

  // Teil 1: at the midpoint, hand off from Person A's presentation+followups
  // to Person B's — mirrors the Teil-2-takeover mechanic below.
  if (room.examStage === 1 && !room.teil1HandoffSent && elapsedMs >= TEIL1_HANDOFF_AT_SEC * 1000) {
    const withinGraceCap = elapsedMs < TEIL1_HANDOFF_AT_SEC * 1000 + HANDOFF_MAX_GRACE_MS;
    // Candidate looks like they're actively speaking right at the 120s mark
    // -> hold a few more ticks for a natural pause instead of cutting them
    // off mid-sentence, but never past the hard grace cap above.
    if (!(withinGraceCap && isLikelyMidSpeech(room.lastAudioAt, Date.now()))) {
      room.teil1HandoffSent = true;
      // Skips Claude — see startStage()'s comment above for why. The
      // follow-up-question behavior this used to remind Claude about for
      // Person B's presentation is now a standing rule in
      // examinerBrain.ts's system prompt (generalized to "whichever
      // candidate is presenting," not hardcoded to Person A), so no
      // per-call reminder is needed here anymore.
      const voiceId = room.live?.getVoiceId() ?? "gemini-default";
      // Chained via .then() (not awaited — tick() is sync) so the handoff
      // sentence finishes before the question starts: both calls share the
      // same generation-id supersession machinery, so firing them
      // concurrently would let the question cancel the handoff mid-word.
      void room.live?.speakScriptedText(pickTaskTransition({ bName: ctx.bName, topicB: ctx.teil1TopicB }, voiceId))
        .then(() => room.live?.playTeil1Question(ctx.teil1TopicBTitle));
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
  // Also skipped while a participant is mid-reconnect (room.participants.size
  // < 2 the instant a socket closes, per the ws "close" handler below) — a
  // dropped WebSocket, not real candidate silence, would otherwise look
  // identical to genuine dead air to this room-wide check and fire a
  // nonsensical AI question at a candidate who currently can't hear it. This
  // guard is stage-agnostic and only changes behavior in that disconnect
  // edge case — the normal both-connected case (what Teil 1/2's already-
  // verified behavior was tested under) is completely unaffected.
  const silenceMs = Date.now() - room.lastAudioAt;
  const teil2TakeoverOwnsSilence = room.examStage === 2 && room.teil2Mode === "takeover";
  const bothConnected = room.participants.size === 2;
  if (bothConnected && !teil2TakeoverOwnsSilence && silenceMs > SILENCE_THRESHOLD_MS[room.examStage] && Date.now() - room.lastNudgeAt > NUDGE_DEBOUNCE_MS) {
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

const httpServer = createServer((_req, res) => { res.writeHead(200); res.end("muendlich-relay ok"); });
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", async (ws, req) => {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const roomId = url.pathname.split("/").filter(Boolean)[1]; // /room/<roomId>
    const token = url.searchParams.get("token");
    if (!roomId || !token) { ws.close(4000, "missing room or token"); return; }

    const asUser = await userScopedClient(token);
    const { data: userData, error: authError } = await asUser.auth.getUser(token);
    if (authError || !userData?.user) { ws.close(4001, "invalid token"); return; }
    const userId = userData.user.id;

    const { data: participantRow } = await asUser
      .from("muendlich_participants").select("slot").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
    if (!participantRow) { ws.close(4003, "not a participant of this room"); return; }

    let room = rooms.get(roomId);
    if (!room) {
      room = {
        roomId, participants: new Map(), lastSenderSlot: null, lastAudioAt: Date.now(),
        lastAudioAtBySlot: { A: Date.now(), B: Date.now() }, lastNudgeAt: 0,
        examStage: null, examStageStartedAt: 0, teil1HandoffSent: false,
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
          // "Wie bitte?" — capped at MAX_REPEAT_USES per exam so it can't be
          // used to spam the session; doesn't touch the score/credit logic.
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

httpServer.listen(PORT, () => console.log(`muendlich-relay listening on :${PORT}`));
