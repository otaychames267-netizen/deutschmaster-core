/** Live end-to-end test of the 1:1 AI tutor with a REAL (synthesized) candidate: the candidate's German is written by Claude Haiku in reaction to what the
 * tutor just said, spoken with ElevenLabs TTS (fallback: a DeepInfra Qwen voice) and streamed into the tutor socket as 16 kHz PCM in real time — so the
 * relay runs its real pipeline (silence detection -> Groq STT -> Claude tutor -> TTS provider -> cached transition clips) with PRODUCTION timing.
 * Prints the transcript, the per-turn response latency the student would feel (end of the candidate's speech -> first tutor audio) and the MEASURED cost
 * row the relay wrote (voice_tutor_costs). The candidate's own TTS/Claude cost is reported separately — it is the test harness, not product cost.
 *
 * Needs the relay running locally with the production-like settings, e.g. (PowerShell, from muendlich-relay/):
 *   $env:PORT=8791; $env:MUENDLICH_TUTOR_ENABLED="true"; $env:MUENDLICH_STT_BACKEND="groq"; $env:TUTOR_TTS_PROVIDER="deepinfra"
 *   $env:CLAUDE_EXAMINER_MODEL="claude-haiku-4-5-20251001"; npx tsx --env-file=.env src/server.ts
 * then:  node src/tutorRealCandidate.live-test.mjs        (LIVE_TEST_RELAY_URL, default ws://localhost:8791; SKIP_CLEANUP=1 keeps the rows)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import WebSocket from "ws";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) { let v = m[2].trim(); if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1); process.env[m[1]] = v; }
}
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, ANTHROPIC_API_KEY, DEEPINFRA_API_KEY } = process.env;
const RELAY_URL = process.env.LIVE_TEST_RELAY_URL ?? "ws://localhost:8791";
const NAME = "Fatma";
const EL_VOICE = process.env.CANDIDATE_EL_VOICE ?? "it8IUwkHD8mtjbyJyCuC"; // Lena — not one of the tutor's voices
const DI_VOICE = process.env.CANDIDATE_DI_VOICE ?? "4fvqlbo1i732kvl6xoaj"; // Aura_F2 test clone on DeepInfra (fallback voice for the candidate)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (s) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s] ${s}`);
const sFor = (ms) => (ms / 1000).toFixed(1);

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function createStudent() {
  const email = `tutor-realcand-livetest-${Date.now()}@auralingovia-test.local`, password = "TestTutorRealCand2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { access_token: jwt } = await login.json();
  if (!jwt) throw new Error("login failed");
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: NAME }) });
  return { id: user.id, jwt };
}

// ---- the candidate: words (Claude Haiku) + voice (ElevenLabs, fallback DeepInfra Qwen) ----
const candTts = { elevenlabsChars: 0, deepinfraChars: 0, elevenlabsFailed: null };
async function synth(text) {
  if (!candTts.elevenlabsFailed && ELEVENLABS_API_KEY) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}?output_format=pcm_16000`, { method: "POST", headers: { "xi-api-key": ELEVENLABS_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }) });
    if (res.ok) { candTts.elevenlabsChars += text.length; return Buffer.from(await res.arrayBuffer()); }
    candTts.elevenlabsFailed = `${res.status} ${(await res.text()).slice(0, 160)}`;
    log(`candidate TTS: ElevenLabs refused (${candTts.elevenlabsFailed}) — using a DeepInfra Qwen voice for the candidate from now on`);
  }
  const res = await fetch("https://api.deepinfra.com/v1/openai/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${DEEPINFRA_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "Qwen/Qwen3-TTS", voice: DI_VOICE, input: text, response_format: "pcm" }) });
  if (!res.ok) throw new Error(`candidate TTS failed on both providers: ${res.status} ${(await res.text()).slice(0, 160)}`);
  candTts.deepinfraChars += text.length;
  const pcm24 = Buffer.from(await res.arrayBuffer()); // 24 kHz -> 16 kHz (linear interpolation)
  const n24 = Math.floor(pcm24.length / 2), n16 = Math.floor((n24 * 2) / 3), out = Buffer.alloc(n16 * 2);
  for (let i = 0; i < n16; i++) { const p = (i * 3) / 2, a = Math.floor(p), f = p - a; const s0 = pcm24.readInt16LE(a * 2), s1 = a + 1 < n24 ? pcm24.readInt16LE((a + 1) * 2) : s0; out.writeInt16LE(Math.round(s0 + (s1 - s0) * f), i * 2); }
  return out;
}

const candBrain = { inputTokens: 0, outputTokens: 0 };
async function brain(instruction, transcript) {
  const history = transcript.slice(-12).map((l) => `${l.who}: ${l.text}`).join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 600,
      system: `Du bist ${NAME}, eine B2-Deutschlernerin in einer telc-Prüfungssimulation (mündlich). Sprich natürlich und zusammenhängend, mit gelegentlichen typischen Lernerfehlern (Artikel, Kasus, Wortstellung), aber verständlich. Antworte NUR mit dem, was du laut sagst — keine Regieanweisungen, keine Anführungszeichen.`,
      messages: [{ role: "user", content: `${history ? `Bisheriger Verlauf:\n${history}\n\n` : ""}${instruction}` }] }),
  });
  const j = await res.json();
  candBrain.inputTokens += j.usage?.input_tokens ?? 0; candBrain.outputTokens += j.usage?.output_tokens ?? 0;
  const text = (j.content ?? []).map((c) => c.text ?? "").join("").trim();
  if (!text) throw new Error("candidate brain returned nothing: " + JSON.stringify(j).slice(0, 200));
  return text;
}

async function main() {
  const student = await createStudent();
  const pick = async (teil) => (await rest(`/rest/v1/muendlich_materials?teil=eq.${teil}&category=eq.themen&level=eq.TELC_B2&limit=1&select=id,title`))[0];
  const [m1, m2, m3] = [await pick(1), await pick(2), await pick(3)];
  log(`topics: ${m1.title} / ${m2.title} / ${m3.title}`);
  const [session] = await rest(`/rest/v1/voice_tutor_sessions`, { method: "POST", headers: { Prefer: "return=representation", Authorization: `Bearer ${student.jwt}`, apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ user_id: student.id, level: "TELC_B2", teil1_material_id: m1.id, teil2_material_id: m2.id, teil3_material_id: m3.id }) });
  const sessionId = session.id;
  log(`session ${sessionId}`);

  let stage = 0, finished = false, terminated = null, closed = false, presented = false, speaking = false, turns = 0;
  let playbackEndsAt = 0, lastTutorActivityAt = 0, candEndedAt = null;
  const tutorSince = [], transcript = [], latencies = [], timeline = [];
  let mic = null;

  async function cleanup() {
    await rest(`/rest/v1/voice_tutor_sessions?id=eq.${sessionId}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/voice_tutor_daily_usage?user_id=eq.${student.id}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/muendlich_elevenlabs_usage?user_id=eq.${student.id}`, { method: "DELETE" }).catch(() => {});
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${student.id}`, { method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }).catch(() => {});
  }

  const ws = new WebSocket(`${RELAY_URL}/tutor/${sessionId}?token=${encodeURIComponent(student.jwt)}`);
  ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    const now = Date.now();
    if (m.type === "audio") {
      const dur = Buffer.from(m.data, "base64").length / 48000; // 24 kHz PCM16 mono
      playbackEndsAt = Math.max(playbackEndsAt, now) + dur * 1000; lastTutorActivityAt = now;
      if (candEndedAt !== null) { latencies.push({ ms: now - candEndedAt, after: transcript[transcript.length - 1]?.text.slice(0, 50) }); candEndedAt = null; }
      return;
    }
    if (m.type === "pong" || m.type === "cap_status") return;
    if (m.type === "transcript" && (m.speaker === "examiner" || m.speaker === "partner")) { tutorSince.push({ who: m.speaker, text: m.text }); lastTutorActivityAt = now; return; }
    log(`<- ${JSON.stringify(m).slice(0, 160)}`);
    if (m.type === "ready") stage = 1;
    if (m.type === "stage") stage = m.stage;
    if (m.type === "session_complete") finished = true;
    if (m.type === "terminated") terminated = m.reason ?? "terminated";
  });
  ws.on("close", () => { closed = true; });
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  log("socket open — waiting for the tutor's opening");

  // 100 ms mic frames, silence while the candidate is not speaking
  const silent = Buffer.alloc(3200).toString("base64");
  const micTimer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    let data = silent;
    if (mic && mic.pos < mic.pcm.length) { data = mic.pcm.subarray(mic.pos, mic.pos + 3200).toString("base64"); mic.pos += 3200; if (mic.pos >= mic.pcm.length) mic = null; }
    ws.send(JSON.stringify({ type: "audio", data }));
  }, 100);

  async function speak(instruction, label) {
    speaking = true;
    try {
      const text = await brain(instruction, transcript);
      const pcm = await synth(text);
      while (Date.now() < playbackEndsAt + 300 && !finished) await sleep(150); // never talk over the tutor
      transcript.push({ who: NAME, text }); timeline.push({ t: Date.now() - t0, who: NAME, label, text });
      log(`${NAME} (${label}, ${(pcm.length / 32000).toFixed(0)}s): ${text.slice(0, 120)}${text.length > 120 ? "…" : ""}`);
      mic = { pcm, pos: 0 };
      while (mic && !finished) await sleep(150);
      candEndedAt = Date.now(); turns++;
    } finally { speaking = false; }
  }

  const deadline = Date.now() + 28 * 60_000;
  while (!finished && !terminated && !closed && Date.now() < deadline) {
    await sleep(400);
    if (speaking || stage === 0) continue;
    if (Date.now() < playbackEndsAt + 1500 || Date.now() < lastTutorActivityAt + 2500) continue; // tutor still talking / about to continue
    if (tutorSince.length === 0 && presented) continue;
    const heard = tutorSince.splice(0);
    for (const h of heard) { transcript.push({ who: h.who === "partner" ? "Partner" : "Prüferin", text: h.text }); timeline.push({ t: Date.now() - t0, who: h.who, text: h.text }); }
    if (heard.length) log(`${heard[0].who === "partner" ? "Partner" : "Prüferin"}: ${heard.map((h) => h.text).join(" ").replace(/\s+/g, " ").slice(0, 150)}`);
    try {
      if (stage === 1 && !presented) { presented = true; await speak(`Die Prüferin hat dich begrüßt. Halte jetzt deine Präsentation zum Thema „${m1.title}“. Sprich etwa 65 Sekunden lang (ca. 150 Wörter), in der Ich-Form, zusammenhängend, mit Beispielen aus deinem Leben.`, "Präsentation"); }
      else if (stage === 3) await speak(`Ihr plant gemeinsam: „${m3.title}“. Reagiere auf das, was dein Partner/deine Partnerin gerade gesagt hat, und mach einen konkreten Vorschlag. Sprich 1 bis 3 Sätze (etwa 10 Sekunden).`, "Planung");
      else await speak(`Die Prüferin hat gerade gesagt: „${heard.map((h) => h.text).join(" ")}“ (Thema ${stage === 2 ? m2.title : m1.title}). Antworte darauf in 2 bis 3 Sätzen (etwa 12 Sekunden).`, stage === 2 ? "Teil 2 Antwort" : "Teil 1 Antwort");
    } catch (e) { log(`candidate turn failed: ${e.message}`); await sleep(2000); }
  }
  clearInterval(micTimer);
  log(`${finished ? "SESSION COMPLETE" : terminated ? `TERMINATED (${terminated})` : closed ? "socket closed" : "TIMED OUT"} after ${((Date.now() - t0) / 60000).toFixed(1)} min, ${turns} candidate turns`);

  // ---- the MEASURED cost row ----
  let cost = null, nodes = [];
  for (let i = 0; i < 30 && !cost; i++) {
    await sleep(3000);
    try { [cost] = await rest(`/rest/v1/voice_tutor_costs?select=*&session_id=eq.${sessionId}`); nodes = await rest(`/rest/v1/voice_tutor_transcript_nodes?select=speaker,teil&session_id=eq.${sessionId}&limit=500`); } catch (e) { log(`waiting for the cost row: ${e.message.slice(0, 80)}`); }
  }
  const sorted = latencies.map((l) => l.ms).sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  console.log("\n=== LATENCY (end of candidate speech -> first tutor audio) ===");
  for (const l of latencies) console.log(`  ${sFor(l.ms).padStart(5)} s   after: ${l.after}…`);
  if (sorted.length) console.log(`  n=${sorted.length}  median ${sFor(q(0.5))} s | p90 ${sFor(q(0.9))} s | max ${sFor(sorted[sorted.length - 1])} s`);
  console.log("\n=== MEASURED COST ROW (voice_tutor_costs) ===\n" + JSON.stringify(cost, null, 1));
  console.log("\ntranscript nodes by speaker:", JSON.stringify(nodes.reduce((a, n) => { a[n.speaker] = (a[n.speaker] ?? 0) + 1; return a; }, {})), "| by Teil:", JSON.stringify(nodes.reduce((a, n) => { a[n.teil] = (a[n.teil] ?? 0) + 1; return a; }, {})));
  console.log(`\n(harness only, NOT product cost) candidate TTS: ElevenLabs ${candTts.elevenlabsChars} chars, DeepInfra ${candTts.deepinfraChars} chars${candTts.elevenlabsFailed ? ` [ElevenLabs failed: ${candTts.elevenlabsFailed}]` : ""}; candidate Claude Haiku: ${candBrain.inputTokens} in / ${candBrain.outputTokens} out tokens`);

  mkdirSync(new URL("../../voice-auditions/", import.meta.url), { recursive: true });
  const out = new URL(`../../voice-auditions/tutor-real-run-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`, import.meta.url);
  writeFileSync(out, JSON.stringify({ sessionId, minutes: (Date.now() - t0) / 60000, finished, terminated, turns, latencies, cost, timeline, candidateHarness: { candTts, candBrain } }, null, 1));
  console.log("report:", out.pathname);
  if (process.env.SKIP_CLEANUP) console.log(`SKIP_CLEANUP set — session ${sessionId} / student ${student.id} left in place.`);
  else { ws.close(); await sleep(500); await cleanup(); log("cleanup done"); }
  process.exit(0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
