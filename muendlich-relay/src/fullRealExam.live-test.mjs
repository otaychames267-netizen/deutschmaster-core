/**
 * FULL-LENGTH, REAL-TIMING exam through the real relay, to MEASURE what one
 * 2-candidate exam actually costs (read back from muendlich_exam_costs, which the
 * relay writes from real vendor usage when the room ends).
 *
 * Candidates are simulated learners: a Haiku "brain" writes what each says (B2
 * German with the odd learner mistake) and ElevenLabs Flash speaks it into the
 * mic in real time. They behave like people: they wait until the examiner's audio
 * has finished PLAYING (tracked from the audio the relay sends, like the browser's
 * gapless scheduler) before they speak, answer when asked, and talk to each other
 * in Teil 2 / 3. Nothing is shortened: production timings, production settings.
 *
 * Start the relay exactly like production (no timing overrides):
 *   PORT=8791 MUENDLICH_VOICE_BACKEND=elevenlabs MUENDLICH_STT_BACKEND=groq
 *   CLAUDE_EXAMINER_MODEL=claude-haiku-4-5-20251001 npx tsx src/server.ts
 * then: LIVE_TEST_RELAY_URL=ws://localhost:8791 npx tsx src/fullRealExam.live-test.mjs
 * (takes ~15-20 minutes of wall-clock time)
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
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, ANTHROPIC_API_KEY } = process.env;
const RELAY_URL = process.env.LIVE_TEST_RELAY_URL ?? "ws://localhost:8791";
const VOICES = { A: "uvysWDLbKpA4XvpD3GI6", B: "KDqku3FJfbImX6HKQdWA" };
const NAMES = { A: "Fatma", B: "Youssef" };
const TOPICS = { A: "Reisen (Ziel, Zeit, Land und Leute, Sehenswürdigkeiten)", B: "Eine wichtige Erfahrung (was, wann, wo, mit wem, warum wichtig)" };
const TEIL2 = "Sollte man Kindern ein eigenes Smartphone erlauben?";
const TEIL3 = "Planen Sie gemeinsam eine Willkommensfeier für neue Kollegen im Büro.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (s) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s] ${s}`);

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
async function createCandidate(label) {
  const email = `fullexam-livetest-${label}-${Date.now()}@auralingovia-test.local`;
  const password = "TestFullExam2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { access_token: jwt } = await login.json();
  if (!jwt) throw new Error("login failed");
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: NAMES[label] }) });
  await rest(`/rest/v1/muendlich_credits`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, is_subscribed: true, minutes_balance: 60, window_started_at: new Date().toISOString(), window_days: 30 }) });
  await rest(`/rest/v1/subscriptions`, { method: "POST", body: JSON.stringify({ user_id: user.id, plan_code: "komplett", status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }) });
  return { id: user.id, jwt };
}

async function synth(text, voiceId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_16000`, {
      method: "POST", headers: { "xi-api-key": ELEVENLABS_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    await sleep(1000 * (attempt + 1));
  }
  throw new Error("candidate TTS failed");
}

/** The simulated learner's words. B2 German, a few realistic mistakes. */
async function brain(who, instruction, transcript) {
  const history = transcript.slice(-14).map((l) => `${l.who}: ${l.text}`).join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 520, thinking: { type: "disabled" },
      system: `Du bist ${NAMES[who]}, eine B2-Deutschlernerin in einer telc-Prüfung (mündlich). Sprich natürlich und zusammenhängend, mit gelegentlichen typischen Lernerfehlern (Artikel, Kasus, Wortstellung), aber verständlich. Antworte NUR mit dem, was du laut sagst — keine Regieanweisungen, keine Anführungszeichen.`,
      messages: [{ role: "user", content: `${history ? `Bisheriger Verlauf:\n${history}\n\n` : ""}${instruction}` }],
    }),
  });
  const j = await res.json();
  const text = (j.content ?? []).map((c) => c.text ?? "").join("").trim();
  if (!text) throw new Error("brain returned nothing: " + JSON.stringify(j).slice(0, 200));
  return text;
}

async function main() {
  const cand = { A: await createCandidate("A"), B: await createCandidate("B") };
  const [room] = await rest(`/rest/v1/muendlich_rooms`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ code: `FUL${Date.now()}`, state: "exam_room_ready" }) });
  const roomId = room.id;
  await rest(`/rest/v1/muendlich_participants`, { method: "POST", body: JSON.stringify([
    { room_id: roomId, user_id: cand.A.id, slot: "A", connected: true, ready: true, mic_ok: true, voice_ok: true },
    { room_id: roomId, user_id: cand.B.id, slot: "B", connected: true, ready: true, mic_ok: true, voice_ok: true },
  ]) });
  await rest(`/rest/v1/muendlich_selections`, { method: "POST", body: JSON.stringify([
    { room_id: roomId, teil: 1, slot: "A", value: "Reise", locked: true },
    { room_id: roomId, teil: 1, slot: "B", value: "Wichtige Erfahrung", locked: true },
    { room_id: roomId, teil: 2, slot: null, value: TEIL2, locked: true },
    { room_id: roomId, teil: 3, slot: null, value: TEIL3, locked: true },
  ]) });

  // ---- shared state -------------------------------------------------------
  let stage = 0, finished = false, terminated = null, anyClosed = false;
  let playbackEndsAt = 0;                 // when the examiner audio received so far finishes PLAYING (browser-like gapless queue)
  const examinerSince = [];               // examiner text since the last candidate turn ended
  const transcript = [];                  // { who, text }
  const mic = { A: null, B: null };       // { pcm, pos } being spoken into each mic
  let lastSpeechEndsAt = 0, speaking = false, lastSpeaker = "B";
  const t1 = { speaker: "A", presented: { A: false, B: false }, answers: { A: 0, B: 0 } };
  let turns = 0;

  const attach = (ws, label) => ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (label !== "A") return;
    if (m.type === "audio") { const dur = Buffer.from(m.data, "base64").length / 48000; playbackEndsAt = Math.max(playbackEndsAt, Date.now()) + dur * 1000; return; }
    if (m.type === "transcript" && m.speaker === "examiner") { examinerSince.push(m.text); return; }
    if (m.type === "stage") { stage = m.stage; log(`=== STAGE ${m.stage} ===`); }
    if (m.type === "finished") finished = true;
    if (m.type === "terminated") { terminated = m.reason; log(`TERMINATED: ${m.reason}`); }
  });

  const wsA = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(cand.A.jwt)}`);
  const wsB = new WebSocket(`${RELAY_URL}/room/${roomId}?token=${encodeURIComponent(cand.B.jwt)}`);
  attach(wsA, "A"); attach(wsB, "B");
  wsA.on("close", () => { anyClosed = true; }); wsB.on("close", () => { anyClosed = true; });
  await Promise.all([wsA, wsB].map((ws) => new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); })));
  log("both candidates connected");

  const silent = Buffer.alloc(3200).toString("base64");
  const micTimer = setInterval(() => {
    for (const [who, ws] of [["A", wsA], ["B", wsB]]) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const m = mic[who];
      let data = silent;
      if (m && m.pos < m.pcm.length) { data = m.pcm.subarray(m.pos, m.pos + 3200).toString("base64"); m.pos += 3200; if (m.pos >= m.pcm.length) mic[who] = null; }
      ws.send(JSON.stringify({ type: "audio", data }));
    }
  }, 100);

  async function prepareTurn(who, instruction) {
    const text = await brain(who, instruction, transcript);
    const pcm = await synth(text, VOICES[who]);
    return { who, text, pcm };
  }
  // Real conversation partners think while the other one is still talking — so the next reply is prepared during
  // the current turn, which keeps the gaps between turns human-sized (~2s) instead of brain+TTS latency (~5s).
  let prefetched = null;
  const convInstruction = () => {
    const topic = stage === 2 ? TEIL2 : TEIL3;
    const role = stage === 2 ? `Ihr diskutiert zu zweit das Thema „${topic}“. Gib deine Meinung mit einem Grund oder Beispiel und reagiere auf deine Partnerin/deinen Partner.` : `Ihr plant zu zweit: „${topic}“. Mach einen konkreten Vorschlag (Termin, Ort, Essen, Budget, Aufgaben) oder reagiere auf den Vorschlag deines Partners und einigt euch.`;
    return `${role} Sprich 2 bis 3 Sätze (etwa 12 Sekunden).`;
  };

  async function speakTurn(who, instruction, label, prepared) {
    speaking = true;
    try {
      const { text, pcm } = prepared ?? (await prepareTurn(who, instruction));
      const secs = pcm.length / 32000;
      // The examiner may have started talking while we were thinking — a person would stop and wait.
      while (Date.now() < playbackEndsAt + 500 && !finished) await sleep(200);
      transcript.push({ who: NAMES[who], text });
      log(`${NAMES[who]} (${label}, ${secs.toFixed(0)}s): ${text.slice(0, 110)}${text.length > 110 ? "…" : ""}`);
      mic[who] = { pcm, pos: 0 };
      if (label === "discussion" || label === "planning") {
        const other = who === "A" ? "B" : "A";
        prefetched = prepareTurn(other, convInstruction()).catch(() => null);
      } else prefetched = null;
      while (mic[who] && !finished) await sleep(150);
      turns++;
      lastSpeaker = who;
      lastSpeechEndsAt = Date.now();
      promptOpen = false; // the examiner's prompt has been answered
    } finally { speaking = false; }
  }

  let lastPrompt = "", promptOpen = false;
  async function decide() {
    const fresh = examinerSince.splice(0).join(" ").replace(/\s+/g, " ").trim();
    if (fresh) { lastPrompt = fresh; promptOpen = true; transcript.push({ who: "Prüferin", text: fresh }); log(`Prüferin: ${fresh.slice(0, 140)}${fresh.length > 140 ? "…" : ""}`); }
    const pending = promptOpen ? lastPrompt : "";
    if (stage === 1) {
      // handoff to B: the examiner addresses Youssef and names his topic
      if (t1.speaker === "A" && t1.presented.A && /Youssef/.test(pending) && /Thema/.test(pending)) t1.speaker = "B";
      const s = t1.speaker;
      if (!t1.presented[s]) {
        if (!pending) return; // opening / handoff not delivered yet
        t1.presented[s] = true;
        return speakTurn(s, `Halte jetzt deine Präsentation zum Thema „${TOPICS[s]}“. Sprich etwa 70 Sekunden lang (ca. 165 Wörter), in der Ich-Form, zusammenhängend, mit Beispielen aus deinem Leben.`, "presentation");
      }
      if (pending.includes("?") && t1.answers[s] < 2) {
        t1.answers[s]++;
        return speakTurn(s, `Die Prüferin hat dir gerade diese Frage gestellt: „${pending}“. Antworte in 2 bis 3 Sätzen (etwa 12 Sekunden).`, `answer ${t1.answers[s]}`);
      }
      return;
    }
    // Teil 2 / 3: candidates talk to each other; when the examiner addresses one by name, that one answers
    const ia = pending.indexOf("Fatma"), ib = pending.indexOf("Youssef");
    const addressed = ia >= 0 && (ib < 0 || ia < ib) ? "A" : ib >= 0 ? "B" : null;
    const topic = stage === 2 ? TEIL2 : TEIL3;
    if (addressed && pending.includes("?")) { prefetched = null; return speakTurn(addressed, `Die Prüferin fragt (Thema: „${topic}“): „${pending}“. Antworte in 2 bis 3 Sätzen (etwa 12 Sekunden).`, "answers examiner"); }
    const who = lastSpeaker === "A" ? "B" : "A";
    const label = stage === 2 ? "discussion" : "planning";
    let prep = null;
    if (prefetched) { prep = await prefetched; prefetched = null; if (prep && prep.who !== who) prep = null; }
    return speakTurn(who, convInstruction(), label, prep ?? undefined);
  }

  const deadline = Date.now() + 32 * 60_000;
  while (!finished && !terminated && !anyClosed && Date.now() < deadline) {
    await sleep(400);
    if (speaking || stage === 0) continue;
    if (Date.now() < playbackEndsAt + 700) continue;               // examiner still talking
    if (Date.now() < lastSpeechEndsAt + 1200) continue;            // natural gap between turns
    try { await decide(); } catch (e) { log(`candidate turn failed: ${e.message}`); await sleep(2000); }
  }
  clearInterval(micTimer);
  log(`exam ${finished ? "FINISHED" : terminated ? "TERMINATED (" + terminated + ")" : anyClosed ? "socket closed" : "TIMED OUT"} after ${((Date.now() - t0) / 60000).toFixed(1)} min; candidate turns: ${turns}`);

  // ---- read the MEASURED cost the relay recorded, before cleanup deletes the session ----
  // The relay evaluates both candidates AFTER broadcasting "finished" (two sequential Claude calls) and only then
  // writes the cost row — wait for all of it instead of racing it (and deleting the session under it).
  let session = null, cost = null, evals = [], nodes = [];
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    try {
      [session] = await rest(`/rest/v1/muendlich_exam_sessions?select=id,end_reason,ended_at&room_id=eq.${roomId}&order=created_at.desc&limit=1`);
      [cost] = await rest(`/rest/v1/muendlich_exam_costs?select=*&session_id=eq.${session.id}`);
      evals = await rest(`/rest/v1/muendlich_evaluations?select=user_id,teil1_score,teil2_score,teil3_score,overall_score,cefr_level&session_id=eq.${session.id}`);
      nodes = await rest(`/rest/v1/muendlich_transcript_nodes?select=speaker,teil&session_id=eq.${session.id}&limit=1000`);
      if (cost && evals.length >= 2) break;
    } catch (e) { log(`waiting for results: ${e.message.slice(0, 80)}`); }
  }
  console.log("\n=== RESULT ===");
  console.log("end_reason:", session?.end_reason);
  console.log("transcript nodes by speaker:", JSON.stringify(nodes.reduce((a, n) => { a[n.speaker] = (a[n.speaker] ?? 0) + 1; return a; }, {})), " by Teil:", JSON.stringify(nodes.reduce((a, n) => { a[n.teil] = (a[n.teil] ?? 0) + 1; return a; }, {})));
  console.log("evaluations:", JSON.stringify(evals));
  console.log("MEASURED COST ROW:", JSON.stringify(cost, null, 1));

  // cleanup
  await rest(`/rest/v1/muendlich_credit_transactions?room_id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
  await rest(`/rest/v1/muendlich_rooms?id=eq.${roomId}`, { method: "DELETE" }).catch(() => {});
  for (const u of Object.values(cand)) {
    await rest(`/rest/v1/subscriptions?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/muendlich_credits?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
  }
  log("cleanup done");
  process.exit(0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
