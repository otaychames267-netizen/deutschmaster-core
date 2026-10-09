/**
 * Voice pools group profiles by character/role. Today there is exactly one
 * AI persona in the app (the Mündlich examiner), so exactly one pool exists
 * — but the shape supports adding more later (e.g. a distinct pool for a
 * future "conversation partner" character) without changing the
 * VoiceManager: pools are resolved by filtering VOICES on `enabled` and
 * pool membership, not hardcoded per-character lists.
 *
 * A voice with no `pools` field is treated as belonging to every pool it
 * hasn't been explicitly excluded from would be over-engineering right now
 * with only one pool — so the simpler rule is: no `pools` field = member of
 * the default "examiner" pool. Once a voice is explicitly tagged with
 * `pools: [...]`, only those pools apply.
 */
import { VOICES } from "./voices.config.js";
import type { VoiceProfile } from "./voiceProfiles.js";
import { isAzureVoice, azureConfigured } from "./azureTts.js";
import { isInworldVoice, inworldConfigured } from "./inworldTts.js";
import { isDeepInfraVoice, deepinfraConfigured } from "./deepinfraTts.js";

export const EXAMINER_POOL = "examiner";
/** 1:1 tutor only (owner 2026-10-09): 10 examiner voices and 10 partner voices, kept apart from the 2:1 exam room pool above so the exam room's voices and cached clips are untouched. */
export const TUTOR_EXAMINER_POOL = "tutor_examiner";
export const TUTOR_PARTNER_POOL = "tutor_partner";

export function getPool(poolId: string): VoiceProfile[] {
  return VOICES.filter((v) => v.enabled && (v.pools ? v.pools.includes(poolId) : poolId === EXAMINER_POOL));
}

export type TtsProvider = "elevenlabs" | "azure" | "inworld" | "deepinfra";

export function voiceProvider(v: { voiceId: string }): TtsProvider {
  return isAzureVoice(v.voiceId) ? "azure" : isInworldVoice(v.voiceId) ? "inworld" : isDeepInfraVoice(v.voiceId) ? "deepinfra" : "elevenlabs";
}

/** The provider named by an env switch (TUTOR_TTS_PROVIDER / EXAM_TTS_PROVIDER): inworld | azure | deepinfra (default: ElevenLabs). Without the provider's
 * key the switch is ignored (logged) so a missing secret can never leave a session without a voice. */
function providerFromEnv(envName: string): TtsProvider {
  const wanted = process.env[envName];
  if (wanted === "inworld") {
    if (inworldConfigured()) return "inworld";
    console.warn(`[voice] ${envName}=inworld but INWORLD_API_KEY is not set — using ElevenLabs`);
  } else if (wanted === "azure") {
    if (azureConfigured()) return "azure";
    console.warn(`[voice] ${envName}=azure but AZURE_SPEECH_KEY/AZURE_SPEECH_REGION are not set — using ElevenLabs`);
  } else if (wanted === "deepinfra") {
    if (deepinfraConfigured()) return "deepinfra";
    console.warn(`[voice] ${envName}=deepinfra but DEEPINFRA_API_KEY is not set — using ElevenLabs`);
  }
  return "elevenlabs";
}

/** Which TTS provider the 1:1 tutor speaks with (TUTOR_TTS_PROVIDER). */
export function tutorProvider(): TtsProvider {
  return providerFromEnv("TUTOR_TTS_PROVIDER");
}

/** Which TTS provider the 2:1 exam room speaks with (EXAM_TTS_PROVIDER, owner 2026-10-09). */
export function examProvider(): TtsProvider {
  return providerFromEnv("EXAM_TTS_PROVIDER");
}

function poolOfProvider(poolId: string, provider: TtsProvider): VoiceProfile[] {
  const all = getPool(poolId);
  const wanted = all.filter((v) => voiceProvider(v) === provider);
  return wanted.length > 0 ? wanted : all.filter((v) => voiceProvider(v) === "elevenlabs");
}

/** getPool() restricted to the tutor's provider (falls back to ElevenLabs if the pool has no voice of the wanted provider). */
export function getTutorPool(poolId: string): VoiceProfile[] {
  return poolOfProvider(poolId, tutorProvider());
}

/** getPool() restricted to the exam room's provider — same fallback. With the default provider this is exactly getPool(), i.e. the ElevenLabs voices
 * (the other providers' voices are tagged with the tutor pools only, until the owner picks the exam-room voices). */
export function getExamPool(poolId: string): VoiceProfile[] {
  return poolOfProvider(poolId, examProvider());
}
