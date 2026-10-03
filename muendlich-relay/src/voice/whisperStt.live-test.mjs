/** Live test of the self-hosted Whisper STT client — BLOCKED, same
 * discipline as every other live test in this module: run it, report the
 * REAL result, don't fake success. There is no whisper-server instance
 * running anywhere reachable from this session (no WHISPER_STT_URL set),
 * so this is expected to fail cleanly — confirming the failure mode is
 * diagnosable, not a hang or a silent no-op. */
import { openWhisperStt } from "./whisperStt.ts";

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  if (!process.env.WHISPER_STT_URL) {
    console.log("WHISPER_STT_URL not set — testing the expected-rejection path.");
    try {
      await openWhisperStt({});
      ok("UNEXPECTED: resolved without WHISPER_STT_URL", false);
    } catch (e) {
      ok("openWhisperStt() rejects cleanly with a diagnosable message when unconfigured", /WHISPER_STT_URL/.test(String(e)));
    }
    console.log("\nTo actually exercise this against a real server: deploy whisper-server/");
    console.log("(see its README), set WHISPER_STT_URL=http://<host>:8000, and re-run this test.");
    return;
  }

  console.log(`WHISPER_STT_URL is set (${process.env.WHISPER_STT_URL}) — attempting a real connection.`);
  let committed = null, errored = null;
  const session = await openWhisperStt({
    onCommitted: (text) => { committed = text; },
    onError: (msg) => { errored = msg; },
  });
  ok("openWhisperStt() resolves", !!session);

  // Send a short burst of silence (won't produce real speech, but exercises
  // the real HTTP round-trip to a real server) followed by a gap long
  // enough to trigger the flush-on-pause debounce.
  const silentFrame = Buffer.alloc(3200).toString("base64"); // ~0.1s of PCM16 zeros
  for (let i = 0; i < 10; i++) session.sendPcm16(silentFrame);
  await new Promise((r) => setTimeout(r, 1000));

  console.log(`  committed="${committed}" errored="${errored}"`);
  ok("real round-trip completed without hanging (either got a transcript or a real error, not silence forever)", committed !== null || errored !== null);
  session.close();
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
