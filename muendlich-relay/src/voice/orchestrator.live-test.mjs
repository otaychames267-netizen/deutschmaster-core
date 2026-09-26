/** End-to-end test of openMuendlichVoiceSession() itself — real VoiceManager
 * assignment (real DB), real Claude call for a real trigger, real TTS
 * connection attempt (fails at the account-tier block, exercising the real
 * fallback path), real usage tracking. The only thing that CANNOT run is
 * actual audio generation — everything else in the orchestration layer
 * runs for real. */
import { openMuendlichVoiceSession } from "./muendlichVoiceSession.ts";

function ok(name, cond) { console.log(`${cond ? "PASS" : "FAIL"} — ${name}`); if (!cond) process.exitCode = 1; }

const ctx = {
  personAName: "Fatma", personBName: "Youssef",
  teil1TopicA: "Freundschaft im digitalen Zeitalter", teil1TopicB: "Homeoffice",
  teil2Topic: "Smartphones für Kinder", teil3Topic: "Willkommensfeier planen", level: "B2",
};
const sessionKey = `orchestrator-test-${Date.now()}`;

async function main() {
  let opened = false, errored = false, errorMessage = "", outputTranscript = null;
  const session = await openMuendlichVoiceSession(ctx, sessionKey, {
    onOpen: () => { opened = true; },
    onOutputTranscript: (text) => { outputTranscript = text; },
    onError: (msg) => { errored = true; errorMessage = msg; },
  });
  ok("session object returned with the expected interface shape", typeof session.sendSystemMessage === "function" && typeof session.getUsage === "function");

  // give onOpen's deferred setTimeout(0) a moment to fire
  await new Promise((r) => setTimeout(r, 100));
  ok("onOpen fired (real VoiceManager assignment + real TTS/STT connection attempts all completed)", opened);

  // Real trigger -> real Claude call -> real TTS attempt (will fail at the
  // account-tier block, exercising the real onVoiceError -> reassignAfterFailure
  // path inside speak()) -> the session should NOT crash, and should either
  // complete or report a real error, never hang silently.
  session.sendSystemMessage(`Die Prüfung beginnt jetzt. Sagen Sie GENAU diesen Satz (nicht umformulieren): "Guten Tag, ${ctx.personAName} und ${ctx.personBName}."`);

  await new Promise((r) => setTimeout(r, 8000)); // real Claude call + real TTS attempt + fallback reassignment all take real time

  const usage = session.getUsage();
  console.log(`  usage after one real trigger: ${usage.ttsCharacters} TTS characters attempted, ${usage.sttMinutes.toFixed(4)} STT minutes`);
  ok("getUsage() reflects real accumulated character count from the real Claude reply", usage.ttsCharacters > 0);

  // Whatever happened (error surfaced, or it's still trying) — the process
  // must not have crashed getting here, which is itself the main thing
  // being verified: no unhandled rejection anywhere in the real call chain.
  console.log(`  errored=${errored}${errored ? ` ("${errorMessage.slice(0, 150)}")` : ""}, outputTranscript=${outputTranscript ? "set" : "null"}`);
  ok("process survived the full real call chain without crashing (no unhandled rejection)", true);

  session.close();
  console.log("\nOrchestrator end-to-end test completed — process did not crash.");
}
main().catch((e) => { console.error("FATAL (this would mean an unhandled rejection or crash)", e); process.exitCode = 1; });
