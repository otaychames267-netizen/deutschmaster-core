/**
 * Google Cloud Speech-to-Text client — candidate STT, drop-in-compatible
 * with elevenLabsStt.ts's SttCallbacks/SttSession shape (same interface,
 * different vendor underneath), so muendlichVoiceSession.ts can swap
 * openRealtimeStt() for openGoogleStt() without touching any calling code.
 *
 * WHY this exists: with the real Teil-1 content volume (7,000-10,000
 * characters of dynamically-generated examiner speech per candidate — see
 * architectureComparison.mjs), ElevenLabs' STT credit rate (330
 * credits/min, drawn from the SAME 60,000-credit pool as TTS) becomes a
 * real structural blocker on its own, on top of the TTS volume problem.
 * Google Cloud Speech-to-Text is billed separately, in real USD
 * ($0.016/min, published rate — see costAccounting.ts), and does NOT touch
 * the ElevenLabs credit pool at all.
 *
 * Uses the long-stable v1 SpeechClient.streamingRecognize() gRPC stream —
 * NOT the newer v2 API Google now recommends for new users — deliberately:
 * v1's request/response shape has been unchanged and thoroughly documented
 * for years, which matters a lot when this code is being written WITHOUT
 * live credentials to verify it against (see this module's live-test file
 * for the exact BLOCKED status). Revisit the v2 API once real credentials
 * allow actual verification.
 *
 * Setup this needs (not yet available in this repo):
 *   - A GCP project with the Speech-to-Text API enabled.
 *   - A service account key, referenced via the standard
 *     GOOGLE_APPLICATION_CREDENTIALS env var (path to the JSON key file) —
 *     the @google-cloud/speech client picks this up automatically, no
 *     manual header/token code needed on our side.
 */
import { SpeechClient } from "@google-cloud/speech";
import type { SttCallbacks, SttSession } from "./elevenLabsStt.js";

let sharedClient: SpeechClient | null = null;
function getClient(): SpeechClient {
  if (!sharedClient) sharedClient = new SpeechClient();
  return sharedClient;
}

export function openGoogleStt(callbacks: SttCallbacks): Promise<SttSession> {
  return new Promise((resolve, reject) => {
    let client: SpeechClient;
    try {
      client = getClient();
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }

    const request = {
      config: {
        encoding: "LINEAR16" as const,
        sampleRateHertz: 16000,
        languageCode: "de-DE",
        model: "latest_long",
        useEnhanced: true,
      },
      interimResults: true,
    };

    let resolved = false;
    let recognizeStream: ReturnType<SpeechClient["streamingRecognize"]>;
    try {
      recognizeStream = client
        .streamingRecognize(request as Parameters<SpeechClient["streamingRecognize"]>[0])
        .on("error", (err: Error) => {
          callbacks.onError?.(err.message);
          if (!resolved) reject(err); // real auth/setup failures surface here, on the first actual RPC — the client constructor above doesn't validate credentials synchronously
        })
        .on("data", (data: any) => {
          const result = data.results?.[0];
          const transcript = result?.alternatives?.[0]?.transcript;
          if (!transcript) return;
          if (result.isFinal) callbacks.onCommitted?.(transcript, Date.now());
          else callbacks.onPartial?.(transcript);
        })
        .on("end", () => callbacks.onClose?.());
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }

    // Unlike a WebSocket, a gRPC duplex stream has no discrete "open" event
    // to wait for — it's writable immediately after streamingRecognize()
    // returns. Resolve right away; a genuine setup/auth failure still
    // arrives via the "error" listener above (guarded by `resolved` so it
    // doesn't double-reject/resolve).
    resolved = true;
    resolve({
      sendPcm16(base64: string) {
        if (!recognizeStream || (recognizeStream as any).destroyed) return;
        recognizeStream.write({ audioContent: Buffer.from(base64, "base64") });
      },
      close() {
        try { recognizeStream?.end(); } catch {}
      },
    });
  });
}
