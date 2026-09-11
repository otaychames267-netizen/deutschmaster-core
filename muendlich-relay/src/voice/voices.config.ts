/**
 * The configured ElevenLabs voice pool for the Mündlich AI examiner.
 * Deliberately just data — no logic lives here (see voiceManager.ts) — so
 * adding, disabling, or re-categorizing a voice never requires touching the
 * assignment algorithm.
 *
 * REBUILT from a real, logged-in account inspection (2026-08-26) — the
 * previous 27 voice IDs here were WRONG: live-checked all 27 against
 * ElevenLabs' own API with a properly-permissioned key and only 3 resolved
 * to a real voice; the other 24 returned "voice_not_found" (HTTP 400), a
 * genuine non-existence, not a permissions artifact. A full account voice
 * listing (`GET /v1/voices`) found the REAL total: 26 voices exist on this
 * account — 21 English "premade" defaults (ElevenLabs' own dashboard flags
 * these as being deprecated by end of year — excluded here, wrong language
 * anyway) and exactly 5 real German-native professional voices, all 5
 * included below. Every field is copied verbatim from the real API
 * response (name, description, labels) — nothing here is guessed.
 *
 * Real, honest limitation this creates: the "voice diversity" system
 * (voiceManager.ts) was designed and tested assuming a 27-voice pool. With
 * only 5 real German voices actually available (4 female, 1 male), the
 * diversity story is real but much smaller — worth deciding whether to
 * clone/add more voices before launch. Do not reintroduce the old 24 fake
 * IDs to "fix" this — they don't exist.
 */
import type { VoiceProfile } from "./voiceProfiles.js";

export const VOICES: VoiceProfile[] = [
  {
    voiceId: "uvysWDLbKpA4XvpD3GI6",
    name: "Leonie",
    gender: "female",
    ageRange: "middle_aged",
    personality: ["calm", "confident", "professional"],
    energy: "calm",
    language: "de",
    accent: "standard",
    description: "A captivating female German studio-quality voice with a pleasant German accent — clear, engaging narration with a calm and confident feminine tone.",
    enabled: true,
  },
  {
    voiceId: "KDqku3FJfbImX6HKQdWA",
    name: "Daniel",
    gender: "male",
    ageRange: "middle_aged",
    personality: ["warm", "calm", "friendly", "empathetic"],
    energy: "calm",
    language: "de",
    accent: "standard",
    description: "Warm, trustworthy and calm German male voice with a natural storytelling tone — friendly and empathetic, relaxed and clear delivery.",
    enabled: true,
  },
  {
    voiceId: "it8IUwkHD8mtjbyJyCuC",
    name: "Lena",
    gender: "female",
    ageRange: "young",
    personality: ["warm", "calm", "friendly"],
    energy: "calm",
    language: "de",
    accent: "standard",
    description: "Young German female voice (around 23), gentle, warm, and feminine, with a natural, calm, and pleasant quality — moderate pace, relaxed and friendly delivery.",
    enabled: true,
  },
  {
    voiceId: "dCnu06FiOZma2KVNUoPZ",
    name: "Mila Winter",
    gender: "female",
    ageRange: "young",
    personality: ["confident", "empathetic"],
    energy: "moderate",
    language: "de",
    accent: "standard",
    description: "Opinionated and confident, yet soft and empathetic native German voice, with a relaxed creak at times — expressive and assured narration.",
    enabled: true,
  },
  {
    voiceId: "NVSsZwbSE09CUqFt7WmS",
    name: "Kerstin",
    gender: "female",
    ageRange: "middle_aged",
    personality: ["friendly", "energetic"],
    energy: "energetic",
    language: "de",
    accent: "standard",
    description: "Nice, lively German female voice — direct and engaging delivery.",
    enabled: true,
  },
];
