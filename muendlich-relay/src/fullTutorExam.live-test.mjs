/**
 * FULL-LENGTH, REAL-TIMING 1:1 AI Voice Tutor session (Teil 1 -> Teil 2 -> Teil 3, one
 * student alone with the AI examiner / study partner), to MEASURE what one solo exam
 * actually costs — read back from voice_tutor_costs, which the relay writes from real
 * vendor usage when the session ends.
 *
 * The student is simulated: a Haiku "brain" writes what they say (B2 German with the odd
 * learner mistake) and ElevenLabs Flash speaks it into the mic in real time. Like a
 * person, the student waits until the AI's audio has finished PLAYING (tracked from the
 * audio the relay sends, like the browser's gapless scheduler), then answers. The browser
 * streams EVERY mic frame, silence included, so the mic here sends zeros whenever the
 * student isn't talking. Production timings, production settings, nothing shortened.
 *
 * Start the relay exactly like production (no timing overrides):
 *   PORT=8791 MUENDLICH_VOICE_BACKEND=elevenlabs MUENDLICH_STT_BACKEND=groq
 *   CLAUDE_EXAMINER_MODEL=claude-haiku-4-5-20251001 npx tsx src/server.ts
 * then: LIVE_TEST_RELAY_URL=ws://localhost:8791 npx tsx src/fullTutorExam.live-test.mjs
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
const VOICE = "uvysWDLbKpA4XvpD3GI6";
const NAME = "Fatma";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (s) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s] ${s}`);

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function synth(text) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=pcm_16000`, {
      method: "POST", headers: { "xi-api-key": ELEVENLABS_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    await sleep(1000 * (attempt + 1));
  }
  throw new Error("student TTS failed");
}

async function brain(instruction, transcript) {
  const history = transcript.slice(-14).map((l) => `${l.who}: ${l.text}`).join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 520, thinking: { type: "disabled" },
      system: `Du bist ${NAME}, eine B2-Deutschlernerin in einer telc-Prüfung (mündlich, Übungsmodus allein mit einer KI-Prüferin). Sprich natürlich und zusammenhängend, mit gelegentlichen typischen Lernerfehlern (Artikel, Kasus, Wortstellung), aber verständlich. Antworte NUR mit dem, was du laut sagst — keine Regieanweisungen, keine Anführungszeichen.`,
      messages: [{ role: "user", content: `${history ? `Bisheriger Verlauf:\n${history}\n\n` : ""}${instruction}` }],
    }),
  });
  const j = await res.json();
  const text = (j.content ?? []).map((c) => c.text ?? "").join("").trim();
  if (!text) throw new Error("brain returned nothing: " + JSON.stringify(j).slice(0, 200));
  return text;
}

async function main() {
  // ---- disposable student + session row (the student's OWN client creates it in the app) ----
  const email = `fulltutor-livetest-${Date.now()}@auralingovia-test.local`, password = "TestFullTutor2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { access_token: jwt } = await login.json();
  if (!jwt) throw new Error("login failed");
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: NAME }) });
  const [m1] = await rest(`/rest/v1/muendlich_materials?teil=eq.1&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  const [m2] = await rest(`/rest/v1/muendlich_materials?teil=eq.2&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  const [m3] = await rest(`/rest/v1/muendlich_materials?teil=eq.3&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`);
  log(`topics: ${m1.title} / ${m2.title} / ${m3.title}`);
  const [session] = await rest(`/rest/v1/voice_tutor_sessions`, {
    method: "POST", headers: { Prefer: "return=representation", Authorization: `Bearer ${jwt}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ user_id: user.id, level: "TELC_B2", teil1_material_id: m1.id, teil2_material_id: m2.id, teil3_material_id: m3.id }),
  });
  const sessionId = session.id;

  // ---- state ----
  let stage = 1, ready = false, complete = false, terminated = null, closed = false;
  let playbackEndsAt = 0;
  const heard = [];                       // AI utterances not yet answered
  const transcript = [];
  let mic = null, speaking = false, lastSpeechEndsAt = 0, turns = 0;
  let presented = false;

  const ws = new WebSocket(`${RELAY_URL}/tutor/${sessionId}?token=${encodeURIComponent(jwt)}`);
  ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === "audio") { playbackEndsAt = Math.max(playbackEndsAt, Date.now()) + (Buffer.from(m.data, "base64").length / 48000) * 1000; return; }
    if (m.type === "transcript" && (m.speaker === "examiner" || m.speaker === "partner")) { heard.push({ who: m.speaker, text: m.text }); return; }
    if (m.type === "ready") ready = true;
    if (m.type === "stage") { stage = m.stage; log(`=== STAGE ${m.stage} ===`); }
    if (m.type === "session_complete") { complete = true; log("session_complete"); }
    if (m.type === "terminated") { terminated = m.reason; log(`TERMINATED: ${m.reason}`); }
  });
  ws.on("close", () => { closed = true; });
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  log("student connected");

  const silent = Buffer.alloc(3200).toString("base64");
  const micTimer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    let data = silent;
    if (mic && mic.pos < mic.pcm.length) { data = mic.pcm.subarray(mic.pos, mic.pos + 3200).toString("base64"); mic.pos += 3200; if (mic.pos >= mic.pcm.length) mic = null; }
    ws.send(JSON.stringify({ type: "audio", data }));
  }, 100);

  async function respond(prompt) {
    speaking = true;
    try {
      const wantsPresentation = !presented && stage === 1;
      const instruction = wantsPresentation
        ? `Die Prüferin hat gesagt: „${prompt}“. Halte jetzt deine Präsentation zum Thema „${m1.title}“. Sprich etwa 70 Sekunden lang (ca. 165 Wörter), in der Ich-Form, zusammenhängend, mit Beispielen aus deinem Leben.`
        : `${stage === 3 ? "Dein Übungspartner" : "Die Prüferin"} hat gerade gesagt: „${prompt}“. Antworte darauf in 2 bis 3 Sätzen (etwa 12 Sekunden).`;
      const text = await brain(instruction, transcript);
      const pcm = await synth(text);
      while (Date.now() < playbackEndsAt + 500 && !complete) await sleep(200);
      transcript.push({ who: NAME, text });
      log(`${NAME} (${wantsPresentation ? "presentation" : "answer"}, ${(pcm.length / 32000).toFixed(0)}s): ${text.slice(0, 100)}…`);
      mic = { pcm, pos: 0 };
      if (wantsPresentation) presented = true;
      while (mic && !complete) await sleep(150);
      turns++;
      lastSpeechEndsAt = Date.now();
    } finally { speaking = false; }
  }

  const deadline = Date.now() + 32 * 60_000;
  while (!complete && !terminated && !closed && Date.now() < deadline) {
    await sleep(400);
    if (speaking || !ready) continue;
    if (Date.now() < playbackEndsAt + 700) continue;
    if (Date.now() < lastSpeechEndsAt + 1200) continue;
    if (heard.length === 0) continue;
    const prompt = heard.splice(0).map((h) => h.text).join(" ").replace(/\s+/g, " ").trim();
    transcript.push({ who: "KI", text: prompt });
    log(`KI: ${prompt.slice(0, 120)}${prompt.length > 120 ? "…" : ""}`);
    try { await respond(prompt); } catch (e) { log(`student turn failed: ${e.message}`); await sleep(2000); }
  }
  clearInterval(micTimer);
  log(`session ${complete ? "COMPLETE" : terminated ? "TERMINATED (" + terminated + ")" : closed ? "socket closed" : "TIMED OUT"} after ${((Date.now() - t0) / 60000).toFixed(1)} min; student turns: ${turns}`);

  // The relay writes the cost row when the session ends — poll for it instead of racing it.
  let cost = null;
  for (let i = 0; i < 20 && !cost; i++) { await sleep(3000); try { [cost] = await rest(`/rest/v1/voice_tutor_costs?select=*&session_id=eq.${sessionId}`); } catch {} }
  const nodes = await rest(`/rest/v1/voice_tutor_transcript_nodes?select=speaker,teil&session_id=eq.${sessionId}&limit=500`).catch(() => []);
  console.log("\n=== RESULT ===");
  console.log("transcript nodes by speaker:", JSON.stringify(nodes.reduce((a, n) => { a[n.speaker] = (a[n.speaker] ?? 0) + 1; return a; }, {})), " by Teil:", JSON.stringify(nodes.reduce((a, n) => { a[n.teil] = (a[n.teil] ?? 0) + 1; return a; }, {})));
  console.log("MEASURED COST ROW:", JSON.stringify(cost, null, 1));

  await rest(`/rest/v1/voice_tutor_sessions?id=eq.${sessionId}`, { method: "DELETE" }).catch(() => {});
  await rest(`/rest/v1/voice_tutor_daily_usage?user_id=eq.${user.id}`, { method: "DELETE" }).catch(() => {});
  await rest(`/rest/v1/muendlich_elevenlabs_usage?user_id=eq.${user.id}`, { method: "DELETE" }).catch(() => {});
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
  log("cleanup done");
  process.exit(0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
