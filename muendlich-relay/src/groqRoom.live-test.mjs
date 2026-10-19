/**
 * END-TO-END live test through the REAL running relay (ws room, real Supabase,
 * real silence gate, real Groq STT, real Haiku examiner, real ElevenLabs TTS):
 * two real WebSocket candidates; candidate A delivers a real synthesized-German
 * Teil 1 presentation, then answers the examiner's question. Verifies the
 * examiner's Q1 and Q2 are GROUNDED in what A actually said (i.e. the whole
 * mic -> gate -> Groq -> history -> examiner chain works in a real room) and
 * that A's speech is persisted to muendlich_transcript_nodes.
 *
 * Start the relay first (PORT=8791 MUENDLICH_STT_BACKEND=groq
 * MUENDLICH_VOICE_BACKEND=elevenlabs MUENDLICH_TEIL1_PRESENTATION_SECONDS=30
 * MUENDLICH_TEIL1_ANSWER_WINDOW_SECONDS=15 MUENDLICH_HANDOFF_GRACE_MS=5000
 * MUENDLICH_STAGE1_SECONDS=300 npx tsx src/server.ts), then:
 *   LIVE_TEST_RELAY_URL=ws://localhost:8791 npx tsx src/groqRoom.live-test.mjs
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

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY } = process.env;
const RELAY_URL = process.env.LIVE_TEST_RELAY_URL ?? "ws://localhost:8791";

let failed = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"} — ${name}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function synth(text) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/uvysWDLbKpA4XvpD3GI6?output_format=pcm_16000", {
    method: "POST", headers: { "xi-api-key": ELEVENLABS_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function createCandidate(label) {
  const email = `groqroom-livetest-${label}-${Date.now()}@auralingovia-test.local`;
  const password = "TestGroqRoom2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  const { access_token: jwt } = await login.json();
  if (!jwt) throw new Error(`login failed for ${email}`);
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: label === "A" ? "Fatma" : "Youssef" }) });
  await rest(`/rest/v1/muendlich_credits`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, is_subscribed: true, minutes_balance: 30, window_started_at: new Date().toISOString(), window_days: 30 }) });
  await rest(`/rest/v1/subscriptions`, { method: "POST", body: JSON.stringify({ user_id: user.id, plan_code: "komplett", status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }) });
  return { id: user.id, email, jwt };
}

const PRESENTATION = "Mein Thema ist Reisen. Letztes Jahr bin ich mit einem Freund nach Marokko gefahren. Wir haben eine Nacht in der Sahara in einem Zelt geschlafen und sind auf Kamelen durch die Wüste geritten. Das war ein unvergessliches Erlebnis, weil die Sterne dort so hell leuchten. Ich finde Reisen wichtig, weil man dadurch neue Menschen und fremde Kulturen kennenlernt.";
const ANSWER = "Am meisten hat mich beeindruckt, dass unser Führer jeden Abend für uns ein traditionelles Brot im Sand gebacken hat.";

async function main() {
  const t0 = Date.now();
  const log = (s) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);
  const a = await createCandidate("A");
  const b = await createCandidate("B");
  const [room] = await rest(`/rest/v1/muendlich_rooms`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ code: `GRQ${Date.now()}`, state: "exam_room_ready" }) });
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

  let stage1 = false, lastExaminerAudioAt = 0, anyClosed = false;
  const examinerChunks = []; // { t, text }
  const attach = (ws, label) => ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === "audio") { lastExaminerAudioAt = Date.now(); return; }
    if (m.type === "transcript" && m.speaker === "examiner") { if (label === "A") examinerChunks.push({ t: Date.now(), text: m.text }); return; }
    if (m.type === "stage" && m.stage === 1) stage1 = true;
    if (m.type === "terminated") log(`[${label}] TERMINATED ${JSON.stringify(m)}`);
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
    const [pcmPres, pcmAns] = await Promise.all([synth(PRESENTATION), synth(ANSWER)]);
    log(`synthesized: presentation ${(pcmPres.length / 32000).toFixed(1)}s, answer ${(pcmAns.length / 32000).toFixed(1)}s`);

    const wsA = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(a.jwt)}`);
    const wsB = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(b.jwt)}`);
    attach(wsA, "A"); attach(wsB, "B");
    wsA.on("close", (c) => { anyClosed = true; log(`[A] closed ${c}`); });
    wsB.on("close", (c) => { anyClosed = true; log(`[B] closed ${c}`); });
    await Promise.all([wsA, wsB].map((ws) => new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); })));
    log("both sockets open");

    const silent = Buffer.alloc(3200).toString("base64");
    // Both mics stay live all exam, like real browsers: A/B send frames every 100ms; zeros when not speaking.
    let speakA = null; // Buffer being played into A's mic, consumed in 100ms frames
    let posA = 0;
    const mic = setInterval(() => {
      for (const [ws, who] of [[wsA, "A"], [wsB, "B"]]) {
        if (ws.readyState !== WebSocket.OPEN) continue;
        let data = silent;
        if (who === "A" && speakA && posA < speakA.length) { data = speakA.subarray(posA, posA + 3200).toString("base64"); posA += 3200; if (posA >= speakA.length) speakA = null; }
        ws.send(JSON.stringify({ type: "audio", data }));
      }
    }, 100);

    const waitFor = async (fn, ms, what) => { const end = Date.now() + ms; while (!fn() && !anyClosed && Date.now() < end) await sleep(200); if (!fn()) throw new Error(`timeout waiting for ${what}`); };
    const examinerQuietFor = (ms) => () => Date.now() - lastExaminerAudioAt > ms && lastExaminerAudioAt > 0;

    await waitFor(() => stage1, 40_000, "Teil 1 to start");
    log("Teil 1 started — waiting for the examiner's opening to finish");
    await waitFor(examinerQuietFor(3500), 60_000, "examiner opening to finish");
    const openingChunks = examinerChunks.length;
    log(`opening done (${openingChunks} chunks) — A presents now`);

    // --- A presents ---
    const presStart = Date.now();
    speakA = pcmPres; posA = 0;
    await waitFor(() => speakA === null, 60_000, "presentation playback");
    log("A finished presenting — silence; expecting examiner Q1");
    const q1Marker = examinerChunks.length;
    await waitFor(() => examinerChunks.length > q1Marker, 45_000, "examiner Q1");
    await waitFor(examinerQuietFor(2500), 30_000, "examiner Q1 to finish");
    const q1 = examinerChunks.slice(q1Marker).map((c) => c.text).join("").replace(/\s+/g, " ").trim();
    log(`Q1: ${q1}`);
    ok("Q1 is grounded in A's actual presentation (Marokko/Sahara/Zelt/Kamel/Wüste/Freund/Sterne/Kulturen)", /marokko|sahara|zelt|kamel|wüste|freund|sterne|kultur|reis/i.test(q1) && q1.length > 15);
    ok("Q1 is not the 'couldn't hear you' fallback (STT content reached the examiner)", !/nicht (richtig )?verstanden|konnte.*nicht.*h(ö|oe)ren|noch einmal|wiederholen/i.test(q1));

    // --- A answers Q1 ---
    speakA = pcmAns; posA = 0;
    await waitFor(() => speakA === null, 40_000, "answer playback");
    log("A finished answering — expecting Q2");
    const q2Marker = examinerChunks.length;
    await waitFor(() => examinerChunks.length > q2Marker, 45_000, "examiner Q2");
    await waitFor(examinerQuietFor(2500), 30_000, "examiner Q2 to finish");
    const q2 = examinerChunks.slice(q2Marker).map((c) => c.text).join("").replace(/\s+/g, " ").trim();
    log(`Q2: ${q2}`);
    ok("Q2 exists and differs from Q1", q2.length > 10 && q2 !== q1);

    // --- Persistence ---
    await sleep(1500);
    const nodes = await rest(`/rest/v1/muendlich_transcript_nodes?select=speaker,teil,text,created_at&created_at=gte.${new Date(presStart - 5000).toISOString()}&order=created_at.asc&limit=100`);
    const aNodes = nodes.filter((n) => /marokko|sahara|kamel|wüste|brot|f(ü|ue)hrer/i.test(n.text));
    log(`transcript rows persisted since the presentation started: ${nodes.length}; containing A's words: ${aNodes.length}`);
    for (const n of aNodes.slice(0, 4)) log(`   ${n.speaker} T${n.teil}: ${n.text.slice(0, 110)}`);
    ok("A's Groq-transcribed speech was persisted to muendlich_transcript_nodes", aNodes.length > 0);

    clearInterval(mic);
    wsA.close(); wsB.close();
  } finally {
    await cleanup();
    log("cleanup done");
  }
  console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
  process.exit(failed ? 1 : 0);
}
main().catch(async (e) => { console.error("FATAL", e); process.exit(1); });
