/** Live end-to-end test of the new AI Voice Tutor WebSocket path (/tutor/:scenarioId)
 * against the REAL running relay process and REAL Supabase + Gemini Live.
 * Requires the relay to already be running locally (npm run dev) before this
 * script is invoked. Creates a disposable test user + a fresh sample of
 * synthetic audio, exercises the ready/cap_status/audio/transcript protocol,
 * then cleans up the test user and its rows. */
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

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

function silentPcm16Frame(samples = 1600) {
  // 1600 samples @ 16kHz = 100ms of digital silence — enough to exercise the
  // audio-in path without needing a real microphone or speech content.
  const buf = Buffer.alloc(samples * 2, 0);
  return buf.toString("base64");
}

async function main() {
  // --- Set up a disposable test user with a real JWT ---
  const email = `voicetutor-livetest-${Date.now()}@auralingovia-test.local`;
  const password = "TestVoiceTutorLive2026!";
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = await createRes.json();
  if (!createRes.ok) { console.error("create user failed", user); process.exit(1); }
  console.log("test user:", user.id);

  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { access_token: jwt } = await loginRes.json();
  if (!jwt) { console.error("login failed"); process.exit(1); }

  // set profile level to B2 so the tutor treats this as a B2 session
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ level: "TELC_B2" }),
  });

  // --- Fetch a real seeded scenario id ---
  const scenarioRes = await fetch(`${SUPABASE_URL}/rest/v1/voice_tutor_scenarios?level=eq.TELC_B2&select=id,slug&order=sort_order&limit=1`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const [scenario] = await scenarioRes.json();
  if (!scenario) { console.error("no seeded scenario found"); process.exit(1); }
  console.log("using scenario:", scenario.slug, scenario.id);

  async function cleanup() {
    await fetch(`${SUPABASE_URL}/rest/v1/voice_tutor_daily_usage?user_id=eq.${user.id}`, {
      method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    await fetch(`${SUPABASE_URL}/rest/v1/voice_tutor_sessions?user_id=eq.${user.id}`, {
      method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    console.log("cleanup: deleted test user, status", del.status);
  }

  // --- Test 1: happy path — connect, stream audio, expect ready/cap_status/audio/transcript ---
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${RELAY_URL}/tutor/${scenario.id}?token=${encodeURIComponent(jwt)}`);
    let gotReady = false, gotCapStatus = false, gotAudio = false, gotTranscript = false;
    let audioInterval;
    const timeout = setTimeout(() => {
      ok("received ready", gotReady);
      ok("received cap_status with a numeric secondsRemaining", gotCapStatus);
      ok("received at least one audio chunk back from Gemini", gotAudio);
      ok("received at least one transcript line", gotTranscript);
      clearInterval(audioInterval);
      ws.close();
      resolve();
    }, 15_000);

    ws.on("open", () => {
      console.log("ws open, streaming synthetic audio...");
      audioInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "audio", data: silentPcm16Frame() }));
      }, 100);
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "ready") gotReady = true;
      if (msg.type === "cap_status" && typeof msg.secondsRemaining === "number") gotCapStatus = true;
      if (msg.type === "audio") gotAudio = true;
      if (msg.type === "transcript") gotTranscript = true;
    });
    ws.on("error", (e) => { clearTimeout(timeout); clearInterval(audioInterval); reject(e); });
  });

  // --- Test 2: pre-seed near the daily cap, confirm the socket is refused BEFORE any Gemini session opens ---
  await fetch(`${SUPABASE_URL}/rest/v1/voice_tutor_daily_usage`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ user_id: user.id, usage_date: new Date().toISOString().slice(0, 10), level: "TELC_B2", seconds_used: 2700 }),
  });
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${RELAY_URL}/tutor/${scenario.id}?token=${encodeURIComponent(jwt)}`);
    let gotTerminated = false, gotAnyAudio = false, asserted = false;
    // The server closes the socket immediately after sending `terminated`
    // (well before any timeout), so assertions must run from WHICHEVER of
    // "close" or the fallback timeout fires first — not only from the
    // timeout branch, which a fast server-initiated close would otherwise
    // never let it reach (a real bug in this test caught by actually
    // running it: the first version silently passed with zero assertions
    // executed whenever the server responded quickly).
    const assertOnce = () => {
      if (asserted) return;
      asserted = true;
      clearTimeout(timeout);
      ok("capped-out user is refused via terminated message", gotTerminated);
      ok("capped-out user never gets audio back (no Gemini session opened)", !gotAnyAudio);
      resolve();
    };
    const timeout = setTimeout(assertOnce, 5_000);
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "terminated" && msg.reason === "daily_cap_exceeded") gotTerminated = true;
      if (msg.type === "audio") gotAnyAudio = true;
    });
    ws.on("close", assertOnce);
    ws.on("error", (e) => { clearTimeout(timeout); reject(e); });
  });

  await cleanup();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
