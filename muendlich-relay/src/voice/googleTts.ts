/**
 * Google Cloud Text-to-Speech (Chirp 3 HD) client — chunked synthesis,
 * called once per sentence-sized chunk as Claude's reply streams in, the
 * same "start speaking before the whole reply is ready" effect the
 * ElevenLabs WebSocket path gets from a persistent streaming connection,
 * achieved here via repeated short calls to the standard synthesizeSpeech
 * RPC instead of Chirp 3 HD's newer, less-thoroughly-documented
 * StreamingSynthesize surface.
 *
 * Deliberate choice, explained: synthesizeSpeech's request/response shape
 * has been stable and extensively documented for years; the dedicated
 * low-latency streaming synthesis surface is newer and materially higher-
 * risk to implement correctly from documentation alone, with zero live
 * credentials available to verify against. If per-chunk call overhead
 * turns out to be a real latency problem once this can actually be tested,
 * migrating to true streaming synthesis is the natural next step — not
 * done preemptively here.
 *
 * WHY this exists: at the real Teil-1 content volume (7,000-10,000 chars
 * of dynamically-generated examiner speech per candidate), ElevenLabs'
 * per-character credit rate (0.5 credits/char, the given business rule)
 * cannot support the target of 50-60 exams/month within a 60,000-credit
 * allowance — see architectureComparison.mjs. Chirp 3 HD is Google's
 * newest generative TTS tier: documented as adding "human disfluencies,
 * emotional range, and more accurate intonation," explicitly positioned
 * for real-time conversational agents, at $0.03/1000 characters — 40%
 * cheaper than ElevenLabs Flash v2.5's $0.05, and NOT billed against the
 * ElevenLabs credit pool at all since it's a different vendor.
 *
 * Setup this needs (not yet available in this repo):
 *   - A GCP project with the Text-to-Speech API enabled, Chirp 3 HD voices
 *     available for the project's region.
 *   - GOOGLE_APPLICATION_CREDENTIALS (same service account as googleStt.ts
 *     can share one, with both APIs enabled on it).
 *   - A real, verified list of German (de-DE) Chirp 3 HD voice names to
 *     replace the 27 ElevenLabs voice IDs in voices.config.ts — only one
 *     ("de-DE-Chirp3-HD-Charon") was confirmed via documentation search
 *     this session; the full roster needs either real credentials (to call
 *     ListVoices) or manual cross-referencing against Google's own
 *     supported-voices page. Do NOT invent additional names.
 */
import textToSpeech from "@google-cloud/text-to-speech";

let sharedClient: InstanceType<typeof textToSpeech.TextToSpeechClient> | null = null;
function getClient() {
  if (!sharedClient) sharedClient = new textToSpeech.TextToSpeechClient();
  return sharedClient;
}

export interface GoogleTtsHandle {
  /** Synthesizes ONE sentence-sized chunk of text, returns raw PCM16 mono
   * @ 24kHz — the same wire format the client already expects (server.ts's
   * protocol: "audio, data: <base64 pcm16 24kHz>"), so no transcoding is
   * needed anywhere else in the pipeline. */
  synthesizeChunk(text: string): Promise<Buffer>;
}

export function openGoogleTts(voiceName: string): GoogleTtsHandle {
  const client = getClient();
  return {
    async synthesizeChunk(text: string): Promise<Buffer> {
      const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: { languageCode: "de-DE", name: voiceName },
        audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000 },
      });
      if (!response.audioContent) throw new Error("Google TTS returned no audio content");
      return Buffer.from(response.audioContent as Uint8Array);
    },
  };
}

/** One-shot helper for offline library generation (phraseLibrary/generateLibrary.ts's
 * Google equivalent, once that migration happens) — same shape as
 * elevenLabsTts.ts's synthesizeOnce, for a drop-in swap. */
export async function synthesizeOnceGoogle(voiceName: string, text: string): Promise<Buffer> {
  return openGoogleTts(voiceName).synthesizeChunk(text);
}
