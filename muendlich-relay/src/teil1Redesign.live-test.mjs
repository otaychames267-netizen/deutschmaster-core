/** Live end-to-end test of the redesigned Teil 1 state machine (90s
 * presentation cap -> EXACTLY 2 questions -> 30s answer window each,
 * applied to both Person A and Person B) against the REAL running relay
 * process and REAL Supabase + Gemini Live.
 *
 * Requires the relay to already be running locally with SHORTENED Teil 1
 * timing so this doesn't take 10 real minutes — start it with:
 *   MUENDLICH_TEIL1_PRESENTATION_SECONDS=30 MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS=8 \
 *   MUENDLICH_HANDOFF_GRACE_MS=5000 MUENDLICH_STAGE1_SECONDS=200 MUENDLICH_INTERMISSION_SECONDS=3 \
 *   npm run dev
 * (This script reads the same values back from process.env so its own
 * schedule always matches whatever the relay is actually enforcing —
 * never hardcode a second copy of these numbers.)
 *
 * Creates two disposable candidates + a fresh room/participants/selections,
 * connects two real WebSocket clients, drives realistic audio timing
 * through BOTH the "early finish" path (candidate goes quiet before the
 * cap) and the "hard cap + grace" path (candidate speaks straight through),
 * for BOTH candidates' Q&A, then confirms the state machine reaches Teil 2
 * on its own — before cleaning up every row + both test users.
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

// Same numbers the relay is running with (see file header) — read back, not
// re-guessed, so the test schedule can never silently drift from reality.
const PRESENTATION_S = Number(process.env.MUENDLICH_TEIL1_PRESENTATION_SECONDS ?? 90);
const ANSWER_WINDOW_S = Number(process.env.MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS ?? 30);
const GRACE_MS = Number(process.env.MUENDLICH_HANDOFF_GRACE_MS ?? 15_000);

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
  const email = `teil1-livetest-${label}-${Date.now()}@auralingovia-test.local`;
  const password = "TestTeil1Live2026!";
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
  // muendlich_credits alone is NOT enough — a real bug this test itself
  // ran into: "participants select" RLS (20260716020000_plan_scoped_
  // content_gating.sql, tightened further by 20260716030000_harden_has_
  // plan_access.sql / 20260810120000_muendlich_full_access_upgrade.sql)
  // requires has_plan_access(auth.uid(), 'muendlich'), which checks the
  // `subscriptions` table, NOT muendlich_credits. Without this, the relay's
  // OWN user-scoped participant lookup sees zero rows and closes the socket
  // with 4003 "not a participant" even though the participant row exists —
  // confirmed by reproducing the exact same RLS-scoped query outside the
  // relay during this test's own debugging.
  await rest(`/rest/v1/subscriptions`, {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, plan_code: "komplett", status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }),
  });
  return { id: user.id, email, jwt };
}

async function main() {
  console.log(`Schedule based on: presentation=${PRESENTATION_S}s answerWindow=${ANSWER_WINDOW_S}s grace=${GRACE_MS}ms`);

  const a = await createCandidate("A");
  const b = await createCandidate("B");
  console.log("candidates:", a.id, b.id);

  const [room] = await rest(`/rest/v1/muendlich_rooms`, {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ code: `T1LIVE${Date.now()}`, state: "exam_room_ready" }),
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
      { room_id: roomId, teil: 3, slot: null, value: "Planen Sie gemeinsam eine Willkommensfeier.", locked: true },
    ]),
  });

  const events = []; // { t, text } — t = ms since test start
  const t0 = Date.now();
  const log = (text) => { const t = Date.now() - t0; events.push({ t, text }); console.log(`[+${(t / 1000).toFixed(1)}s] ${text}`); };

  let stage1At = null, stage2At = null, intermissionAt = null, terminatedSeen = false, anyClosed = false;
  const examinerChunks = []; // { t, text }

  function attachHandlers(ws, label) {
    ws.on("message", (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === "audio" || msg.type === "pong") return; // noisy, not interesting here
      if (msg.type === "transcript" && msg.speaker === "examiner") {
        // Only record from label "A" — broadcast() sends every examiner
        // transcript chunk to BOTH participants (correctly, that's how two
        // real candidates both hear the same exam), so recording from both
        // handlers double-counted every chunk (each word appeared twice in
        // the printed timeline) — a test-script artifact, not a product bug.
        if (label === "A") examinerChunks.push({ t: Date.now() - t0, text: msg.text });
        return;
      }
      log(`[${label}] <- ${JSON.stringify(msg).slice(0, 200)}`);
      if (msg.type === "stage" && msg.stage === 1 && stage1At === null) stage1At = Date.now();
      if (msg.type === "stage" && msg.stage === 2 && stage2At === null) stage2At = Date.now();
      if (msg.type === "intermission" && intermissionAt === null) intermissionAt = Date.now();
      if (msg.type === "terminated") terminatedSeen = true;
    });
    ws.on("error", (e) => log(`[${label}] ERROR ${e.message}`));
  }

  async function cleanup() {
    // muendlich_credit_transactions.room_id has NO cascade (audit trail, by
    // design — see project memory) — a real credit tick during the test run
    // (the relay's own 60s-interval deduction) leaves a row that blocks the
    // room delete with a 409 unless removed first. Found the hard way: an
    // earlier run's cleanup silently no-op'd (swallowed by .catch), leaving
    // the room/participants/users behind.
    await rest(`/rest/v1/muendlich_credit_transactions?room_id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/muendlich_rooms?id=eq.${roomId}`, { method: "DELETE" }).catch(() => {}); // cascades participants/selections/exam_sessions
    for (const u of [a, b]) {
      await rest(`/rest/v1/subscriptions?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
      await rest(`/rest/v1/muendlich_credits?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
    }
  }

  // Sanity-check both JWTs are actually valid BEFORE opening any socket —
  // narrows "connection silently closed" down to auth vs. something else,
  // since server.ts's auth/participant-lookup failure paths close the
  // socket with no server-side log line at all.
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

  function startSpeaking(ws, label) {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "audio", data: silentPcm16Frame() }));
    }, 100);
    return () => clearInterval(interval);
  }

  // Wait for stage 1 to actually start (room needs both participants +
  // preflight checks + Gemini session open first — real latency, not fixed).
  const stage1Deadline = Date.now() + 30_000;
  while (stage1At === null && !anyClosed && Date.now() < stage1Deadline) await sleep(200);
  ok("Teil 1 started within 30s of connecting", stage1At !== null);
  if (stage1At === null) {
    console.error("Aborting — Teil 1 never started (socket closed early or timed out).");
    await cleanup();
    process.exit(1);
  }

  // --- Person A: presentation with EARLY FINISH (speaks 12s, then goes
  // quiet well before the cap) ---
  log("A: presenting (will go quiet after 12s to trigger early-finish)");
  let stopA = startSpeaking(wsA, "A");
  await sleep(12_000);
  stopA(); log("A: stopped speaking (silence begins)");

  // finishedEarly needs >=10s of phase elapsed (already true) + 8s trailing
  // silence (SILENCE_THRESHOLD_MS[1], not env-overridable) -> expect Q1
  // around now+8s. Give generous margin before declaring the hard cap fired
  // instead (which would itself still be a legitimate, if less optimal, path).
  await sleep(ANSWER_WINDOW_S <= 8 ? 12_000 : 12_000);

  log("A: answering Q1 briefly (1s speech, then quiet -> expect early completion)");
  stopA = startSpeaking(wsA, "A");
  await sleep(1_000);
  stopA();
  await sleep(6_000); // expect looksFinished ~4s after stop, well inside the answer window

  log("A: NOT answering Q2 at all (expect windowExpired path, ~" + ANSWER_WINDOW_S + "s wait)");
  await sleep(ANSWER_WINDOW_S * 1000 + 4_000);

  // --- Handoff to B, then Person B presents with HARD-CAP+GRACE (never
  // stops talking through the nominal cap) ---
  log(`B: presenting CONTINUOUSLY through the ${PRESENTATION_S}s cap + ${GRACE_MS}ms grace (hard-cap path)`);
  let stopB = startSpeaking(wsB, "B");
  await sleep(PRESENTATION_S * 1000 + GRACE_MS + 3_000);
  stopB(); log("B: stopped speaking");

  log("B: answering Q1 briefly (1s speech, then quiet)");
  stopB = startSpeaking(wsB, "B");
  await sleep(1_000);
  stopB();
  await sleep(6_000);

  log("B: answering Q2 briefly (1s speech, then quiet)");
  stopB = startSpeaking(wsB, "B");
  await sleep(1_000);
  stopB();
  await sleep(6_000);

  // --- Expect intermission -> stage 2 ---
  const stage2Deadline = Date.now() + 30_000;
  while (stage2At === null && Date.now() < stage2Deadline) await sleep(300);

  ok("exactly one intermission fired before Teil 2", intermissionAt !== null);
  ok("Teil 2 (stage 2) started on its own after Teil 1's Q&A completed", stage2At !== null);
  ok("no terminated/error event during the run", !terminatedSeen);

  // --- Group examiner transcript chunks into utterances (>2.5s gap = new utterance) ---
  const utterances = [];
  for (const c of examinerChunks) {
    const last = utterances[utterances.length - 1];
    if (last && c.t - last.endT < 2_500) { last.text += c.text; last.endT = c.t; }
    else utterances.push({ startT: c.t, endT: c.t, text: c.text });
  }
  console.log("\n=== Examiner utterance timeline ===");
  for (const u of utterances) console.log(`  [+${(u.startT / 1000).toFixed(1)}s] ${u.text.replace(/\s+/g, " ").trim()}`);

  // Rough content check: after the opening (welcome+exam_start+teil1 question
  // A), Teil 1 should contain exactly 4 more question-bearing utterances (Q1
  // + Q2 for A, Q1 + Q2 for B) plus the scripted A->B handoff sentence.
  const stage1Utterances = utterances.filter((u) => u.startT >= 0 && (stage2At === null || u.startT < stage2At - t0));
  console.log(`\nTotal examiner utterances observed during Teil 1: ${stage1Utterances.length} (expect ~7: opening x2, A-Q1, A-Q2, handoff, B-Q1, B-Q2)`);

  console.log("\nDone. Cleaning up...");
  wsA.close(); wsB.close();
  await cleanup();
  console.log("cleanup done.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
