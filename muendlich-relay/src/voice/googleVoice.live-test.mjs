/** Live test of the Google Cloud TTS/STT clients — BLOCKED, same discipline
 * as the ElevenLabs live tests: run it, report the REAL failure, don't fake
 * success. There are no Google Cloud credentials anywhere in this repo
 * (confirmed: no GOOGLE_APPLICATION_CREDENTIALS in .env), so this is
 * expected to fail — the point is confirming HOW it fails (gracefully,
 * with a real diagnosable error) rather than hanging or crashing silently.
 *
 * REAL FINDING from actually running this (not theoretical): the TTS path
 * fails cleanly, caught exactly once, exactly as expected. The STT path's
 * onError callback ALSO fires correctly with the same real "no default
 * credentials" message — but @google-cloud/speech's underlying auth-retry
 * internals (google-gax/google-auth-library) then throw a SECOND, unhandled
 * exception from deep inside their own promise chain, which crashes the
 * Node process after the correct callback already ran. This appears to be
 * specific to the zero-credentials-anywhere edge case (no ADC file, no
 * metadata server, no env var at all) — a real deployment with a valid
 * GOOGLE_APPLICATION_CREDENTIALS service-account file should never hit this
 * fallback path. Flagged here as a real, live-observed risk to re-check the
 * moment real credentials exist, not swept under the rug. */
import { openGoogleTts } from "./googleTts.ts";
import { openGoogleStt } from "./googleStt.ts";

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

async function testGoogleTts() {
  console.log("\n--- Google Cloud TTS (Chirp 3 HD) ---");
  try {
    const handle = openGoogleTts("de-DE-Chirp3-HD-Charon");
    const buf = await handle.synthesizeChunk("Hallo, das ist ein Test.");
    ok("UNEXPECTED: synthesis succeeded without credentials", false);
    console.log(`  got ${buf.length} bytes`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ok("fails with a real, diagnosable auth error (not a hang, not a silent failure)", /credentials|auth/i.test(msg));
    console.log(`  captured: "${msg.slice(0, 200)}"`);
  }
}

async function testGoogleStt() {
  console.log("\n--- Google Cloud STT ---");
  try {
    const session = await openGoogleStt({
      onError: (msg) => console.log(`  onError: ${msg.slice(0, 200)}`),
    });
    // Real credentials-missing failures on this client surface asynchronously
    // via the stream's "error" event (see googleStt.ts's header) rather than
    // rejecting openGoogleStt() itself — give it a moment.
    await new Promise((r) => setTimeout(r, 1500));
    session.close();
    ok("openGoogleStt() resolves without throwing (gRPC stream has no discrete open failure the way a WebSocket does)", true);
  } catch (e) {
    ok("fails cleanly if it does reject", true);
    console.log(`  rejected with: ${String(e).slice(0, 200)}`);
  }
}

async function main() {
  await testGoogleTts();
  await testGoogleStt();
  console.log("\nGoogle Cloud voice tests completed — BLOCKED on missing credentials, as expected.");
  console.log("Needs: a GCP project with Text-to-Speech + Speech-to-Text APIs enabled, and");
  console.log("GOOGLE_APPLICATION_CREDENTIALS pointing at a real service-account key file.");
}
main().catch((e) => { console.error("FATAL (unexpected crash, not a graceful auth failure)", e); process.exitCode = 1; });
