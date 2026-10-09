// Blind-test helper: the same German tutor lines through the cheaper TTS candidates, one MP3 per voice + first-byte latency.
//   npx tsx src/ttsProviderCompare.mjs [outDir]          (keys from the environment or muendlich-relay/.env; a provider without a key is skipped)
//   AZURE_SPEECH_KEY + AZURE_SPEECH_REGION   Azure AI Speech (Neural)         — F0 free tier = 0.5M characters / month
//   OPENAI_API_KEY                           OpenAI gpt-4o-mini-tts           — needs account credit
//   INWORLD_API_KEY                          Inworld TTS (Basic auth key from the portal) — endpoint/fields NOT verified against current docs
// List prices (per 1M characters, third-party figures, verify): Azure Neural ~15-16, OpenAI ~16, Inworld 5-10 — ElevenLabs v4 Turbo is 40.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const envFile = new URL("../.env", import.meta.url);
if (existsSync(envFile)) for (const l of readFileSync(envFile, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }

const OUT = process.argv[2] ?? "voice-auditions/providers"; mkdirSync(OUT, { recursive: true });
const LINES = [
  "Amira, welche Nachteile könnte es haben, wenn Kinder zu früh ein Smartphone bekommen?",
  "Damit ist Teil zwei abgeschlossen. Als letzten Teil planen Sie bitte gemeinsam: ein Wochenende in den Bergen.",
  "Ich finde, wir sollten zuerst das Budget klären. Was meinen Sie: Wollen wir lieber im Park oder im Restaurant feiern?",
];
const STYLE = "Sprich wie eine professionelle, ruhige Prüferin einer mündlichen Sprachprüfung: klares Hochdeutsch, mittleres Tempo, freundlich-sachlich.";
const results = [];

/** POST, read the body as a stream, report time to the first byte and the whole body. */
async function timedPost(url, init) {
  const t0 = Date.now(); const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const reader = res.body.getReader(); const parts = []; let first = null;
  for (;;) { const { done, value } = await reader.read(); if (done) break; if (first === null) first = Date.now() - t0; parts.push(Buffer.from(value)); }
  return { buf: Buffer.concat(parts), first: first ?? Date.now() - t0 };
}

async function run(provider, voice, synth) {
  try {
    const bufs = []; const firsts = [];
    for (const text of LINES) { const r = await synth(text); bufs.push(r.buf); firsts.push(r.first); }
    const file = `${OUT}/${provider}_${voice.replace(/[^A-Za-z0-9-]/g, "")}.mp3`;
    writeFileSync(file, Buffer.concat(bufs));
    results.push({ provider, voice, firstMs: Math.round(firsts.reduce((a, b) => a + b, 0) / firsts.length), file });
    console.log(`ok   ${provider} ${voice}  first byte ~${results.at(-1).firstMs} ms`);
  } catch (e) { console.log(`FAIL ${provider} ${voice}: ${String(e.message ?? e).slice(0, 220)}`); }
}

// --- Azure AI Speech (REST, SSML) ---
if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
  for (const v of ["de-DE-KatjaNeural", "de-DE-ConradNeural", "de-DE-SeraphinaMultilingualNeural", "de-DE-FlorianMultilingualNeural", "de-DE-AmalaNeural", "de-DE-KillianNeural"]) {
    await run("azure", v, (text) => timedPost(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3", "User-Agent": "aura-tts-compare" },
      body: `<speak version="1.0" xml:lang="de-DE" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${v}">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</voice></speak>`,
    }));
  }
} else console.log("skip azure (set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION)");

// --- OpenAI gpt-4o-mini-tts ---
if (process.env.OPENAI_API_KEY) {
  for (const v of ["marin", "cedar", "coral", "sage", "onyx", "ash"]) { // marin + cedar = the voices OpenAI recommends for best quality
    await run("openai", v, (text) => timedPost("https://api.openai.com/v1/audio/speech", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: v, input: text, instructions: STYLE, response_format: "mp3" }),
    }));
  }
} else console.log("skip openai (set OPENAI_API_KEY)");

// --- Inworld (best effort: the docs are behind a login, so the endpoint/fields may need a small adjustment) ---
if (process.env.INWORLD_API_KEY) {
  const auth = { Authorization: `Basic ${process.env.INWORLD_API_KEY}`, "content-type": "application/json" };
  let voiceIds = process.env.INWORLD_VOICE_ID ? [process.env.INWORLD_VOICE_ID] : [];
  if (voiceIds.length === 0) {
    try {
      const j = await (await fetch("https://api.inworld.ai/tts/v1/voices", { headers: auth })).json();
      const de = (j.voices ?? []).filter((v) => JSON.stringify(v.languages ?? v.language ?? "").toLowerCase().includes("de"));
      console.log(`inworld: ${(j.voices ?? []).length} voices, ${de.length} German`); voiceIds = de.slice(0, Number(process.env.INWORLD_MAX_VOICES ?? 4)).map((v) => v.voiceId ?? v.name);
    } catch (e) { console.log("inworld voice list failed:", String(e.message).slice(0, 160)); }
  }
  for (const v of voiceIds) {
    await run("inworld", v, async (text) => {
      const t0 = Date.now(); const res = await fetch("https://api.inworld.ai/tts/v1/voice", { method: "POST", headers: auth, body: JSON.stringify({ text, voiceId: v, modelId: "inworld-tts-1.5-max", audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 } }) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
      const j = await res.json(); return { buf: Buffer.from(j.audioContent, "base64"), first: Date.now() - t0 };
    });
  }
} else console.log("skip inworld (set INWORLD_API_KEY)");

if (results.length) console.log(`\n${results.length} files in ${OUT}/ — listen blind, then tell me the winners.`);
