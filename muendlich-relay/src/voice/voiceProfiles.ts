/**
 * VoiceProfile — the shared shape every voice in the system is described by.
 * Deliberately does NOT store voice IDs as anonymous strings; every voice is
 * a first-class profile the rest of the system (pools, VoiceManager,
 * fallback logic) reasons about.
 *
 * As of 2026-08-26, every field for every configured voice is real,
 * verified data pulled live from ElevenLabs' own API (a new API key was
 * created with full permissions via the dashboard — see voices.config.ts's
 * header for how the original 27-voice list turned out to be wrong, and
 * what the real 5-voice pool is). No field here is guessed.
 */

export type VoiceGender = "male" | "female" | "neutral";
export type VoiceEnergy = "calm" | "moderate" | "energetic";
export type VoicePersonality =
  | "calm" | "friendly" | "professional" | "warm" | "energetic" | "serious"
  | "playful" | "mature" | "young" | "confident" | "empathetic" | "dramatic";

export interface VoiceProfile {
  voiceId: string;
  /** Human-readable label for logs/admin UI. Falls back to voiceId if unset. */
  name?: string;
  gender?: VoiceGender;
  ageRange?: string;
  /** One or more traits from VoicePersonality — only set when independently
   * verifiable (from ElevenLabs' own voice labels), never guessed. */
  personality?: VoicePersonality[];
  style?: string;
  energy?: VoiceEnergy;
  /** BCP-47ish language code, e.g. "de", "en". */
  language?: string;
  accent?: string;
  description?: string;
  /** Which character/role pools this voice belongs to — see voicePools.ts.
   * Defaults to ["examiner"] if omitted, since that's the only role that
   * exists in the app today. */
  pools?: string[];
  enabled: boolean;
}
