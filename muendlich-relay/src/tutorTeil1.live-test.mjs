/** Live end-to-end test of the AI Voice Tutor's Teil 1 flow (90s presentation
 * cap -> EXACTLY 2 questions -> 30s answer window each, for ONE student
 * against an AI examiner) against the REAL running relay process and REAL
 * Supabase + Claude + ElevenLabs.
 *
 * Requires the relay to already be running locally with SHORTENED Teil 1
 * timing so this doesn't take minutes — start it with:
 *   MUENDLICH_TEIL1_PRESENTATION_SECONDS=30 MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS=20 \
 *   npm run dev
 * (Reads the same values back from process.env, same convention as
 * teil1Redesign.live-test.mjs, so this never hardcodes a second copy.)
 *
 * Creates one disposable student + a real voice_tutor_sessions row (pointing
 * at a real Teil-1 B2 muendlich_materials topic), connects one real
 * WebSocket client, drives realistic audio timing through the early-finish
 * presentation path and both Q&A windows, then confirms teil1_complete
 * fires and the socket closes cleanly — before cleaning up the test user and
 * session row.
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

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function silentPcm16Frame(samples = 1600) {
  return Buffer.alloc(samples * 2, 0).toString("base64");
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

async function createStudent() {
  const email = `tutor-t1-livetest-${Date.now()}@auralingovia-test.local`;
  const password = "TestTutorT1Live2026!";
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
    body: JSON.stringify({ level: "TELC_B2", full_name: "TestStudent" }),
  });
  return { id: user.id, email, jwt };
}

async function main() {
  console.log(`Schedule based on: presentation=${PRESENTATION_S}s answerWindow=${ANSWER_WINDOW_S}s`);

  const student = await createStudent();
  console.log("student:", student.id);

  const [material] = await rest(`/rest/v1/muendlich_materials?teil=eq.1&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  if (!material) throw new Error("no Teil-1 B2 'themen' material found to test with");
  console.log("topic:", material.title, material.id);

  const [session] = await rest(`/rest/v1/voice_tutor_sessions`, {
    method: "POST", headers: { Prefer: "return=representation", Authorization: `Bearer ${student.jwt}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ user_id: student.id, level: "TELC_B2", teil1_material_id: material.id }),
  });
  const sessionId = session.id;
  console.log("session:", sessionId);

  const events = [];
  const t0 = Date.now();
  const log = (text) => { const t = Date.now() - t0; events.push({ t, text }); console.log(`[+${(t / 1000).toFixed(1)}s] ${text}`); };

  let readyAt = null, teil1CompleteAt = null, terminatedSeen = false, closed = false;
  const examinerChunks = [];

  async function cleanup() {
    await rest(`/rest/v1/voice_tutor_sessions?id=eq.${sessionId}`, { method: "DELETE" }).catch(() => {}); // cascades transcript_nodes/corrections
    await rest(`/rest/v1/voice_tutor_daily_usage?user_id=eq.${student.id}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/muendlich_elevenlabs_usage?user_id=eq.${student.id}`, { method: "DELETE" }).catch(() => {});
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${student.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
  }

  const tokenCheck = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${student.jwt}` } });
  log(`student token check: HTTP ${tokenCheck.status}`);

  const ws = new WebSocket(`${RELAY_URL}/tutor/${sessionId}?token=${encodeURIComponent(student.jwt)}`);
  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "audio" || msg.type === "pong") return;
    if (msg.type === "transcript" && msg.speaker === "examiner") {
      examinerChunks.push({ t: Date.now() - t0, text: msg.text });
      return;
    }
    log(`<- ${JSON.stringify(msg).slice(0, 200)}`);
    if (msg.type === "ready" && readyAt === null) readyAt = Date.now();
    if (msg.type === "teil1_complete" && teil1CompleteAt === null) teil1CompleteAt = Date.now();
    if (msg.type === "terminated") terminatedSeen = true;
  });
  ws.on("error", (e) => log(`ERROR ${e.message}`));
  ws.on("close", (code, reason) => { closed = true; log(`socket closed: ${code} ${reason?.toString?.() ?? ""}`); });

  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  log("socket open");

  function startSpeaking() {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "audio", data: silentPcm16Frame() }));
    }, 100);
    return () => clearInterval(interval);
  }

  const readyDeadline = Date.now() + 20_000;
  while (readyAt === null && !closed && Date.now() < readyDeadline) await sleep(200);
  ok("received ready within 20s of connecting", readyAt !== null);
  if (readyAt === null) { console.error("Aborting — never got ready."); await cleanup(); process.exit(1); }

  log("presenting (will go quiet after 8s to trigger early-finish)");
  let stop = startSpeaking();
  await sleep(8_000);
  stop(); log("stopped speaking (silence begins)");

  await sleep(12_000); // expect Q1 ~8s after silence begins (SILENCE_THRESHOLD_MS[1], not env-overridable)

  log("answering Q1 briefly (1s speech, then quiet -> expect early completion)");
  stop = startSpeaking();
  await sleep(1_000);
  stop();
  await sleep(6_000); // expect looksFinished ~4s after stop

  log("NOT answering Q2 at all (expect windowExpired path, ~" + ANSWER_WINDOW_S + "s wait)");
  await sleep(ANSWER_WINDOW_S * 1000 + 4_000);

  const completeDeadline = Date.now() + 10_000;
  while (teil1CompleteAt === null && !closed && Date.now() < completeDeadline) await sleep(200);

  ok("teil1_complete received", teil1CompleteAt !== null);
  ok("no terminated/error event during the run", !terminatedSeen);

  const utterances = [];
  for (const c of examinerChunks) {
    const last = utterances[utterances.length - 1];
    if (last && c.t - last.endT < 2_500) { last.text += c.text; last.endT = c.t; }
    else utterances.push({ startT: c.t, endT: c.t, text: c.text });
  }
  console.log("\n=== Examiner utterance timeline ===");
  for (const u of utterances) console.log(`  [+${(u.startT / 1000).toFixed(1)}s] ${u.text.replace(/\s+/g, " ").trim()}`);
  console.log(`\nTotal examiner utterances: ${utterances.length} (expect 3: opening, Q1, Q2)`);
  ok("exactly 3 examiner utterances (opening + Q1 + Q2)", utterances.length === 3);

  console.log("\nDone. Cleaning up...");
  ws.close();
  await sleep(500);
  await cleanup();
  console.log("cleanup done.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
