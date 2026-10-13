/** Live test: does recordExamUsage double-charge if called twice with the
 * SAME running-total usage for the SAME session_key (exactly what happens
 * in production — server.ts's periodic credit tick calls it repeatedly
 * during one exam with the latest cumulative usage, not a delta)? */
import { createClient } from "@supabase/supabase-js";
import { recordExamUsage, checkCreditBudget } from "./creditBudget.ts";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TEST_USER = process.env.LIVE_TEST_USER_ID ?? "fafb8ffd-8867-4a58-9be0-3fcd5682c4da";

function ok(name, cond) { console.log(`${cond ? "PASS" : "FAIL"} — ${name}`); if (!cond) process.exitCode = 1; }

async function main() {
  const sessionKey = "idempotency-test-" + Date.now();
  await admin.from("muendlich_elevenlabs_usage").delete().eq("user_id", TEST_USER).eq("session_key", sessionKey);

  const usage = { ttsCharacters: 2000, sttMinutes: 10 };
  await recordExamUsage(admin, TEST_USER, sessionKey, usage);
  const after1 = (await checkCreditBudget(admin, TEST_USER)).creditsUsed;
  await recordExamUsage(admin, TEST_USER, sessionKey, usage);
  const after2 = (await checkCreditBudget(admin, TEST_USER)).creditsUsed;
  await recordExamUsage(admin, TEST_USER, sessionKey, usage);
  const after3 = (await checkCreditBudget(admin, TEST_USER)).creditsUsed;

  console.log(`  credits after call 1/2/3 (same usage each time): ${after1} / ${after2} / ${after3}`);
  ok("repeated recordExamUsage calls with the SAME usage do not double-charge (idempotent upsert)", after1 === after2 && after2 === after3);

  // Now confirm a GENUINE increase (different session_key = a second real exam) DOES add on top, so idempotency isn't hiding a "never updates" bug.
  const sessionKey2 = "idempotency-test-2-" + Date.now();
  await recordExamUsage(admin, TEST_USER, sessionKey2, usage);
  const after4 = (await checkCreditBudget(admin, TEST_USER)).creditsUsed;
  ok("a genuinely NEW session's usage still adds on top (not silently no-op'd)", after4 > after3);

  await admin.from("muendlich_elevenlabs_usage").delete().eq("user_id", TEST_USER).in("session_key", [sessionKey, sessionKey2]);
  console.log("\nCredit idempotency live test completed.");
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
