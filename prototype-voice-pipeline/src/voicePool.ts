/**
 * German (de-DE) Cartesia examiner-voice pool.
 *
 * Sourced by actually calling Cartesia's /voices API with the account's real
 * CARTESIA_API_KEY and filtering for language==="de" — NOT guessed or
 * hand-typed. Of 12 voice IDs originally supplied, 8 were confirmed present
 * in the account's library with language==="de"; the other 4 were not found
 * at all and are deliberately excluded. Re-run `npm run discover-voices` if
 * the account's voice library changes, and replace this list from its
 * output rather than hand-editing IDs.
 */
export interface CartesiaVoice {
  id: string;
  name: string;
  gender: "masculine" | "feminine";
}

export const GERMAN_VOICE_POOL: CartesiaVoice[] = [
  { id: "57a3a9e0-a91c-4c94-a2bb-e6cbab3ae649", name: "Clemens - Precise Instructor", gender: "masculine" },
  { id: "b7187e84-fe22-4344-ba4a-bc013fcb533e", name: "Sebastian - Orator", gender: "masculine" },
  { id: "38aabb6a-f52b-4fb0-a3d1-988518f4dc06", name: "Alina - Engaging Assistant", gender: "feminine" },
  { id: "b9de4a89-2257-424b-94c2-db18ba68c81a", name: "Viktoria - Phone Conversationalist", gender: "feminine" },
  { id: "4ad22058-7cb6-402c-a115-196cbfc25dce", name: "Moritz - Modern Communicator", gender: "masculine" },
  { id: "d1cbea67-e4d3-47cd-be2a-2bd4e646b002", name: "Henrik - Steady Analyst", gender: "masculine" },
  { id: "9b4d08b6-0494-4301-ab92-9150f4ee2718", name: "Marlene - Elegant Speaker", gender: "feminine" },
  { id: "40e0f496-a220-46bb-975a-7ef465b3d92b", name: "Vreni - Diligent Advisor", gender: "feminine" },
];

/** Called ONCE per exam session (here: once per harness run, which stands
 * in for one session) — never per individual examiner turn. The caller must
 * hold onto and reuse the returned voice for every synthesize() call in
 * that same session. */
export function pickSessionVoice(): CartesiaVoice {
  return GERMAN_VOICE_POOL[Math.floor(Math.random() * GERMAN_VOICE_POOL.length)];
}
