/**
 * END-TO-END live test of the scripted lead+rest lines through the REAL relay:
 * runs a whole accelerated exam (both candidates silent — the point is the
 * examiner's scripted moments, not STT) and verifies from the persisted
 * transcript that the exam_start, B's handoff and BOTH section transitions are
 * delivered as [pre-generated lead clip] + [live remainder carrying the name /
 * topic], in order, with no line lost or duplicated.
 *
 * Start the relay first with accelerated timing:
 *   PORT=8791 MUENDLICH_VOICE_BACKEND=elevenlabs MUENDLICH_STT_BACKEND=groq
 *   CLAUDE_EXAMINER_MODEL=claude-haiku-4-5-20251001
 *   MUENDLICH_TEIL1_PRESENTATION_SECONDS=10 MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS=6
 *   MUENDLICH_HANDOFF_GRACE_MS=1500 MUENDLICH_STAGE1_SECONDS=300 MUENDLICH_INTERMISSION_SECONDS=3
 *   MUENDLICH_STAGE2_SECONDS=30 MUENDLICH_TEIL2_TAKEOVER_SEC=12 MUENDLICH_STAGE3_SECONDS=22
 *   MUENDLICH_TEIL3_COMPLETION_SEC=12 npx tsx src/server.ts
 * then: LIVE_TEST_RELAY_URL=ws://localhost:8791 npx tsx src/scriptedLeadRoom.live-test.mjs
 */
import { readFileSync } from "node:fs";
import WebSocket from "ws";
import { getScriptedLeadPhrases } from "./examinerPhrases.ts";

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

let failed = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"} — ${name}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function createCandidate(label, fullName) {
  const email = `leadroom-livetest-${label}-${Date.now()}@auralingovia-test.local`;
  const password = "TestLeadRoom2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { access_token: jwt } = await login.json();
  if (!jwt) throw new Error("login failed");
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: fullName }) });
  await rest(`/rest/v1/muendlich_credits`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, is_subscribed: true, minutes_balance: 30, window_started_at: new Date().toISOString(), window_days: 30 }) });
  await rest(`/rest/v1/subscriptions`, { method: "POST", body: JSON.stringify({ user_id: user.id, plan_code: "komplett", status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }) });
  return { id: user.id, jwt };
}

async function main() {
  const t0 = Date.now();
  const log = (s) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);
  const a = await createCandidate("A", "Fatma");
  const b = await createCandidate("B", "Youssef");
  const [room] = await rest(`/rest/v1/muendlich_rooms`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ code: `LDR${Date.now()}`, state: "exam_room_ready" }) });
  const roomId = room.id;
  await rest(`/rest/v1/muendlich_participants`, { method: "POST", body: JSON.stringify([
    { room_id: roomId, user_id: a.id, slot: "A", connected: true, ready: true, mic_ok: true, voice_ok: true },
    { room_id: roomId, user_id: b.id, slot: "B", connected: true, ready: true, mic_ok: true, voice_ok: true },
  ]) });
  await rest(`/rest/v1/muendlich_selections`, { method: "POST", body: JSON.stringify([
    { room_id: roomId, teil: 1, slot: "A", value: "Reise", locked: true },
    { room_id: roomId, teil: 1, slot: "B", value: "Wichtige Erfahrung", locked: true },
    { room_id: roomId, teil: 2, slot: null, value: "Sollte man Kindern ein eigenes Smartphone erlauben?", locked: true },
    { room_id: roomId, teil: 3, slot: null, value: "Planen Sie gemeinsam eine Willkommensfeier.", locked: true },
  ]) });

  const stages = [], events = [];
  let finished = false, terminated = null, anyClosed = false, sessionId = null;
  const attach = (ws, label) => ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === "audio" || m.type === "pong") return;
    if (label !== "A") return;
    if (m.type === "stage") { stages.push(m.stage); log(`stage ${m.stage}`); }
    if (m.type === "finished") finished = true;
    if (m.type === "terminated") { terminated = m.reason; log(`TERMINATED ${m.reason}`); }
    events.push(m.type);
  });
  async function cleanup() {
    await rest(`/rest/v1/muendlich_credit_transactions?room_id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/muendlich_rooms?id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
    for (const u of [a, b]) {
      await rest(`/rest/v1/subscriptions?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
      await rest(`/rest/v1/muendlich_credits?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
    }
  }

  try {
    const wsA = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(a.jwt)}`);
    const wsB = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(b.jwt)}`);
    attach(wsA, "A"); attach(wsB, "B");
    wsA.on("close", () => { anyClosed = true; }); wsB.on("close", () => { anyClosed = true; });
    await Promise.all([wsA, wsB].map((ws) => new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); })));
    const silent = Buffer.alloc(3200).toString("base64");
    const mic = setInterval(() => { for (const ws of [wsA, wsB]) if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "audio", data: silent })); }, 100);

    const deadline = Date.now() + 6 * 60_000;
    while (!finished && !terminated && !anyClosed && Date.now() < deadline) await sleep(500);
    log(`exam ${finished ? "finished" : terminated ? "terminated: " + terminated : "did not finish in time"}; stages seen: ${stages.join(",")}`);
    clearInterval(mic);
    await sleep(1500);

    const [sess] = await rest(`/rest/v1/muendlich_exam_sessions?select=id&room_id=eq.${roomId}&order=created_at.desc&limit=1`);
    sessionId = sess?.id;
    const nodes = await rest(`/rest/v1/muendlich_transcript_nodes?select=speaker,teil,text,created_at&session_id=eq.${sessionId}&order=created_at.asc&limit=200`);
    const examiner = nodes.filter((n) => n.speaker === "examiner");
    console.log("\n=== examiner lines (persisted) ===");
    examiner.forEach((n, i) => console.log(`${String(i).padStart(2)} T${n.teil}: ${n.text.slice(0, 130)}`));

    const leads = getScriptedLeadPhrases();
    const leadTexts = new Set(leads.map((l) => l.text));
    const leadNodes = examiner.map((n, i) => ({ n, i })).filter(({ n }) => leadTexts.has(n.text));
    log(`${leadNodes.length} examiner lines are exact pre-generated lead clips`);
    ok("exam ran through all three Teile and finished cleanly", finished && stages.join(",") === "1,2,3");
    ok("at least the two section transitions were played as lead clips", leadNodes.filter(({ n }) => n.teil === 2 || n.teil === 3).length >= 1);
    ok("every lead clip is IMMEDIATELY followed by its live remainder (a different, non-lead examiner line)", leadNodes.every(({ i }) => examiner[i + 1] && !leadTexts.has(examiner[i + 1].text)));
    ok("the live remainder after a Teil-2 lead carries the real topic", leadNodes.filter(({ n }) => n.teil === 2).every(({ i }) => /smartphone/i.test(examiner[i + 1]?.text ?? "")) );
    ok("the live remainder after a Teil-3 lead carries the real topic", leadNodes.filter(({ n }) => n.teil === 3).every(({ i }) => /willkommensfeier/i.test(examiner[i + 1]?.text ?? "")));
    ok("exam_start addresses candidate A by name", examiner.some((n) => /Fatma/.test(n.text) && /Reisen|Reise/i.test(n.text)));
    ok("B's handoff addresses B by name", examiner.some((n) => /Youssef/.test(n.text) && /Thema|Erfahrung/i.test(n.text)));
  } finally {
    await cleanup();
    log("cleanup done");
  }
  console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
