/** Live test of the credit-budget hard-cap system against the REAL Supabase
 * database (now that the migration is applied). Uses a synthetic test user
 * id and cleans up its own rows afterward. */
import { createClient } from "@supabase/supabase-js";
import { checkCreditBudget, recordExamUsage } from "./creditBudget.js";
import { USER_CREDIT_ALLOWANCE, computeExamCost } from "./costAccounting.js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// muendlich_elevenlabs_usage.user_id has a real FK to auth.users — a
// synthetic id would fail that constraint, so this borrows one real
// existing user id, writes only to the NEW usage-ledger table (never
// touches profiles/auth/the real minutes-based credit system), and cleans
// up every row this test itself created before exiting.
const TEST_USER = process.env.LIVE_TEST_USER_ID ?? "fafb8ffd-8867-4a58-9be0-3fcd5682c4da";

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

async function cleanup() {
  await admin.from("muendlich_elevenlabs_usage").delete().eq("user_id", TEST_USER);
}

async function main() {
  await cleanup();

  // 1. Fresh user has full budget
  const initial = await checkCreditBudget(admin, TEST_USER);
  ok(`fresh user has full ${USER_CREDIT_ALLOWANCE} credits available`, initial.allowed && initial.creditsRemaining === USER_CREDIT_ALLOWANCE);

  // 2. Record one realistic exam's usage (using the REAL measured average from simulateFullExam.mjs).
  // recordExamUsage() takes the WHOLE ROOM's usage and stores each
  // participant's 50% SHARE — see creditBudget.ts's header for why (a real
  // bug caught from the explicit "never charge the full exam cost to both
  // participants" product requirement, fixed before this test was written).
  // This test's own asserted expectation must therefore be HALF of
  // computeExamCost()'s full-exam total, not the full total itself.
  const PARTICIPANTS_PER_EXAM = 2;
  const realisticUsage = { ttsCharacters: 2224, sttMinutes: 9 };
  const fullCost = computeExamCost(realisticUsage);
  const perParticipantCost = fullCost.totalCredits / PARTICIPANTS_PER_EXAM;
  await recordExamUsage(admin, TEST_USER, "live-test-exam-session-1", realisticUsage);
  const afterOne = await checkCreditBudget(admin, TEST_USER);
  ok(`after 1 real-sized (shared) exam, this participant is charged their 50% share (${afterOne.creditsUsed.toFixed(1)} ≈ ${perParticipantCost.toFixed(1)}, full exam cost was ${fullCost.totalCredits.toFixed(1)})`, Math.abs(afterOne.creditsUsed - perParticipantCost) < 0.01);
  ok("still allowed after 1 exam (nowhere near the cap)", afterOne.allowed);

  // 3. Simulate exhausting the allowance: record enough exams to exceed 60,000 credits
  const examsToExhaust = Math.ceil(USER_CREDIT_ALLOWANCE / perParticipantCost) + 1;
  for (let i = 2; i <= examsToExhaust; i++) {
    await recordExamUsage(admin, TEST_USER, `live-test-exam-session-${i}`, realisticUsage);
  }
  const afterMany = await checkCreditBudget(admin, TEST_USER);
  ok(`after ${examsToExhaust} exams, budget is now exhausted (allowed=false)`, !afterMany.allowed);
  ok("creditsRemaining floors at 0, never negative", afterMany.creditsRemaining === 0);
  console.log(`  used ${afterMany.creditsUsed.toFixed(0)} credits across ${examsToExhaust} recorded exams`);

  await cleanup();
  console.log("\nAll live credit-budget tests (real Supabase DB) completed.");
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
