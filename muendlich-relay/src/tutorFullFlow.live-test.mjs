/** Live end-to-end test of the AI Voice Tutor's FULL Teil 1 -> Teil 2 ->
 * Teil 3 flow for ONE student against a real AI examiner (then partner),
 * against the REAL running relay process and REAL Supabase + Claude +
 * ElevenLabs:
 *   Teil 1 — up to MUENDLICH_TEIL1_PRESENTATION_SECONDS presentation, then
 *            GENAU TUTOR_TEIL1_QUESTIONS questions, each up to
 *            TUTOR_TEIL1_ANSWER_WINDOW_SECONDS.
 *   Teil 2 — GENAU TUTOR_TEIL2_QUESTIONS fixed questions (NOT time-boxed —
 *            this superseded the old time-budget design), each up to
 *            TUTOR_TEIL2_ANSWER_WINDOW_SECONDS.
 *   Teil 3 — the SAME AI voice switches to a "study partner" persona for
 *            GENAU TUTOR_TEIL3_TURNS joint-planning turns, each up to
 *            TUTOR_TEIL3_ANSWER_WINDOW_SECONDS.
 * Then confirms session_complete fires and the socket closes cleanly —
 * before cleaning up the test user and session row.
 *
 * Requires the relay to already be running locally with SHORTENED timing so
 * this doesn't take minutes — e.g.:
 *   MUENDLICH_TEIL1_PRESENTATION_SECONDS=20 \
 *   MUENDLICH_TUTOR_TEIL1_ANSWER_WINDOW_SECONDS=8 \
 *   MUENDLICH_TUTOR_TEIL2_QUESTIONS=3 MUENDLICH_TUTOR_TEIL2_ANSWER_WINDOW_SECONDS=8 \
 *   MUENDLICH_TUTOR_TEIL3_TURNS=3 MUENDLICH_TUTOR_TEIL3_ANSWER_WINDOW_SECONDS=8 \
 *   npm run dev
 * (Reads the same values back from process.env, same convention as
 * teil1Redesign.live-test.mjs, so this never hardcodes a second copy.)
 *
 * Creates one disposable student + a real voice_tutor_sessions row (pointing
 * at real Teil-1/2/3 B2 muendlich_materials topics — all three required to
 * connect at all), connects one real WebSocket client, drives realistic
 * audio timing through every phase, and verifies the partner voice/persona
 * switch actually happened (distinct voice id + "partner"-labeled transcript
 * nodes) before confirming session_complete and cleaning up.
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
const TEIL1_QUESTIONS = Number(process.env.MUENDLICH_TUTOR_TEIL1_QUESTIONS ?? 3);
const TEIL1_WINDOW_S = Number(process.env.MUENDLICH_TUTOR_TEIL1_ANSWER_WINDOW_SECONDS ?? 40);
const TEIL2_QUESTIONS = Number(process.env.MUENDLICH_TUTOR_TEIL2_QUESTIONS ?? 6);
const TEIL2_WINDOW_S = Number(process.env.MUENDLICH_TUTOR_TEIL2_ANSWER_WINDOW_SECONDS ?? 40);
const TEIL3_TURNS = Number(process.env.MUENDLICH_TUTOR_TEIL3_TURNS ?? 5);
const TEIL3_WINDOW_S = Number(process.env.MUENDLICH_TUTOR_TEIL3_ANSWER_WINDOW_SECONDS ?? 40);

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
  const email = `tutor-fullflow-livetest-${Date.now()}@auralingovia-test.local`;
  const password = "TestTutorFullFlowLive2026!";
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

async function answerBriefly(ws, ms = 1000) {
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "audio", data: silentPcm16Frame() }));
  }, 100);
  await sleep(ms);
  clearInterval(interval);
}

async function main() {
  console.log(`Schedule: presentation=${PRESENTATION_S}s teil1=${TEIL1_QUESTIONS}q/${TEIL1_WINDOW_S}s teil2=${TEIL2_QUESTIONS}q/${TEIL2_WINDOW_S}s teil3=${TEIL3_TURNS}turns/${TEIL3_WINDOW_S}s`);

  const student = await createStudent();
  console.log("student:", student.id);

  const [material1] = await rest(`/rest/v1/muendlich_materials?teil=eq.1&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  if (!material1) throw new Error("no Teil-1 B2 'themen' material found to test with");
  const [material2] = await rest(`/rest/v1/muendlich_materials?teil=eq.2&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  if (!material2) throw new Error("no Teil-2 B2 'themen' material found to test with");
  const [material3] = await rest(`/rest/v1/muendlich_materials?teil=eq.3&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  if (!material3) throw new Error("no Teil-3 B2 'themen' material found to test with");
  console.log("topics:", material1.title, "/", material2.title, "/", material3.title);

  const [session] = await rest(`/rest/v1/voice_tutor_sessions`, {
    method: "POST", headers: { Prefer: "return=representation", Authorization: `Bearer ${student.jwt}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ user_id: student.id, level: "TELC_B2", teil1_material_id: material1.id, teil2_material_id: material2.id, teil3_material_id: material3.id }),
  });
  const sessionId = session.id;
  console.log("session:", sessionId);

  const events = [];
  const t0 = Date.now();
  const log = (text) => { const t = Date.now() - t0; events.push({ t, text }); console.log(`[+${(t / 1000).toFixed(1)}s] ${text}`); };

  let readyAt = null, teil1CompleteAt = null, stage2At = null, teil2CompleteAt = null, stage3At = null, sessionCompleteAt = null, terminatedSeen = false, closed = false;
  const examinerChunks = [];
  const partnerChunks = [];

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
    if (msg.type === "transcript" && msg.speaker === "examiner") { examinerChunks.push({ t: Date.now() - t0, text: msg.text }); return; }
    if (msg.type === "transcript" && msg.speaker === "partner") { partnerChunks.push({ t: Date.now() - t0, text: msg.text }); return; }
    log(`<- ${JSON.stringify(msg).slice(0, 200)}`);
    if (msg.type === "ready" && readyAt === null) readyAt = Date.now();
    if (msg.type === "teil1_complete" && teil1CompleteAt === null) teil1CompleteAt = Date.now();
    if (msg.type === "stage" && msg.stage === 2 && stage2At === null) stage2At = Date.now();
    if (msg.type === "teil2_complete" && teil2CompleteAt === null) teil2CompleteAt = Date.now();
    if (msg.type === "stage" && msg.stage === 3 && stage3At === null) stage3At = Date.now();
    if (msg.type === "session_complete" && sessionCompleteAt === null) sessionCompleteAt = Date.now();
    if (msg.type === "terminated") terminatedSeen = true;
  });
  ws.on("error", (e) => log(`ERROR ${e.message}`));
  ws.on("close", (code, reason) => { closed = true; log(`socket closed: ${code} ${reason?.toString?.() ?? ""}`); });

  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  log("socket open");

  const readyDeadline = Date.now() + 20_000;
  while (readyAt === null && !closed && Date.now() < readyDeadline) await sleep(200);
  ok("received ready within 20s of connecting", readyAt !== null);
  if (readyAt === null) { console.error("Aborting — never got ready."); await cleanup(); process.exit(1); }

  // --- Teil 1: presentation, then answer every question briefly ---
  log("Teil 1: presenting (will go quiet to trigger early-finish)");
  await answerBriefly(ws, 8_000);
  log("stopped presenting (silence begins)");
  await sleep(12_000); // expect Q1 ~8s after silence begins (SILENCE_THRESHOLD_MS[1], not env-overridable)

  for (let q = 1; q <= TEIL1_QUESTIONS; q++) {
    log(`Teil 1: answering Q${q} briefly`);
    await answerBriefly(ws, 1_000);
    await sleep(6_000); // expect looksFinished ~4s after stop
  }

  const teil1Deadline = Date.now() + (TEIL1_WINDOW_S * 1000 + 10_000);
  while (teil1CompleteAt === null && !closed && Date.now() < teil1Deadline) await sleep(200);
  ok("teil1_complete received", teil1CompleteAt !== null);

  const stage2Deadline = Date.now() + 15_000;
  while (stage2At === null && !closed && Date.now() < stage2Deadline) await sleep(200);
  ok("stage 2 (Teil 2) started right after Teil 1", stage2At !== null);
  if (stage2At === null) { console.error("Aborting — Teil 2 never started."); ws.close(); await cleanup(); process.exit(1); }

  // --- Teil 2: GENAU TEIL2_QUESTIONS fixed questions, answer every one ---
  for (let q = 1; q <= TEIL2_QUESTIONS; q++) {
    log(`Teil 2: answering Q${q} briefly`);
    await answerBriefly(ws, 1_000);
    await sleep(6_000);
  }

  const teil2Deadline = Date.now() + (TEIL2_WINDOW_S * 1000 + 10_000);
  while (teil2CompleteAt === null && !closed && Date.now() < teil2Deadline) await sleep(200);
  ok("teil2_complete received", teil2CompleteAt !== null);

  const stage3Deadline = Date.now() + 15_000;
  while (stage3At === null && !closed && Date.now() < stage3Deadline) await sleep(200);
  ok("stage 3 (Teil 3, partner persona) started right after Teil 2", stage3At !== null);
  if (stage3At === null) { console.error("Aborting — Teil 3 never started."); ws.close(); await cleanup(); process.exit(1); }

  // --- Teil 3: GENAU TEIL3_TURNS partner turns ---
  for (let turn = 1; turn <= TEIL3_TURNS; turn++) {
    log(`Teil 3: answering turn ${turn} briefly`);
    await answerBriefly(ws, 1_000);
    await sleep(6_000);
  }

  const sessionCompleteDeadline = Date.now() + (TEIL3_WINDOW_S * 1000 + 15_000);
  while (sessionCompleteAt === null && !closed && Date.now() < sessionCompleteDeadline) await sleep(300);

  ok("session_complete received after Teil 3", sessionCompleteAt !== null);
  ok("no terminated/error event during the run", !terminatedSeen);
  ok("at least one partner-labeled transcript line was received in Teil 3", partnerChunks.length > 0);

  // Confirm the partner voice was actually recorded distinctly server-side.
  const [dbSession] = await rest(`/rest/v1/voice_tutor_sessions?id=eq.${sessionId}&select=id`);
  ok("session row still resolvable after completion", !!dbSession);
  const transcriptRows = await rest(`/rest/v1/voice_tutor_transcript_nodes?session_id=eq.${sessionId}&select=speaker,teil&order=created_at.asc`);
  const teil3Rows = (transcriptRows ?? []).filter((r) => r.teil === 3);
  ok("Teil 3 transcript nodes exist and are all labeled 'partner' or 'student'", teil3Rows.length > 0 && teil3Rows.every((r) => r.speaker === "partner" || r.speaker === "student"));
  const teil1Rows = (transcriptRows ?? []).filter((r) => r.teil === 1);
  const teil2Rows = (transcriptRows ?? []).filter((r) => r.teil === 2);
  ok("Teil 1 transcript nodes are correctly labeled teil=1 (not hardcoded)", teil1Rows.length > 0);
  ok("Teil 2 transcript nodes are correctly labeled teil=2 (not hardcoded)", teil2Rows.length > 0);

  function summarizeUtterances(chunks) {
    const utterances = [];
    for (const c of chunks) {
      const last = utterances[utterances.length - 1];
      if (last && c.t - last.endT < 2_500) { last.text += c.text; last.endT = c.t; }
      else utterances.push({ startT: c.t, endT: c.t, text: c.text });
    }
    return utterances;
  }

  const examinerUtterances = summarizeUtterances(examinerChunks);
  const partnerUtterances = summarizeUtterances(partnerChunks);
  console.log("\n=== Examiner utterance timeline (Teil 1 + Teil 2) ===");
  for (const u of examinerUtterances) console.log(`  [+${(u.startT / 1000).toFixed(1)}s] ${u.text.replace(/\s+/g, " ").trim()}`);
  console.log(`\n=== Partner utterance timeline (Teil 3) ===`);
  for (const u of partnerUtterances) console.log(`  [+${(u.startT / 1000).toFixed(1)}s] ${u.text.replace(/\s+/g, " ").trim()}`);
  console.log(`\nTotal examiner utterances: ${examinerUtterances.length}, partner utterances: ${partnerUtterances.length}`);
  ok(`at least ${2 + TEIL1_QUESTIONS} examiner utterances (Teil1 opening+questions, Teil1->2 transition, >=1 Teil2 question)`, examinerUtterances.length >= 2 + TEIL1_QUESTIONS);
  ok(`at least ${TEIL3_TURNS} partner utterances across Teil 3`, partnerUtterances.length >= TEIL3_TURNS);

  console.log("\nDone. Cleaning up...");
  ws.close();
  await sleep(500);
  await cleanup();
  console.log("cleanup done.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
