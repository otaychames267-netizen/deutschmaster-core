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
    pools: ["examiner","tutor_examiner"],
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
    pools: ["examiner","tutor_examiner"],
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
    pools: ["examiner","tutor_partner"],
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
  {
    voiceId: "ViKqgJNeCiWZlYgHiAOO",
    name: "Annika",
    gender: "female",
    ageRange: "middle_aged",
    language: "de",
    accent: "standard",
    description: "A calm, confident, and pleasant female German voice. Perfect for speaking German and English with a German accent. Annika's voice is ideally suited for precise and entertaining storytelling, voiceovers, children's book stories, audiobooks, tutorials, podcasts, advertising, and social media. It's also suitable for video dubbing, YouTube, and informative videos.",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "lzvBSKYbNWDD0a6BaJSK",
    name: "Petra",
    gender: "female",
    ageRange: "middle_aged",
    language: "de",
    accent: "standard",
    description: "Petra is well educated and graduated. Her elaborative spelling is perfectly native german for all matters. Perfectly well for Audiobooks and E-Learning.",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "K75lPKuh15SyVhQC1LrE",
    name: "Carola",
    gender: "female",
    ageRange: "middle_aged",
    personality: ["calm"],
    language: "de",
    accent: "standard",
    description: "A middle aged German pleasant female voice with dynamics and warmth. Works well for Educational content.",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "zKHQdbB8oaQ7roNTiDTK",
    name: "Laura",
    gender: "female",
    ageRange: "middle_aged",
    personality: ["professional"],
    language: "de",
    accent: "standard",
    description: "Virtual Assistant for your hotline, or natural conversation. Warm, professional, and friendly. Studio-quality recording.",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "rKiu7lQ4c5P3az3745s3",
    name: "Carla Blum",
    gender: "female",
    ageRange: "middle_aged",
    personality: ["confident"],
    language: "de",
    accent: "standard",
    description: "A warm, confident and pleasant female voice with calm depth for professional explanatory and educational content. Carla’s voice conveys trust, intelligence and competence - perfect for projects that require both authority and ease in explaining complex topics. The tonality is neutral, friendly and engaging - ideal for e-learnings, explainer videos, chatbots, call-center automation, AI voice agents, virtual assistants, customer support and non-fictional audiobooks. Native German / Deutsch",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "IWm8DnJ4NGjFI7QAM5lM",
    name: "Stephan",
    gender: "male",
    ageRange: "middle_aged",
    personality: ["serious"],
    language: "de",
    accent: "standard",
    description: "Standard German male speaker, ideal for infotainment. Serious and expressive.",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "r8MyP4qUsq5WFFSkPdfV",
    name: "Johannes",
    gender: "male",
    ageRange: "middle_aged",
    language: "de",
    accent: "standard",
    description: "Middle-aged German male voice, Clear pronunciation, neutral intonation. Perfect for Narrations.",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "ABvMrd8urrMUl3V6UZ3Y",
    name: "Vincent",
    gender: "male",
    ageRange: "middle_aged",
    personality: ["professional"],
    language: "de",
    accent: "standard",
    description: "Warm, masculine voice with a clear and authoritative tone, perfect for factual narration. Delivers content with precision and confidence, maintaining a natural flow in standard German accent. Ideal for documentaries, instructional videos, and informative content that requires a trustworthy and engaging voice.",
    pools: ["tutor_examiner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "v3V1d2rk6528UrLKRuy8",
    name: "Susi",
    gender: "female",
    ageRange: "middle_aged",
    personality: ["calm"],
    language: "de",
    accent: "standard",
    description: "Imagine the voice of the telemarketing assistant as soothing and melodic, with a clear, crisp tone that conveys both warmth and professionalism. Her speech is rhythmic and confident, effortlessly modulating to match the mood of the conversation. She possesses a subtle accent that adds a unique charm to her interactions, making her sound approachable and friendly. Her laughter is light and genuine, breaking into her speech naturally when the conversation allows.",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "7eVMgwCnXydb3CikjV7a",
    name: "Lea",
    gender: "female",
    ageRange: "middle_aged",
    personality: ["calm"],
    language: "de",
    accent: "standard",
    description: "A clear and attractive mature female German voice. Perfect for German language, but great for English with a German accent too. Her entrancing and sexy voice is ideal for accurate German narration or voiceovers of audiobooks, advertising, gaming and social media. \n",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "AnvlJBAqSLDzEevYr9Ap",
    name: "Ava",
    gender: "female",
    ageRange: "young",
    language: "de",
    accent: "standard",
    description: "A youthful and well-spoken female German voice. Perfect for German language, but great for English with a German accent too. \r\nHer neutral accent is easily understandable and perfect for accurate German narration or voiceovers of audiobooks, advertising, gaming and social media. \r\nEine jugendliche, frische und wortgewandte weibliche deutsche Stimme. Die Studioqualität garantiert, dass sie mit ihrer klaren und fesselnden Stimme ihre Audio-Projekte bereichern wird. ",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "KXxZd16DiBqt82nbarJx",
    name: "Lucy Fennek",
    gender: "female",
    ageRange: "young",
    personality: ["confident"],
    language: "de",
    accent: "standard",
    description: "Professional Youthful German Conversational Voice: Lucy is your charming, confident conversation partner with the perfect balance of wit and wisdom. Her warm, youthful voice transforms evey conversation into entertaining adventures and complex questions into clear answers. Sometimes playful and teasing, sometimes profound and empathetic – Lucy effortlessly adapts to any conversation topic. Ideal for creative projects, personal assistance, customer interactions, and podcasts. ",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "NE7AIW5DoJ7lUosXV2KR",
    name: "Ela",
    gender: "female",
    ageRange: "young",
    language: "de",
    accent: "standard",
    description: "This is the optimized version of a young German female voice – perfect for playful, sentimental social media content – shorts, reels, or storytelling with emotional depth and charm. She sounds curious and slightly naive, with a light, natural flow. Her tone brings warmth and softness to content that craves authenticity without losing its sparkle. Whether dreamy, gentle, or sincere, Ela makes it feel like someone’s really talking to you.\nAudio quality and speaking flow were both enhanced.",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "FTNCalFNG5bRnkkaP5Ug",
    name: "Otto",
    gender: "male",
    ageRange: "middle_aged",
    personality: ["calm"],
    language: "de",
    accent: "standard",
    description: "A calm male German studio-quality voice. Perfect for German language and English with a German accent. Otto's clear, easy-to-understand narration is excellent for German voiceovers, audiobooks and podcasts, accurate video dubbing, advertising, and social media such as Reels, Stories, and YouTube. ",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "aTTiK3YzK3dXETpuDE2h",
    name: "Ben",
    gender: "male",
    ageRange: "young",
    personality: ["confident"],
    language: "de",
    accent: "standard",
    description: "A young male German voice that can effortlessly switch from an animated, upbeat tone while describing a thrilling adventure, to a warm, reassuring voice for a heartfelt moment. The speech is always clear and engaging, whether performing a high-energy commercial, an emotional narrative, or a character in an animated series.",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "fzqS9sNPYJhLlhsfDm0l",
    name: "Mark",
    gender: "male",
    ageRange: "middle_aged",
    language: "de",
    accent: "standard",
    description: "The \"Voice Agent\" voice is a professional AI voice model originally voiced by Christian Plasa. Designed for AI voice agents, call-center automation, and virtual assistants, this voice delivers natural, human-like speech with a clear, engaging tone. Its balanced and conversational delivery makes it ideal for customer support, chatbot applications, and interactive AI. Optimized for Natural Speak and Conversational AI, this voice ensures clarity, warmth, and responsiveness in real-time interactions.",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "gGjaVIGkCSfKUIBYtNT2",
    name: "Marc",
    gender: "male",
    ageRange: "middle_aged",
    personality: ["confident"],
    language: "de",
    accent: "standard",
    description: "A highly pleasant middle-aged male German voice that you can listen to for hours. Perfect for non-fiction books and guides.",
    pools: ["tutor_partner"], // 1:1 tutor only
    enabled: true,
  },
  {
    voiceId: "de-DE-Seraphina:DragonHDLatestNeural",
    name: "Seraphina (Azure HD)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Azure Speech DragonHD, German (GA): high-definition female voice, < 300 ms latency.",
    pools: ["tutor_examiner"], // Azure AI Speech — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=azure
    enabled: true,
  },
  {
    voiceId: "de-DE-Florian:DragonHDLatestNeural",
    name: "Florian (Azure HD)",
    gender: "male",
    language: "de",
    accent: "standard",
    description: "Azure Speech DragonHD, German (GA): high-definition male voice, < 300 ms latency.",
    pools: ["tutor_examiner"], // Azure AI Speech — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=azure
    enabled: true,
  },
  {
    voiceId: "de-DE-KatjaNeural",
    name: "Katja (Azure)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Azure Speech neural German female voice.",
    pools: ["tutor_partner"], // Azure AI Speech — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=azure
    enabled: true,
  },
  {
    voiceId: "de-DE-ConradNeural",
    name: "Conrad (Azure)",
    gender: "male",
    language: "de",
    accent: "standard",
    description: "Azure Speech neural German male voice.",
    pools: ["tutor_partner"], // Azure AI Speech — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=azure
    enabled: true,
  },
  {
    voiceId: "de-DE-AmalaNeural",
    name: "Amala (Azure)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Azure Speech neural German female voice.",
    pools: ["tutor_partner"], // Azure AI Speech — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=azure
    enabled: true,
  },
  {
    voiceId: "de-DE-KillianNeural",
    name: "Killian (Azure)",
    gender: "male",
    language: "de",
    accent: "standard",
    description: "Azure Speech neural German male voice.",
    pools: ["tutor_partner"], // Azure AI Speech — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=azure
    enabled: true,
  },
// ---- Inworld (owner 2026-10-09; Reinhard, Kilian, Josef, Hendrik and Johanna are deliberately NOT used — owner: never) ----
  {
    voiceId: "inworld:Annika",
    name: "Annika (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Annika (female).",
    pools: ["tutor_examiner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Birgit",
    name: "Birgit (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Birgit (female).",
    pools: ["tutor_examiner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Sabine",
    name: "Sabine (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Sabine (female).",
    pools: ["tutor_examiner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Heike",
    name: "Heike (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Heike (female).",
    pools: ["tutor_examiner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Matthias",
    name: "Matthias (Inworld)",
    gender: "male",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Matthias (male).",
    pools: ["tutor_examiner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Bastian",
    name: "Bastian (Inworld)",
    gender: "male",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Bastian (male).",
    pools: ["tutor_examiner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Steffi",
    name: "Steffi (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Steffi (female).",
    pools: ["tutor_partner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Franziska",
    name: "Franziska (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Franziska (female).",
    pools: ["tutor_partner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Carina",
    name: "Carina (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Carina (female).",
    pools: ["tutor_partner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Heidi",
    name: "Heidi (Inworld)",
    gender: "female",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Heidi (female).",
    pools: ["tutor_partner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Fabian",
    name: "Fabian (Inworld)",
    gender: "male",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Fabian (male).",
    pools: ["tutor_partner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
  {
    voiceId: "inworld:Tobias",
    name: "Tobias (Inworld)",
    gender: "male",
    language: "de",
    accent: "standard",
    description: "Inworld TTS German voice Tobias (male).",
    pools: ["tutor_partner"], // Inworld — 1:1 tutor only, used when TUTOR_TTS_PROVIDER=inworld
    enabled: true,
  },
// ---- DeepInfra / Qwen3-TTS (owner 2026-10-09): the 10 examiner voices the owner picked. Each was designed with Qwen3-TTS VoiceDesign, then its sample
// ---- was uploaded to DeepInfra (POST /v1/voices/add) so the voice_id gives the SAME timbre in every sentence. Used when EXAM_TTS_PROVIDER / TUTOR_TTS_PROVIDER=deepinfra.
  { voiceId: "deepinfra:21cphao8nfi9jkina0g0", name: "Nadine (Qwen)", gender: "female", ageRange: "adult", language: "de", accent: "standard", description: "Qwen3-TTS designed voice F1: German woman, mid 30s, calm and matter-of-fact (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:6csqo021hukqfyem0exr", name: "Claudia (Qwen)", gender: "female", ageRange: "middle_aged", language: "de", accent: "standard", description: "Qwen3-TTS designed voice F2: German woman, early 40s, warm and patient, slightly lower voice (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:as1hx8e63gm9mk0h08aa", name: "Ursula (Qwen)", gender: "female", ageRange: "middle_aged", language: "de", accent: "standard", description: "Qwen3-TTS designed voice F3: German woman, mid 50s, self-assured, slow and clear (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:hntl2a6umkbbhg1cwjcr", name: "Jana (Qwen)", gender: "female", ageRange: "young", language: "de", accent: "standard", description: "Qwen3-TTS designed voice F4: German woman, mid 20s, friendly and lively (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:tnco184vh6dfine5wbfq", name: "Petra (Qwen)", gender: "female", ageRange: "adult", language: "de", accent: "standard", description: "Qwen3-TTS designed voice F5: German woman, late 30s, neutral and matter-of-fact (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:w5ansswgujjbb7qv07tz", name: "Thomas (Qwen)", gender: "male", ageRange: "middle_aged", language: "de", accent: "standard", description: "Qwen3-TTS designed voice M1: German man, mid 40s, calm and friendly-matter-of-fact (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:9ky4fb0el43530xjj8ye", name: "Markus (Qwen)", gender: "male", ageRange: "adult", language: "de", accent: "standard", description: "Qwen3-TTS designed voice M2: German man, early 30s, friendly and professional (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:xffx6y0nb3j2lzzes0ka", name: "Wolfgang (Qwen)", gender: "male", ageRange: "mature", language: "de", accent: "standard", description: "Qwen3-TTS designed voice M3: German man, mid 50s, deep calm self-assured voice (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:ckw25f4melehz8k08l1s", name: "Felix (Qwen)", gender: "male", ageRange: "young", language: "de", accent: "standard", description: "Qwen3-TTS designed voice M4: German man, late 20s, natural and relaxed but clear (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
  { voiceId: "deepinfra:rheg7ma615vee6mfzn3v", name: "Stefan (Qwen)", gender: "male", ageRange: "middle_aged", language: "de", accent: "standard", description: "Qwen3-TTS designed voice M5: German man, late 40s, warm and matter-of-fact, patient (examiner).", pools: ["examiner", "tutor_examiner"], enabled: true },
// ---- DeepInfra / Qwen3-TTS: the 10 PARTNER voices the owner picked (all of the 10 candidates PF1-PF5 / PM1-PM5; casual, peer-like). 1:1 tutor partner pool only. ----
  { voiceId: "deepinfra:svlnehq8huu9jshp2t2i", name: "Lara (Qwen)", gender: "female", ageRange: "young", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PF1: German woman, early 20s, lively and curious, natural pace (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:s3qzkzydhp8y3i98htdu", name: "Sophie (Qwen)", gender: "female", ageRange: "young", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PF2: German woman, late 20s, friendly and relaxed (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:33wxujw3vgfpew1hvcto", name: "Marie (Qwen)", gender: "female", ageRange: "adult", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PF3: German woman, early 30s, open and energetic, clearly articulated (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:41vycvwmum24v5sib932", name: "Anja (Qwen)", gender: "female", ageRange: "adult", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PF4: German woman, mid 30s, calm and thoughtful (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:xre4sg7irrcweodfrtqq", name: "Silke (Qwen)", gender: "female", ageRange: "middle_aged", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PF5: German woman, mid 40s, warm and relaxed, slower pace (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:jtouurqgr7ze09qrh5fq", name: "Jonas (Qwen)", gender: "male", ageRange: "young", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PM1: German man, early 20s, casual and enthusiastic (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:spgick8i0cclmwonohad", name: "Lukas (Qwen)", gender: "male", ageRange: "young", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PM2: German man, late 20s, friendly and balanced (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:y5dyqx22470x8pux2bd6", name: "Tim (Qwen)", gender: "male", ageRange: "adult", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PM3: German man, early 30s, open and buddy-like (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:57dhgqoamxg5otsgof2i", name: "Jan (Qwen)", gender: "male", ageRange: "adult", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PM4: German man, mid 30s, calm, thoughtful, matter-of-fact-friendly (partner).", pools: ["tutor_partner"], enabled: true },
  { voiceId: "deepinfra:9oidex31hmws7s0ghu5c", name: "Michael (Qwen)", gender: "male", ageRange: "middle_aged", language: "de", accent: "standard", description: "Qwen3-TTS designed voice PM5: German man, mid 40s, easy-going and down-to-earth, slower pace (partner).", pools: ["tutor_partner"], enabled: true },
];
