import { createClient } from "@supabase/supabase-js";
import { VoiceManager } from "./voiceManager.ts";
import { createSupabaseVoiceStore } from "./supabaseVoiceStore.ts";
import { getPool, EXAMINER_POOL } from "./voicePools.ts";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const manager = new VoiceManager(getPool(EXAMINER_POOL), createSupabaseVoiceStore(admin));

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const testSessionIds = Array.from({ length: 30 }, (_, i) => `live-test-session-${Date.now()}-${i}`);

  // 1. Stability within a session — real DB round trip, called 3x per session
  const firstSession = testSessionIds[0];
  const a1 = await manager.assignVoice(firstSession, EXAMINER_POOL);
  const a2 = await manager.assignVoice(firstSession, EXAMINER_POOL);
  const a3 = await manager.assignVoice(firstSession, EXAMINER_POOL);
  ok("same session, called 3x against REAL DB -> identical voice every time (stability)", a1.voiceId === a2.voiceId && a2.voiceId === a3.voiceId);

  // 2. Persistence after "reconnect" — simulate by creating a FRESH VoiceManager
  // instance (fresh in-memory state, same real DB) and re-querying the same session.
  const freshManager = new VoiceManager(getPool(EXAMINER_POOL), createSupabaseVoiceStore(admin));
  const afterReconnect = await freshManager.assignVoice(firstSession, EXAMINER_POOL);
  ok("fresh VoiceManager instance (simulated reconnect), same session -> same voice from REAL persisted DB row", afterReconnect.voiceId === a1.voiceId);

  // 3. Diversity across sessions — real DB round trips for 30 distinct sessions
  const assigned = new Set();
  for (const sid of testSessionIds) {
    const v = await manager.assignVoice(sid, EXAMINER_POOL);
    assigned.add(v.voiceId);
  }
  console.log(`  30 real sessions -> ${assigned.size} distinct voices used`);
  ok("30 distinct real sessions spread across multiple voices (diversity)", assigned.size >= 10);

  // 4. Real usage-count read reflects what was just written
  const { data: rows } = await admin.from("muendlich_voice_assignments").select("voice_id").in("session_key", testSessionIds);
  ok(`all 30 real assignments actually persisted as rows (found ${rows?.length ?? 0}/30)`, rows?.length === 30);

  // Cleanup test rows so this doesn't pollute real usage-count load-balancing data
  await admin.from("muendlich_voice_assignments").delete().in("session_key", testSessionIds);
  console.log("  (cleaned up 30 test rows)");

  console.log("\nAll live voice-assignment tests (real Supabase DB) completed.");
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
