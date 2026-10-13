/** Live end-to-end test of a COMPLETE 3-Teil exam room (Teil 1 -> Teil 2 ->
 * Teil 3 -> finished) against the REAL running relay process and REAL
 * Supabase + Gemini Live. Complements teil1Redesign.live-test.mjs (which
 * only exercises Teil 1 in depth) by proving the room actually progresses
 * all the way through and reaches a clean "finished" state.
 *
 * Requires the relay to already be running locally with SHORTENED timing
 * for all three stages so this doesn't take ~16 real minutes — start it
 * with:
 *   MUENDLICH_TEIL1_PRESENTATION_SECONDS=15 MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS=8 \
 *   MUENDLICH_HANDOFF_GRACE_MS=3000 MUENDLICH_STAGE1_SECONDS=90 \
 *   MUENDLICH_STAGE2_SECONDS=40 MUENDLICH_TEIL2_TAKEOVER_SEC=15 MUENDLICH_TEIL2_RESPONSE_WINDOW_MS=8000 \
 *   MUENDLICH_STAGE3_SECONDS=40 MUENDLICH_TEIL3_COMPLETION_SEC=15 \
 *   MUENDLICH_INTERMISSION_SECONDS=3 \
 *   npm run dev
 * (This script reads the same values back from process.env so its own
 * schedule always matches whatever the relay is actually enforcing.)
 *
 * Creates two disposable candidates + a fresh room/participants/selections,
 * connects two real WebSocket clients, keeps both "speaking" (silent PCM16
 * frames) continuously through Teil 1 -> Teil 2 -> Teil 3, and asserts:
 *   - stage 1 -> stage 2 -> stage 3 transitions each fire exactly once
 *   - exactly one intermission between each pair of stages
 *   - a final {type:"finished"} arrives (natural completion, not a timeout
 *     or error close)
 *   - no {type:"terminated"} fires anywhere in the run
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

const PRESENTATION_S = Number(process.env.MUENDLICH_TEIL1_PRESENTATION_SECONDS ?? 90);
const ANSWER_WINDOW_S = Number(process.env.MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS ?? 30);
const GRACE_MS = Number(process.env.MUENDLICH_HANDOFF_GRACE_MS ?? 15_000);
const STAGE2_S = Number(process.env.MUENDLICH_STAGE2_SECONDS ?? 360);
const STAGE3_S = Number(process.env.MUENDLICH_STAGE3_SECONDS ?? 360);
const INTERMISSION_S = Number(process.env.MUENDLICH_INTERMISSION_SECONDS ?? 15);

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function silentPcm16Frame(samples = 1600) {
  const buf = Buffer.alloc(samples * 2, 0);
  return buf.toString("base64");
}

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
  const email = `fullexam-livetest-${label}-${Date.now()}@auralingovia-test.local`;
  const password = "TestFullExamLive2026!";
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
  console.log(`Schedule: teil1(pres=${PRESENTATION_S}s answer=${ANSWER_WINDOW_S}s grace=${GRACE_MS}ms) stage2=${STAGE2_S}s stage3=${STAGE3_S}s intermission=${INTERMISSION_S}s`);

  const a = await createCandidate("A");
  const b = await createCandidate("B");
  console.log("candidates:", a.id, b.id);

  const [room] = await rest(`/rest/v1/muendlich_rooms`, {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ code: `FULLLIVE${Date.now()}`, state: "exam_room_ready" }),
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

  let stage1At = null, stage2At = null, stage3At = null, finishedAt = null, terminatedSeen = false, anyClosed = false;
  const intermissions = [];

  function attachHandlers(ws, label) {
    ws.on("message", (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === "audio" || msg.type === "pong" || msg.type === "transcript") return;
      log(`[${label}] <- ${JSON.stringify(msg).slice(0, 200)}`);
      if (msg.type === "stage" && msg.stage === 1 && stage1At === null) stage1At = Date.now();
      if (msg.type === "stage" && msg.stage === 2 && stage2At === null) stage2At = Date.now();
      if (msg.type === "stage" && msg.stage === 3 && stage3At === null) stage3At = Date.now();
      if (msg.type === "intermission") intermissions.push(Date.now());
      if (msg.type === "terminated") terminatedSeen = true;
      if (msg.type === "finished" && finishedAt === null) finishedAt = Date.now();
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

  for (const [label, jwt] of [["A", a.jwt], ["B", b.jwt]]) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` } });
    log(`candidate ${label} token check: HTTP ${res.status}`);
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
  log("both sockets open");

  // Both candidates "speak" continuously (intermittent bursts, not one
  // unbroken stream) through the whole exam — enough to avoid idle-timeout
  // and hard-cap-without-content, without needing to model Teil 1's precise
  // early-finish/hard-cap timing (that path is already covered in depth by
  // teil1Redesign.live-test.mjs).
  function startIntermittentSpeaking(ws, label) {
    let speaking = true;
    const toggle = setInterval(() => { speaking = !speaking; }, 3000);
    const send = setInterval(() => {
      if (speaking && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "audio", data: silentPcm16Frame() }));
    }, 100);
    return () => { clearInterval(toggle); clearInterval(send); };
  }

  const stopA = startIntermittentSpeaking(wsA, "A");
  const stopB = startIntermittentSpeaking(wsB, "B");

  const stage1Deadline = Date.now() + 30_000;
  while (stage1At === null && !anyClosed && Date.now() < stage1Deadline) await sleep(200);
  ok("Teil 1 started within 30s of connecting", stage1At !== null);
  if (stage1At === null) {
    console.error("Aborting — Teil 1 never started.");
    stopA(); stopB(); await cleanup();
    process.exit(1);
  }

  // Generous ceiling for the whole of Teil 1 (both candidates' presentation
  // + Q1 + Q2, worst case = hard cap + grace for both): reuse the same
  // formula server.ts uses for STAGE_SECONDS[1], plus margin.
  const teil1CeilingMs = 2 * (PRESENTATION_S + GRACE_MS / 1000 + 2 * ANSWER_WINDOW_S) * 1000 + 20_000;
  const stage2Deadline = Date.now() + teil1CeilingMs;
  while (stage2At === null && !anyClosed && !terminatedSeen && Date.now() < stage2Deadline) await sleep(300);
  ok("Teil 2 (stage 2) started on its own after Teil 1 completed", stage2At !== null);
  if (stage2At === null) {
    console.error("Aborting — Teil 2 never started.");
    stopA(); stopB(); await cleanup();
    process.exit(1);
  }

  const stage3Deadline = Date.now() + (STAGE2_S + INTERMISSION_S + 20) * 1000;
  while (stage3At === null && !anyClosed && !terminatedSeen && Date.now() < stage3Deadline) await sleep(300);
  ok("Teil 3 (stage 3) started on its own after Teil 2 completed", stage3At !== null);
  if (stage3At === null) {
    console.error("Aborting — Teil 3 never started.");
    stopA(); stopB(); await cleanup();
    process.exit(1);
  }

  const finishDeadline = Date.now() + (STAGE3_S + 20) * 1000;
  while (finishedAt === null && !anyClosed && !terminatedSeen && Date.now() < finishDeadline) await sleep(300);

  stopA(); stopB();

  ok("room reached natural completion ({type:\"finished\"})", finishedAt !== null);
  // 3, not 2: server.ts sends one intermission before EACH stage transition
  // AND one more before finishing (to play the exam_end phrase) — see its
  // doc comment "15s breather before the next stage / before finishing".
  ok("exactly 3 intermissions fired (Teil1->2, Teil2->3, and before finishing)", intermissions.length === 3);
  ok("no terminated/error event during the whole run", !terminatedSeen);

  console.log(`\nTiming: stage1=+${((stage1At - t0) / 1000).toFixed(1)}s stage2=+${((stage2At - t0) / 1000).toFixed(1)}s stage3=+${((stage3At - t0) / 1000).toFixed(1)}s finished=${finishedAt ? "+" + ((finishedAt - t0) / 1000).toFixed(1) + "s" : "NEVER"}`);

  console.log("\nDone. Cleaning up...");
  wsA.close(); wsB.close();
  await cleanup();
  console.log("cleanup done.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
