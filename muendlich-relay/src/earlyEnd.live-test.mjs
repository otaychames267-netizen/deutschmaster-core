/** Live test of the NEW spoken closing line for an abnormal exam-room end
 * (2026-09-30 fix): before this, idle_timeout/insufficient_minutes/
 * partner_disconnected all cut the AI's audio dead silent and jumped
 * straight to a text-only "terminated" screen, unlike the natural
 * end-of-exam path (exam_end) which always got a spoken goodbye.
 *
 * This script exercises the idle_timeout path specifically (easiest to
 * trigger deterministically: just never send audio). Requires the relay
 * already running with a SHORT MUENDLICH_HARD_IDLE_MS, e.g.:
 *   MUENDLICH_HARD_IDLE_MS=15000 npm run dev
 *
 * Creates two disposable candidates + a fresh exam-room-ready room, connects
 * two real WebSocket clients, sends NO audio from either side, and asserts:
 *   - a {type:"transcript", speaker:"examiner"} line arrives whose text
 *     matches one of examinerPhrases.ts's EARLY_END_IDLE_VARIANTS
 *   - that transcript line arrives BEFORE {type:"terminated", reason:
 *     "idle_timeout"} (proving the closing line is spoken, not silent)
 * before cleaning up every row + both test users.
 */
import { readFileSync } from "node:fs";
import WebSocket from "ws";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RELAY_URL = process.env.LIVE_TEST_RELAY_URL ?? `ws://localhost:${process.env.PORT ?? 8787}`;
const HARD_IDLE_MS = Number(process.env.MUENDLICH_HARD_IDLE_MS ?? 45_000);

const EARLY_END_IDLE_TEXTS = [
  "Da über einen längeren Zeitraum keine Antwort erfolgt ist, muss die Prüfung an dieser Stelle leider beendet werden.",
  "Da wir seit geraumer Zeit keine Rückmeldung erhalten haben, wird die Prüfung nun beendet.",
  "Da schon eine Weile nichts mehr gesagt wurde, müssen wir die Prüfung an dieser Stelle leider beenden.",
  "Da es länger sehr still geblieben ist, müssen wir hier leider aufhören.",
  "Da über längere Zeit keine Antwort kam, wird die Prüfung nun an dieser Stelle beendet.",
  "Da es für längere Zeit still geblieben ist, beenden wir die Prüfung an dieser Stelle.",
];

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) { const body = await res.text(); throw new Error(`${path} -> ${res.status}: ${body}`); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function createCandidate(label) {
  const email = `earlyend-livetest-${label}-${Date.now()}@auralingovia-test.local`;
  const password = "TestEarlyEndLive2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { access_token: jwt } = await loginRes.json();
  if (!jwt) throw new Error(`login failed for ${email}`);
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ level: "TELC_B2", full_name: `TestKandidat${label}` }),
  });
  await rest(`/rest/v1/muendlich_credits`, {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ user_id: user.id, is_subscribed: true, minutes_balance: 30, window_started_at: new Date().toISOString(), window_days: 30 }),
  });
  await rest(`/rest/v1/subscriptions`, {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, plan_code: "komplett", status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }),
  });
  return { id: user.id, email, jwt };
}

async function main() {
  console.log(`HARD_IDLE_MS=${HARD_IDLE_MS}`);

  const a = await createCandidate("A");
  const b = await createCandidate("B");
  console.log("candidates:", a.id, b.id);

  const [room] = await rest(`/rest/v1/muendlich_rooms`, {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ code: `EARLYEND${Date.now()}`, state: "exam_room_ready" }),
  });
  const roomId = room.id;
  console.log("room:", roomId);

  await rest(`/rest/v1/muendlich_participants`, {
    method: "POST",
    body: JSON.stringify([
      { room_id: roomId, user_id: a.id, slot: "A", connected: true, ready: true, mic_ok: true, voice_ok: true },
      { room_id: roomId, user_id: b.id, slot: "B", connected: true, ready: true, mic_ok: true, voice_ok: true },
    ]),
  });
  await rest(`/rest/v1/muendlich_selections`, {
    method: "POST",
    body: JSON.stringify([
      { room_id: roomId, teil: 1, slot: "A", value: "Reise", locked: true },
      { room_id: roomId, teil: 1, slot: "B", value: "Wichtige Erfahrung", locked: true },
      { room_id: roomId, teil: 2, slot: null, value: "Sollte man Kindern ein eigenes Smartphone erlauben?", locked: true },
      { room_id: roomId, teil: 3, slot: null, value: "Planen Sie gemeinsam eine Willkommensfeier für neue Kollegen.", locked: true },
    ]),
  });

  const t0 = Date.now();
  const log = (text) => { const t = Date.now() - t0; console.log(`[+${(t / 1000).toFixed(1)}s] ${text}`); };

  let earlyEndTranscriptAt = null, earlyEndText = null, terminatedAt = null, terminatedReason = null, anyClosed = false;

  function attachHandlers(ws, label) {
    ws.on("message", (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === "audio" || msg.type === "pong") return;
      log(`[${label}] <- ${JSON.stringify(msg).slice(0, 200)}`);
      if (msg.type === "transcript" && msg.speaker === "examiner" && EARLY_END_IDLE_TEXTS.includes(msg.text) && earlyEndTranscriptAt === null) {
        earlyEndTranscriptAt = Date.now();
        earlyEndText = msg.text;
      }
      if (msg.type === "terminated" && terminatedAt === null) { terminatedAt = Date.now(); terminatedReason = msg.reason; }
    });
    ws.on("error", (e) => log(`[${label}] ERROR ${e.message}`));
  }

  async function cleanup() {
    await rest(`/rest/v1/muendlich_credit_transactions?room_id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/muendlich_rooms?id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
    for (const u of [a, b]) {
      await rest(`/rest/v1/subscriptions?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
      await rest(`/rest/v1/muendlich_credits?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
    }
  }

  const wsA = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(a.jwt)}`);
  const wsB = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(b.jwt)}`);
  attachHandlers(wsA, "A");
  attachHandlers(wsB, "B");
  wsA.on("close", (code, reason) => { anyClosed = true; log(`[A] socket closed: ${code} ${reason?.toString?.() ?? ""}`); });
  wsB.on("close", (code, reason) => { anyClosed = true; log(`[B] socket closed: ${code} ${reason?.toString?.() ?? ""}`); });
  await Promise.all([
    new Promise((res, rej) => { wsA.on("open", res); wsA.on("error", rej); }),
    new Promise((res, rej) => { wsB.on("open", res); wsB.on("error", rej); }),
  ]);
  log("both sockets open — sending NO audio from either side, waiting for hard idle-close");

  // Deliberately send zero audio. Wait for HARD_IDLE_MS plus a generous
  // margin for the AI's own opening line (Teil 1 start) + nudge attempt(s)
  // + the closing line itself to play out.
  const deadline = Date.now() + HARD_IDLE_MS + 40_000;
  while (terminatedAt === null && Date.now() < deadline) await sleep(300);

  ok("idle_timeout terminated event arrived", terminatedAt !== null && terminatedReason === "idle_timeout");
  ok("a spoken early-end closing line (matching examinerPhrases.ts's EARLY_END_IDLE_VARIANTS) was transcribed", earlyEndTranscriptAt !== null);
  if (earlyEndTranscriptAt !== null && terminatedAt !== null) {
    ok("the closing line was spoken BEFORE the terminated event (not after/silent)", earlyEndTranscriptAt < terminatedAt);
    console.log(`Closing line used: "${earlyEndText}"`);
  }

  console.log("\nDone. Cleaning up...");
  wsA.close(); wsB.close();
  await cleanup();
  console.log("cleanup done.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
