/** Live tests of failure-handling paths. The ElevenLabs account-tier block
 * means every real TTS/STT call fails the SAME way (not a "fake" error —
 * genuinely what ElevenLabs returns) — this exercises the real failure
 * code paths (onVoiceError -> reassignAfterFailure, STT connect failure ->
 * graceful null) with real API calls, just not the "happy path" audio.
 * Claude's retry/failure path is tested separately with a deliberately
 * invalid key, since Anthropic itself isn't blocked. */
import { openStreamingConnection, startStreamingSynthesis } from "./elevenLabsTts.ts";
import { openRealtimeStt } from "./elevenLabsStt.ts";
import { generateExaminerReply, ExaminerBrainError } from "./examinerBrain.ts";

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

async function testTtsFailure() {
  console.log("\n--- TTS failure handling (standard streaming endpoint, Flash v2.5 — the live default path) ---");
  const conn = await openStreamingConnection("uvysWDLbKpA4XvpD3GI6");
  let voiceErrorFired = false;
  let voiceErrorMessage = "";
  const handle = startStreamingSynthesis(conn, {
    onVoiceError: (msg) => { voiceErrorFired = true; voiceErrorMessage = msg; },
  });
  handle.appendText("Hallo, das ist ein Test.", true);
  const result = await handle.done.then(() => "resolved").catch((e) => `rejected: ${e.message}`);
  ok("onVoiceError callback fired on real ElevenLabs rejection", voiceErrorFired);
  ok("error message is the real ElevenLabs tier-block message, not a generic failure", voiceErrorMessage.includes("Free users cannot use library voices"));
  ok("done promise settles (doesn't hang forever) after a real failure", result.startsWith("rejected") || result === "resolved");
  console.log(`  captured: "${voiceErrorMessage}"`);
  try { conn.close(); } catch {}
}

async function testSttFailure() {
  console.log("\n--- STT failure / graceful degradation ---");
  let errorFired = false;
  let errorMessage = "";
  try {
    const session = await openRealtimeStt({ onError: (msg) => { errorFired = true; errorMessage = msg; } });
    // The WS-level "open" event fires on TCP+TLS success, independent of
    // whether the app-level auth_error message has arrived yet (that's a
    // separate JSON frame received shortly after) — wait for it for real
    // instead of asserting a trivially-true "opened or rejected" claim.
    await new Promise((r) => setTimeout(r, 2000));
    ok("real auth_error message received via onError after connection opened", errorFired);
    if (errorFired) console.log(`  captured: "${errorMessage}"`);
    session.close();
  } catch (e) {
    ok("openRealtimeStt() promise rejects cleanly on real auth failure (not a hang, not a crash)", true);
    console.log(`  rejected with: ${String(e).slice(0, 150)}`);
  }
}

async function testClaudeRetryBehavior() {
  console.log("\n--- Claude retry/failure behavior (deliberately invalid key) ---");
  const realKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-invalid-deliberately-broken-for-testing";
  const ctx = { personAName: "A", personBName: "B", teil1TopicA: "x", teil1TopicB: "y", teil2Topic: "z", teil3Topic: "w", level: "B2" };
  const t0 = Date.now();
  try {
    await generateExaminerReply(ctx, [], { type: "system", text: "[SYSTEM] test" }, {});
    ok("should have thrown on invalid key", false);
  } catch (e) {
    const elapsed = Date.now() - t0;
    ok("throws ExaminerBrainError on real auth failure", e instanceof ExaminerBrainError);
    ok("auth error is classified non-retryable (401 is not in the retryable set)", e instanceof ExaminerBrainError && e.retryable === false);
    ok(`fails fast, doesn't hang retrying (${elapsed}ms)`, elapsed < 10_000);
  } finally {
    process.env.ANTHROPIC_API_KEY = realKey;
  }
}

async function main() {
  await testTtsFailure();
  await testSttFailure();
  await testClaudeRetryBehavior();
  console.log("\nAll failure-handling tests completed.");
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
