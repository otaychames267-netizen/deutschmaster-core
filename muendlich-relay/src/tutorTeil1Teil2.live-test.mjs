/** Live end-to-end test of the AI Voice Tutor's Teil 1 -> Teil 2 flow:
 * Teil 1 (90s presentation cap -> EXACTLY 2 questions -> 30s answer window
 * each) handing off straight into Teil 2 (examiner-led continuous Q&A on a
 * shared topic, time-boxed rather than a fixed question count), for ONE
 * student against an AI examiner, against the REAL running relay process
 * and REAL Supabase + Claude + ElevenLabs.
 *
 * Requires the relay to already be running locally with SHORTENED timing so
 * this doesn't take minutes — start it with:
 *   MUENDLICH_TEIL1_PRESENTATION_SECONDS=30 MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS=20 \
 *   MUENDLICH_STAGE2_SECONDS=25 MUENDLICH_TEIL2_RESPONSE_WINDOW_MS=8000 \
 *   npm run dev
 * (Reads the same values back from process.env, same convention as
 * teil1Redesign.live-test.mjs, so this never hardcodes a second copy.)
 *
 * Creates one disposable student + a real voice_tutor_sessions row (pointing
 * at real Teil-1 and Teil-2 B2 muendlich_materials topics — both required to
 * connect at all), connects one real WebSocket client, drives realistic
 * audio timing through Teil 1's early-finish presentation + both Q&A
 * windows, then through a couple of Teil 2 answer rounds, then confirms
 * session_complete fires and the socket closes cleanly — before cleaning up
 * the test user and session row.
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
const STAGE2_S = Number(process.env.MUENDLICH_STAGE2_SECONDS ?? 360);
const TEIL2_WINDOW_MS = Number(process.env.MUENDLICH_TEIL2_RESPONSE_WINDOW_MS ?? 30_000);

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
  const email = `tutor-t1t2-livetest-${Date.now()}@auralingovia-test.local`;
  const password = "TestTutorT1T2Live2026!";
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
  console.log(`Schedule based on: presentation=${PRESENTATION_S}s answerWindow=${ANSWER_WINDOW_S}s stage2=${STAGE2_S}s teil2Window=${TEIL2_WINDOW_MS}ms`);

  const student = await createStudent();
  console.log("student:", student.id);

  const [material1] = await rest(`/rest/v1/muendlich_materials?teil=eq.1&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  if (!material1) throw new Error("no Teil-1 B2 'themen' material found to test with");
  const [material2] = await rest(`/rest/v1/muendlich_materials?teil=eq.2&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  if (!material2) throw new Error("no Teil-2 B2 'themen' material found to test with");
  console.log("topics:", material1.title, "/", material2.title);

  const [session] = await rest(`/rest/v1/voice_tutor_sessions`, {
    method: "POST", headers: { Prefer: "return=representation", Authorization: `Bearer ${student.jwt}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ user_id: student.id, level: "TELC_B2", teil1_material_id: material1.id, teil2_material_id: material2.id }),
  });
  const sessionId = session.id;
  console.log("session:", sessionId);

  const events = [];
  const t0 = Date.now();
  const log = (text) => { const t = Date.now() - t0; events.push({ t, text }); console.log(`[+${(t / 1000).toFixed(1)}s] ${text}`); };

  let readyAt = null, teil1CompleteAt = null, stage2At = null, sessionCompleteAt = null, terminatedSeen = false, closed = false;
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
    if (msg.type === "stage" && msg.stage === 2 && stage2At === null) stage2At = Date.now();
    if (msg.type === "session_complete" && sessionCompleteAt === null) sessionCompleteAt = Date.now();
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

  log("Teil 1: presenting (will go quiet after 8s to trigger early-finish)");
  let stop = startSpeaking();
  await sleep(8_000);
  stop(); log("stopped speaking (silence begins)");

  await sleep(12_000); // expect Q1 ~8s after silence begins (SILENCE_THRESHOLD_MS[1], not env-overridable)

  log("Teil 1: answering Q1 briefly (1s speech, then quiet -> expect early completion)");
  stop = startSpeaking();
  await sleep(1_000);
  stop();
  await sleep(6_000); // expect looksFinished ~4s after stop

  log("Teil 1: NOT answering Q2 at all (expect windowExpired path, ~" + ANSWER_WINDOW_S + "s wait)");
  await sleep(ANSWER_WINDOW_S * 1000 + 4_000);

  const teil1Deadline = Date.now() + 10_000;
  while (teil1CompleteAt === null && !closed && Date.now() < teil1Deadline) await sleep(200);
  ok("teil1_complete received", teil1CompleteAt !== null);

  const stage2Deadline = Date.now() + 15_000;
  while (stage2At === null && !closed && Date.now() < stage2Deadline) await sleep(200);
  ok("stage 2 (Teil 2) started right after Teil 1", stage2At !== null);
  if (stage2At === null) { console.error("Aborting — Teil 2 never started."); ws.close(); await cleanup(); process.exit(1); }

  // Answer a couple of Teil 2 rounds briefly, then go quiet and let the
  // time budget (STAGE2_S) run out — same "looksFinished" pattern as Teil 1.
  log("Teil 2: answering round 1 briefly");
  stop = startSpeaking();
  await sleep(1_000);
  stop();
  await sleep(Math.min(TEIL2_WINDOW_MS, 6_000) + 2_000);

  log("Teil 2: answering round 2 briefly, then going silent until the time budget runs out");
  stop = startSpeaking();
  await sleep(1_000);
  stop();

  const sessionCompleteDeadline = Date.now() + STAGE2_S * 1000 + TEIL2_WINDOW_MS + 15_000;
  while (sessionCompleteAt === null && !closed && Date.now() < sessionCompleteDeadline) await sleep(300);

  ok("session_complete received after Teil 2's time budget", sessionCompleteAt !== null);
  ok("no terminated/error event during the run", !terminatedSeen);

  const utterances = [];
  for (const c of examinerChunks) {
    const last = utterances[utterances.length - 1];
    if (last && c.t - last.endT < 2_500) { last.text += c.text; last.endT = c.t; }
    else utterances.push({ startT: c.t, endT: c.t, text: c.text });
  }
  console.log("\n=== Examiner utterance timeline ===");
  for (const u of utterances) console.log(`  [+${(u.startT / 1000).toFixed(1)}s] ${u.text.replace(/\s+/g, " ").trim()}`);
  console.log(`\nTotal examiner utterances: ${utterances.length} (expect at least 6: Teil1 opening+Q1+Q2, Teil1->2 transition, >=2 Teil2 questions, closing)`);
  ok("at least 6 examiner utterances across Teil 1 + Teil 2", utterances.length >= 6);

  console.log("\nDone. Cleaning up...");
  ws.close();
  await sleep(500);
  await cleanup();
  console.log("cleanup done.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
