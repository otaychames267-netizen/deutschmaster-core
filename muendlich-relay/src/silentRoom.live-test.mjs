/**
 * END-TO-END test of the room's REAL silence handling: both candidates connected
 * but completely silent (the browser still streams silence frames — exactly like a
 * real room where nobody talks). With real speech detection the relay must:
 *   - send anti-silence nudges in Teil 3 (and Teil 2's natural phase),
 *   - never fire them during the examiner's own speech,
 *   - finally close the room with idle_timeout (examiner says the idle closing line).
 * Before real detection none of this could ever happen (silence frames kept
 * lastAudioAt permanently fresh).
 *
 * Start the relay with accelerated timing:
 *   PORT=8791 MUENDLICH_VOICE_BACKEND=elevenlabs MUENDLICH_STT_BACKEND=groq CLAUDE_EXAMINER_MODEL=claude-haiku-4-5-20251001
 *   MUENDLICH_TEIL1_PRESENTATION_SECONDS=8 MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS=5 MUENDLICH_HANDOFF_GRACE_MS=1000
 *   MUENDLICH_STAGE1_SECONDS=300 MUENDLICH_INTERMISSION_SECONDS=3 MUENDLICH_STAGE2_SECONDS=40 MUENDLICH_TEIL2_TAKEOVER_SEC=300
 *   MUENDLICH_STAGE3_SECONDS=300 MUENDLICH_TEIL3_COMPLETION_SEC=290 MUENDLICH_HARD_IDLE_MS=30000 MUENDLICH_HARD_IDLE_STRUCTURED_MS=60000
 *   npx tsx src/server.ts
 * then: LIVE_TEST_RELAY_URL=ws://localhost:8791 npx tsx src/silentRoom.live-test.mjs
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
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const RELAY_URL = process.env.LIVE_TEST_RELAY_URL ?? "ws://localhost:8791";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"} — ${n}`); if (!c) failed++; };
const t0 = Date.now();
const log = (s) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s] ${s}`);

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
async function createCandidate(label, name) {
  const email = `silentroom-livetest-${label}-${Date.now()}@auralingovia-test.local`;
  const password = "TestSilentRoom2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { access_token: jwt } = await login.json();
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: name }) });
  await rest(`/rest/v1/muendlich_credits`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, is_subscribed: true, minutes_balance: 30, window_started_at: new Date().toISOString(), window_days: 30 }) });
  await rest(`/rest/v1/subscriptions`, { method: "POST", body: JSON.stringify({ user_id: user.id, plan_code: "komplett", status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }) });
  return { id: user.id, jwt };
}

const a = await createCandidate("A", "Fatma"), b = await createCandidate("B", "Youssef");
const [room] = await rest(`/rest/v1/muendlich_rooms`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ code: `SIL${Date.now()}`, state: "exam_room_ready" }) });
const roomId = room.id;
await rest(`/rest/v1/muendlich_participants`, { method: "POST", body: JSON.stringify([
  { room_id: roomId, user_id: a.id, slot: "A", connected: true, ready: true, mic_ok: true, voice_ok: true },
  { room_id: roomId, user_id: b.id, slot: "B", connected: true, ready: true, mic_ok: true, voice_ok: true },
]) });
await rest(`/rest/v1/muendlich_selections`, { method: "POST", body: JSON.stringify([
  { room_id: roomId, teil: 1, slot: "A", value: "Reise", locked: true }, { room_id: roomId, teil: 1, slot: "B", value: "Wichtige Erfahrung", locked: true },
  { room_id: roomId, teil: 2, slot: null, value: "Sollte man Kindern ein eigenes Smartphone erlauben?", locked: true },
  { room_id: roomId, teil: 3, slot: null, value: "Planen Sie gemeinsam eine Willkommensfeier.", locked: true },
]) });

const nudges = []; let stage = 0, terminated = null, playbackEndsAt = 0, nudgeDuringExaminer = 0, closed = false;
const attach = (ws, label) => ws.on("message", (raw) => {
  let m; try { m = JSON.parse(raw.toString()); } catch { return; }
  if (label !== "A") return;
  if (m.type === "audio") { playbackEndsAt = Math.max(playbackEndsAt, Date.now()) + (Buffer.from(m.data, "base64").length / 48000) * 1000; return; }
  if (m.type === "stage") { stage = m.stage; log(`stage ${m.stage}`); }
  if (m.type === "nudge") { nudges.push({ t: Date.now(), stage }); if (Date.now() < playbackEndsAt - 500) nudgeDuringExaminer++; log(`NUDGE (stage ${stage})`); }
  if (m.type === "terminated") { terminated = m.reason; log(`TERMINATED ${m.reason}`); }
});
const wsA = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(a.jwt)}`);
const wsB = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(b.jwt)}`);
attach(wsA, "A"); attach(wsB, "B");
wsA.on("close", () => { closed = true; }); wsB.on("close", () => { closed = true; });
await Promise.all([wsA, wsB].map((ws) => new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); })));
const silent = Buffer.alloc(2730).toString("base64"); // ~85ms of digital silence, like a muted-but-open mic
const mic = setInterval(() => { for (const ws of [wsA, wsB]) if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "audio", data: silent })); }, 85);

const deadline = Date.now() + 8 * 60_000;
while (!terminated && !closed && Date.now() < deadline) await sleep(500);
clearInterval(mic);
await sleep(3000);
const [sess] = await rest(`/rest/v1/muendlich_exam_sessions?select=id,end_reason&room_id=eq.${roomId}&order=created_at.desc&limit=1`);
const nodes = await rest(`/rest/v1/muendlich_transcript_nodes?select=speaker,teil,text&session_id=eq.${sess.id}&order=created_at.asc&limit=200`);
const examiner = nodes.filter((n) => n.speaker === "examiner");
console.log("\n=== last examiner lines ===");
examiner.slice(-6).forEach((n) => console.log(`T${n.teil}: ${n.text.slice(0, 140)}`));

ok("room ended by idle_timeout (real silence is now detected)", terminated === "idle_timeout" && sess.end_reason === "idle_timeout");
ok(`anti-silence nudges fired in a silent room (${nudges.length})`, nudges.length >= 2);
ok("no nudge fired while the examiner's own audio was still playing", nudgeDuringExaminer === 0);
ok("the idle closing line was spoken", examiner.some((n) => /(Stille|Verbindung|nichts mehr|beenden|Zeit|später|nächste)/i.test(n.text)));

await rest(`/rest/v1/muendlich_credit_transactions?room_id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
await rest(`/rest/v1/muendlich_rooms?id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
for (const u of [a, b]) {
  await rest(`/rest/v1/subscriptions?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
  await rest(`/rest/v1/muendlich_credits?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
}
console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
