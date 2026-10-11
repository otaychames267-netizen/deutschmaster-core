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
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
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
// PARTNER_QWEN=1 (owner 2026-10-11): candidate B is NOT a second human but the AI partner — same Claude Haiku brain, but spoken by DeepInfra Qwen3-TTS
// (a cloned "partner" voice, 20 USD per 1M chars). Candidate A stays the ElevenLabs-simulated human. Per-candidate usage is counted so the partner's own
// cost can be reported (Qwen characters + Haiku tokens); the relay's cost row still holds the whole room.
const PARTNER_QWEN = process.env.PARTNER_QWEN === "1";
const PARTNER_QWEN_VOICE = process.env.PARTNER_QWEN_VOICE ?? "spgick8i0cclmwonohad"; // Lukas (Qwen), male partner voice
// HUMAN_QWEN=1: speak the simulated HUMAN (candidate A) with a Qwen voice too — only for when the ElevenLabs credits are used up (harness cost, not product cost).
const HUMAN_QWEN = process.env.HUMAN_QWEN === "1";
const QWEN_VOICES = { A: process.env.HUMAN_QWEN_VOICE ?? "s3qzkzydhp8y3i98htdu", B: PARTNER_QWEN_VOICE }; // A: Sophie (Qwen), female
const PARTNER_SECONDS = Number(process.env.PARTNER_SECONDS ?? 0); // >0: the AI partner answers briefly (like the 1:1 partner), about this many seconds per turn
const used = { A: { chars: 0, inTok: 0, outTok: 0, backend: HUMAN_QWEN ? "qwen" : "elevenlabs" }, B: { chars: 0, inTok: 0, outTok: 0, backend: PARTNER_QWEN ? "qwen" : "elevenlabs" } };
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

/** DeepInfra Qwen3-TTS (PCM16 @24 kHz) resampled to the 16 kHz the microphone path carries. */
async function synthQwen(text, voice) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://api.deepinfra.com/v1/openai/audio/speech", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "Qwen/Qwen3-TTS", voice, input: text, response_format: "pcm" }),
    });
    if (res.ok) {
      const src = Buffer.from(await res.arrayBuffer()), n = src.length >> 1, outN = Math.floor(n / 1.5), out = Buffer.alloc(outN * 2);
      for (let i = 0; i < outN; i++) { const p = i * 1.5, a = Math.floor(p), fr = p - a, s0 = src.readInt16LE(a * 2), s1 = a + 1 < n ? src.readInt16LE((a + 1) * 2) : s0; out.writeInt16LE(Math.round(s0 + (s1 - s0) * fr), i * 2); }
      return out;
    }
    await sleep(1500 * (attempt + 1));
  }
  throw new Error("partner (Qwen) TTS failed");
}

async function synth(text, voiceId, who) {
  if (who) used[who].chars += text.length;
  if (who && used[who].backend === "qwen") return synthQwen(text, QWEN_VOICES[who]);
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
  if (j.usage) { used[who].inTok += j.usage.input_tokens ?? 0; used[who].outTok += j.usage.output_tokens ?? 0; }
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

  // full-conversation recording (examiner 24 kHz as the browser would play it + both candidates 16 kHz) on one wall-clock timeline
  const examinerChunks = [], candChunks = [];
  const attach = (ws, label) => ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (label !== "A") return;
    if (m.type === "audio") { const pcm = Buffer.from(m.data, "base64"); const dur = pcm.length / 48000; examinerChunks.push({ at: Math.max(playbackEndsAt, Date.now()) - t0, pcm }); playbackEndsAt = Math.max(playbackEndsAt, Date.now()) + dur * 1000; return; }
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
      if (m && m.pos < m.pcm.length) { const frame = m.pcm.subarray(m.pos, m.pos + 3200); candChunks.push({ at: Date.now() - t0, pcm: Buffer.from(frame) }); data = frame.toString("base64"); m.pos += 3200; if (m.pos >= m.pcm.length) mic[who] = null; }
      ws.send(JSON.stringify({ type: "audio", data }));
    }
  }, 100);

  async function prepareTurn(who, instruction) {
    const text = await brain(who, instruction, transcript);
    const pcm = await synth(text, VOICES[who], who);
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
  // The AI partner keeps its turns short, like a real second candidate who does not monopolise the floor (and like the 1:1 partner, which is capped).
  const instructionFor = (who) => (PARTNER_QWEN && who === "B" && PARTNER_SECONDS > 0 ? convInstruction().replace("2 bis 3 Sätze (etwa 12 Sekunden)", `1 bis 2 Sätze (etwa ${PARTNER_SECONDS} Sekunden)`) : convInstruction());

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
        prefetched = prepareTurn(other, instructionFor(other)).catch(() => null);
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
    return speakTurn(who, instructionFor(who), label, prep ?? undefined);
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
      nodes = await rest(`/rest/v1/muendlich_transcript_nodes?select=speaker,teil,text,started_at&session_id=eq.${session.id}&order=started_at.asc&limit=1000`);
      if (cost && evals.length >= 2) break;
    } catch (e) { log(`waiting for results: ${e.message.slice(0, 80)}`); }
  }
  console.log("\n=== RESULT ===");
  console.log("end_reason:", session?.end_reason);
  console.log("transcript nodes by speaker:", JSON.stringify(nodes.reduce((a, n) => { a[n.speaker] = (a[n.speaker] ?? 0) + 1; return a; }, {})), " by Teil:", JSON.stringify(nodes.reduce((a, n) => { a[n.teil] = (a[n.teil] ?? 0) + 1; return a; }, {})));
  console.log("evaluations:", JSON.stringify(evals));
  console.log("MEASURED COST ROW:", JSON.stringify(cost, null, 1));
  // Per-candidate harness usage. For the partner (B, Qwen) this IS a product cost: Qwen characters + the Claude Haiku call that writes its words.
  // (Its STT and its evaluation exist only because the harness feeds a microphone; a product partner has its text directly and is not evaluated.)
  const usd = (u) => (u.backend === "qwen" ? u.chars * 20 / 1e6 : u.chars * 50 / 1e6) + u.inTok * 1 / 1e6 + u.outTok * 5 / 1e6;
  const partner = { chars: used.B.chars, haiku_in: used.B.inTok, haiku_out: used.B.outTok, usd_tts: +(used.B.chars * (PARTNER_QWEN ? 20 : 50) / 1e6).toFixed(5), usd_haiku: +((used.B.inTok + used.B.outTok * 5) / 1e6).toFixed(5), usd_total: +usd(used.B).toFixed(5) };
  console.log(`
=== PARTNER (candidate B, ${PARTNER_QWEN ? "AI via Qwen3-TTS" : "ElevenLabs"}; human A via ${used.A.backend}) === ${JSON.stringify(partner)}`);
  console.log(`(harness only, NOT product cost) human candidate A: ${used.A.backend} ${used.A.chars} chars, Haiku ${used.A.inTok} in / ${used.A.outTok} out`);
  if (cost) {
    const adjusted = Number(cost.usd_total) - Number(cost.usd_stt) / 2 - Number(cost.usd_evaluator) / 2 + partner.usd_total;
    console.log(`WHOLE ROOM with an AI partner ≈ ${adjusted.toFixed(4)} = measured room row ${Number(cost.usd_total).toFixed(4)} − partner's share of STT & evaluation (${(Number(cost.usd_stt) / 2 + Number(cost.usd_evaluator) / 2).toFixed(4)}) + partner TTS+brain ${partner.usd_total.toFixed(4)}`);
  }

  // ---- did the examiner talk over / cut off a candidate? (owner 2026-10-11) ----
  // Spans on one wall-clock timeline: examiner = what the browser would PLAY, candidates = what their mics SENT. An "interruption" is an examiner
  // utterance that starts while a candidate is still mid-sentence (still >= 1.5 s of that sentence to come), i.e. the examiner cut the candidate off.
  const toSpans = (chunks, durMs, gapMs) => { const sp = []; for (const c of chunks) { const end = c.at + durMs(c); const last = sp[sp.length - 1]; if (last && c.at - last.end <= gapMs) last.end = Math.max(last.end, end); else sp.push({ start: c.at, end }); } return sp; };
  const examSpans = toSpans(examinerChunks, (c) => c.pcm.length / 48, 700);
  const candSpans = toSpans(candChunks, (c) => c.pcm.length / 32, 500);
  const interruptions = [];
  for (const e of examSpans) for (const c of candSpans) if (e.start > c.start + 300 && e.start < c.end - 1500) interruptions.push({ at_s: +(e.start / 1000).toFixed(1), candidate_still_to_say_s: +((c.end - e.start) / 1000).toFixed(1), candidate_spoke_for_s: +((e.start - c.start) / 1000).toFixed(1) });
  const overlapMs = examSpans.reduce((a, e) => a + candSpans.reduce((b, c) => b + Math.max(0, Math.min(e.end, c.end) - Math.max(e.start, c.start)), 0), 0);
  console.log(`
=== OVERLAP ANALYSIS === examiner utterances: ${examSpans.length} | candidate turns: ${candSpans.length} | examiner started INSIDE a candidate sentence (cut-offs): ${interruptions.length} | total simultaneous speech: ${(overlapMs / 1000).toFixed(1)} s`);
  for (const i of interruptions) console.log(`  CUT-OFF at ${i.at_s}s: candidate had spoken ${i.candidate_spoke_for_s}s and still had ${i.candidate_still_to_say_s}s to say`);

  // ---- recording + report ----
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const outDir = fileURLToPath(new URL("../../voice-auditions/", import.meta.url));
  mkdirSync(outDir, { recursive: true });
  {
    const SR = 24000, endMs = Math.max(...examinerChunks.map((c) => c.at + c.pcm.length / 48), ...candChunks.map((c) => c.at + c.pcm.length / 32), 1000);
    const mix = new Int32Array(Math.ceil(((endMs + 1500) / 1000) * SR));
    for (const c of examinerChunks) { const o = Math.round((c.at / 1000) * SR); for (let i = 0; i < c.pcm.length / 2; i++) if (o + i < mix.length) mix[o + i] += c.pcm.readInt16LE(i * 2); }
    for (const c of candChunks) { const o = Math.round((c.at / 1000) * SR), n = c.pcm.length / 2; for (let i = 0; i < n * 1.5; i++) { const p = i / 1.5, a = Math.floor(p), fr = p - a; const s0 = c.pcm.readInt16LE(a * 2), s1 = a + 1 < n ? c.pcm.readInt16LE((a + 1) * 2) : s0; if (o + i < mix.length) mix[o + i] += Math.round(s0 + (s1 - s0) * fr); } }
    const pcm = Buffer.alloc(mix.length * 2); for (let i = 0; i < mix.length; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, mix[i])), i * 2);
    const hdr = Buffer.alloc(44); hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVEfmt ", 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
    const wavPath = outDir + `room-real-run-${stamp}.wav`;
    writeFileSync(wavPath, Buffer.concat([hdr, pcm]));
    const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "64k", wavPath.slice(0, -4) + ".mp3"]);
    console.log(`full-conversation recording: ${(mix.length / SR / 60).toFixed(1)} min -> ${wavPath}${ff.status === 0 ? " (+ mp3)" : " (mp3 conversion unavailable here)"}`);
  }
  writeFileSync(outDir + `room-real-run-${stamp}.json`, JSON.stringify({ minutes: (Date.now() - t0) / 60000, finished, terminated, turns, interruptions, overlap_seconds: overlapMs / 1000, partner_usage: used, session, cost, evals, nodes, transcript }, null, 1));
  console.log("report:", outDir + `room-real-run-${stamp}.json`);

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
