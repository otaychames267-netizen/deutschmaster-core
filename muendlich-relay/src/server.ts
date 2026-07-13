/**
 * server.ts — Room 2 audio relay. Persistent process (Fly.io), NOT the main
 * Vercel app. Each WebSocket connection is one student, scoped to one room.
 * When both participants of a room are connected, opens ONE shared Gemini
 * Live session for that room and bridges audio both directions.
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
import { openMuendlichLiveSession, type MuendlichLiveSession } from "./geminiLive.js";
import { generateMuendlichEvaluation } from "./muendlich-evaluator.js";

const PORT = Number(process.env.PORT ?? 8787);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY: process.env.GEMINI_API_KEY })) {
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
  2: Number(process.env.MUENDLICH_STAGE2_SECONDS ?? 300),
  3: Number(process.env.MUENDLICH_STAGE3_SECONDS ?? 300),
};
const TEIL1_HANDOFF_AT_SEC = Number(process.env.MUENDLICH_TEIL1_HANDOFF_SEC ?? STAGE_SECONDS[1] / 2); // switch from A to B at the midpoint
const TEIL2_TAKEOVER_AT_SEC = Number(process.env.MUENDLICH_TEIL2_TAKEOVER_SEC ?? 210); // 3.5 minutes into Teil 2
// Teil 1 gets a longer threshold than Teil 2 — a candidate collecting their
// thoughts mid-presentation is normal, unlike a stalled back-and-forth discussion.
const SILENCE_THRESHOLD_MS: Record<1 | 2 | 3, number> = { 1: 8_000, 2: 4_000, 3: 10_000 };
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
  live?: MuendlichLiveSession;
  examSessionId?: string;
  lastSenderSlot: "A" | "B" | null;
  lastAudioAt: number;
  lastNudgeAt: number;
  examStage: 1 | 2 | 3 | null;
  examStageStartedAt: number;
  teil1HandoffSent: boolean;
  teil2TakeoverSent: boolean;
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
  geminiErrored: boolean;
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

/** Teil 1 title -> "title (guiding points)" for the system prompt, so the AI
 * knows what a candidate's chosen category is actually meant to cover — falls
 * back to the bare title if the material row (or its body_text) is missing. */
function formatTeil1Topic(title: string | undefined, materials: { title: string; body_text: string | null }[] | null | undefined): string {
  if (!title) return "(kein Thema ausgewählt)";
  const m = materials?.find((x) => x.title === title);
  return m?.body_text ? `${title} (${m.body_text})` : title;
}

async function fetchRoomContext(roomId: string, participants: Participant[]) {
  const a = participants.find((p) => p.slot === "A")!;
  const b = participants.find((p) => p.slot === "B")!;

  const [profilesRes, selectionsRes, teil1MaterialsRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, level").in("id", [a.userId, b.userId]),
    admin.from("muendlich_selections").select("teil, slot, value").eq("room_id", roomId).in("teil", [1, 2, 3]),
    admin.from("muendlich_materials").select("title, body_text").eq("teil", 1).eq("category", "themen"),
  ]);

  const nameOf = (userId: string) => profilesRes.data?.find((p) => p.id === userId)?.full_name || "Kandidat";
  const teil1A = selectionsRes.data?.find((s) => s.teil === 1 && s.slot === "A")?.value;
  const teil1B = selectionsRes.data?.find((s) => s.teil === 1 && s.slot === "B")?.value;
  const teil2 = selectionsRes.data?.find((s) => s.teil === 2)?.value ?? "(kein Thema ausgewählt)";
  const teil3 = selectionsRes.data?.find((s) => s.teil === 3)?.value ?? "(kein Thema ausgewählt)";

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
    teil1TopicA: formatTeil1Topic(teil1A, teil1MaterialsRes.data),
    teil1TopicB: formatTeil1Topic(teil1B, teil1MaterialsRes.data),
    teil2Topic: teil2, teil3Topic: teil3,
    aName: nameOf(a.userId), bName: nameOf(b.userId),
    level,
  };
}

function logTranscript(room: RoomSession, speaker: string, teil: number, text: string) {
  broadcast(room, { type: "transcript", speaker, text });
  if (room.examSessionId) {
    admin.from("muendlich_transcript_nodes").insert({
      session_id: room.examSessionId, speaker, teil, text, started_at: new Date().toISOString(),
    }).then(() => {});
  }
}

async function startStage(room: RoomSession, stage: 1 | 2 | 3, ctx?: { aName: string; bName: string; teil1TopicA: string }) {
  room.examStage = stage;
  room.examStageStartedAt = Date.now();
  room.lastAudioAt = Date.now(); // reset so setup/connection latency doesn't eat into the anti-silence budget
  room.teil1HandoffSent = false;
  room.teil2TakeoverSent = false;
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
  if (stage === 1 && ctx) {
    room.live?.session.sendClientContent({
      turns: `[SYSTEM] Die Prüfung beginnt jetzt. Begrüßen Sie ${ctx.aName} und ${ctx.bName} kurz und laden Sie dann ${ctx.aName} ein: "${ctx.aName}, bitte präsentieren Sie jetzt Ihr Thema: ${ctx.teil1TopicA}. Sie haben dafür etwa anderthalb Minuten."`,
      turnComplete: true,
    });
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

  const { data: sessionRow } = await admin
    .from("muendlich_exam_sessions")
    .insert({ room_id: room.roomId })
    .select("id")
    .single();
  room.examSessionId = sessionRow?.id;

  room.live = await openMuendlichLiveSession(ctx, {
    onOpen: async () => {
      broadcast(room, { type: "ready" });
      await startStage(room, 1, ctx);
    },
    onAudioChunk: (b64) => broadcast(room, { type: "audio", data: b64 }),
    onOutputTranscript: (text) => logTranscript(room, "examiner", room.examStage ?? 2, text),
    onInputTranscript: (text) => logTranscript(room, room.lastSenderSlot ?? "A", room.examStage ?? 2, text),
    onError: (message) => {
      console.error(`[room ${room.roomId}] Gemini Live error:`, message);
      // Set before broadcasting/ending — a credit tick already in flight
      // checks this flag first and skips charging for a minute the session
      // couldn't actually deliver.
      room.geminiErrored = true;
      broadcast(room, { type: "terminated", reason: "ai_error" });
      endRoom(room, "technical_issue");
    },
    onClose: (reason) => console.log(`[room ${room.roomId}] Gemini Live closed:`, reason),
  });
  room.liveSessionStartedAt = Date.now();

  // Atomic dual-deduction, one tick per elapsed minute — hard-stops the room
  // the instant either participant's balance/window can't cover it.
  room.creditTick = setInterval(async () => {
    if (room.geminiErrored) return;
    const [pa, pb] = [participants[0], participants[1]];
    const asUser = await userScopedClient(pa.accessToken);
    const { error } = await asUser.rpc("deduct_muendlich_minutes_dual", {
      p_room_id: room.roomId, p_user_a: pa.userId, p_user_b: pb.userId, p_minutes: 1,
    });
    if (error) {
      console.log(`[room ${room.roomId}] credit deduction failed, hard-stopping:`, error.message);
      broadcast(room, { type: "terminated", reason: error.message.includes("INSUFFICIENT") ? "insufficient_minutes" : "window_expired" });
      endRoom(room, "expired_mid_exam");
    }
  }, CREDIT_TICK_MS);

  // Stage transitions + Teil-2 AI-takeover instruction + anti-silence nudges.
  room.mainTick = setInterval(() => tick(room, ctx), TICK_MS);
}

function tick(room: RoomSession, ctx: { aName: string; bName: string; teil1TopicB: string }) {
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
      else startStage(room, next);
    }
    return;
  }

  if (!room.examStage) return;
  const elapsedMs = Date.now() - room.examStageStartedAt;
  const stageSeconds = STAGE_SECONDS[room.examStage];

  // Teil 1: at the midpoint, hand off from Person A's presentation+followups
  // to Person B's — mirrors the Teil-2-takeover mechanic below.
  if (room.examStage === 1 && !room.teil1HandoffSent && elapsedMs >= TEIL1_HANDOFF_AT_SEC * 1000) {
    room.teil1HandoffSent = true;
    room.live?.session.sendClientContent({
      turns: `[SYSTEM] Die Zeit für ${ctx.aName}s Präsentation und Nachfragen ist um. Beenden Sie höflich diesen Teil und übergeben Sie jetzt an ${ctx.bName}: "${ctx.bName}, jetzt sind Sie dran. Bitte präsentieren Sie Ihr Thema: ${ctx.teil1TopicB}. Sie haben dafür etwa anderthalb Minuten." Hören Sie sich die Präsentation an, ohne zu unterbrechen, und stellen Sie danach 1-2 kurze Nachfragen.`,
      turnComplete: true,
    });
  }

  // Teil 2: at the 3.5-minute mark, the AI must switch from listening to the
  // students' own conversation into asking each candidate a direct question.
  if (room.examStage === 2 && !room.teil2TakeoverSent && elapsedMs >= TEIL2_TAKEOVER_AT_SEC * 1000) {
    room.teil2TakeoverSent = true;
    room.live?.session.sendClientContent({
      turns: `[SYSTEM] Die 3,5-Minuten-Marke ist erreicht. Übernehmen Sie jetzt aktiv die Gesprächsführung: unterbrechen Sie das Gespräch der Kandidaten höflich, stellen Sie ${ctx.aName} eine gezielte Frage, warten Sie auf die Antwort, dann stellen Sie ${ctx.bName} eine unabhängige Frage. Jede Antwort maximal 30 Sekunden.`,
      turnComplete: true,
    });
  }

  // Anti-silence: nobody has sent audio in a while during Teil 2/3 -> AI takes over.
  const silenceMs = Date.now() - room.lastAudioAt;
  if (silenceMs > SILENCE_THRESHOLD_MS[room.examStage] && Date.now() - room.lastNudgeAt > NUDGE_DEBOUNCE_MS) {
    room.lastNudgeAt = Date.now();
    broadcast(room, { type: "nudge" }); // surfaces the AI's takeover to the client as a toast
    room.live?.session.sendClientContent({
      turns: `[SYSTEM] Es herrscht seit mehreren Sekunden absolute Stille. Übernehmen Sie sofort die Gesprächsführung: sprechen Sie einen Kandidaten namentlich an (${ctx.aName} oder ${ctx.bName}) und stellen Sie eine direkte, konkrete Frage.`,
      turnComplete: true,
    });
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
  }
}

async function finishExam(room: RoomSession) {
  if (room.finishing) return;
  room.finishing = true;
  broadcast(room, { type: "finished" });

  const participants = [...room.participants.values()];
  const examSessionId = room.examSessionId;

  try {
    if (!examSessionId) throw new Error("no exam session id");
    const { data: nodes } = await admin
      .from("muendlich_transcript_nodes")
      .select("speaker, text, started_at")
      .eq("session_id", examSessionId)
      .order("started_at", { ascending: true });

    const transcriptText = (nodes ?? [])
      .map((n) => `${n.speaker === "examiner" ? "Prüferin" : n.speaker === "A" ? "Person A" : "Person B"}: ${n.text}`)
      .join("\n");

    await admin.from("muendlich_exam_sessions").update({
      transcript: nodes ?? [], ended_at: new Date().toISOString(), end_reason: "completed",
    }).eq("id", examSessionId);

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
    console.error(`[room ${room.roomId}] finishExam failed:`, e);
  } finally {
    endRoom(room, "completed");
  }
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
        roomId, participants: new Map(), lastSenderSlot: null, lastAudioAt: Date.now(), lastNudgeAt: 0,
        examStage: null, examStageStartedAt: 0, teil1HandoffSent: false, teil2TakeoverSent: false, repeatCount: 0,
        intermissionUntil: null, pendingNextStage: null,
        disconnectTimers: new Map(), finishing: false, ended: false,
        geminiErrored: false, liveSessionStartedAt: null,
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
          room!.live.sendAudioChunk(msg.data);
        } else if (msg.type === "repeat" && room!.live) {
          // "Wie bitte?" — capped at MAX_REPEAT_USES per exam so it can't be
          // used to spam the session; doesn't touch the score/credit logic.
          if (room!.repeatCount >= MAX_REPEAT_USES) {
            send(ws, { type: "repeat_denied" });
          } else {
            room!.repeatCount++;
            room!.live.session.sendClientContent({
              turns: `[SYSTEM] Der Kandidat hat um Wiederholung gebeten. Wiederholen Sie freundlich und knapp nur Ihre letzte Aussage bzw. Frage, ohne eine neue Frage zu stellen.`,
              turnComplete: true,
            });
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
      if (room!.participants.size === 0) { endRoom(room!, "disconnect_timeout"); return; }
      // One participant left — give them RECONNECT_GRACE_MS to come back
      // before treating the room as abandoned. (Spec's "AI pivots to play
      // both roles" for the remaining student is NOT implemented yet — see
      // file header.)
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
