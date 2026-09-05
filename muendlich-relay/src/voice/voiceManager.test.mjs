import { selectVoiceId } from "./voiceManager.ts";

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

const pool = Array.from({ length: 27 }, (_, i) => ({ voiceId: `voice_${i}`, enabled: true }));

// 1. Determinism
const a1 = selectVoiceId("session-abc-123", pool, {});
const a2 = selectVoiceId("session-abc-123", pool, {});
ok("same sessionKey -> same voice (determinism)", a1 === a2);

// 2. Different sessions distribute across the pool, not all landing on one voice
const assignments = new Set();
for (let i = 0; i < 200; i++) {
  assignments.add(selectVoiceId(`session-${i}-${Math.random()}`, pool, {}));
}
ok(`200 distinct sessions spread across >= 15 of 27 voices (got ${assignments.size})`, assignments.size >= 15);

// 3. Load balancing: force one voice to look badly overused, confirm a
// session that WOULD deterministically hash to it gets redirected instead.
const usageCounts = {};
for (const v of pool) usageCounts[v.voiceId] = 0;
// Find which session key deterministically hashes to voice_0, then simulate
// voice_0 being wildly overused relative to everyone else.
let targetSession = null;
for (let i = 0; i < 1000; i++) {
  const key = `probe-${i}`;
  if (selectVoiceId(key, pool, {}) === "voice_0") { targetSession = key; break; }
}
ok("found a session key that deterministically hashes to voice_0", targetSession !== null);
usageCounts["voice_0"] = 50; // everyone else stays at 0 -> way outside LOAD_IMBALANCE_THRESHOLD
const balanced = selectVoiceId(targetSession, pool, usageCounts);
ok(`overused voice_0 gets skipped in favor of a less-used voice (got ${balanced})`, balanced !== "voice_0");

// 4. Disabled/unavailable voices are never selected (pool passed in should
// already be pre-filtered by the caller — VoiceManager.availablePool()
// does this; selectVoiceId itself just needs to only ever return something
// present in the array it was given).
const smallPool = [{ voiceId: "only_one", enabled: true }];
for (let i = 0; i < 20; i++) {
  const picked = selectVoiceId(`k-${i}`, smallPool, {});
  if (picked !== "only_one") { ok("single-voice pool always returns that voice", false); process.exit(1); }
}
ok("single-voice pool always returns that voice", true);

console.log("\nAll voice-selection logic tests completed.");
